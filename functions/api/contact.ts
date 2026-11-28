/**
 * POST /api/contact — the only runtime code on this site.
 *
 * worker/index.ts routes POST /api/contact here and nothing else (ADR-001),
 * so the site itself stays fully static.
 *
 * Order of checks is cheapest-rejection-first:
 *   1. honeypot            — no network calls, no email
 *   2. schema validation   — no network calls
 *   3. rate-limit check    — one KV read
 *   4. Turnstile verify    — one outbound request
 *   5. rate-limit record   — one KV read + one KV write (verified requests only)
 *   6. send                — one outbound request
 *
 * Nothing is persisted. The submission exists in the destination inbox and
 * nowhere else. The only thing stored is a counter keyed by a hash of the IP.
 */

import { z } from 'zod';

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  PUBLIC_DEPLOYMENT_ENV?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  CONTACT_TO_EMAIL?: string;
  PARTNER_TO_EMAIL?: string;
  RATE_LIMIT_KV?: KVNamespaceLike;
  RATE_LIMIT_WAF_ENABLED?: string;
  SITE_URL?: string;
}

const TURNSTILE_ACTION = 'contact';

function productionSite(env: Env): URL | null {
  try {
    const url = new URL(env.SITE_URL ?? '');
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function productionConfigured(env: Env): boolean {
  if (env.PUBLIC_DEPLOYMENT_ENV !== 'production') return true;
  if (
    (!env.RATE_LIMIT_KV && env.RATE_LIMIT_WAF_ENABLED !== 'true') ||
    !env.RESEND_API_KEY?.startsWith('re_') ||
    !env.TURNSTILE_SECRET_KEY?.startsWith('0x') ||
    !productionSite(env)
  )
    return false;
  for (const value of [env.MAIL_FROM, env.CONTACT_TO_EMAIL, env.PARTNER_TO_EMAIL]) {
    if (!value || /[\r\n]/.test(value)) return false;
    const mailbox = /<([^<>]+)>$/.exec(value)?.[1] ?? value;
    if (!z.email().safeParse(mailbox).success || /@example\.(com|org|net)$/i.test(mailbox))
      return false;
  }
  return true;
}

interface FunctionContext {
  request: Request;
  env: Env;
  clientIp?: string;
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 600;

/**
 * Hard cap on the request body, checked before the JSON is parsed.
 * The schema caps individual fields, but that only applies *after* parsing —
 * without this, an attacker could make the Worker parse an arbitrarily large
 * document just to have it rejected.
 */
const MAX_BODY_BYTES = 32 * 1024;
const BODY_TIMEOUT_MS = 5000;
const SERVICE_TIMEOUT_MS = 8000;
const KV_TIMEOUT_MS = 1000;

async function bounded<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('request_timeout')), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

class BodyReadError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

async function readBody(request: Request): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const buffer = new Uint8Array(MAX_BODY_BYTES);
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new BodyReadError(408, 'request_timeout')), BODY_TIMEOUT_MS);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      if (size + value.byteLength > MAX_BODY_BYTES) {
        throw new BodyReadError(413, 'payload_too_large');
      }
      buffer.set(value, size);
      size += value.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size));
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

const schema = z
  .object({
    formType: z.enum(['general', 'partner', 'volunteer', 'media']).default('general'),
    name: z.string().trim().min(2).max(120),
    /** Required only when the visitor picks email as the way to reach them. */
    email: z
      .string()
      .trim()
      .max(200)
      .optional()
      .default('')
      .refine((value) => value === '' || z.email().safeParse(value).success, { error: 'email' }),
    /**
     * Required only when the visitor picks phone, so the shape check only runs
     * once something was typed. 7-15
     * digits is the E.164 range; the punctuation people type is allowed around
     * them and stripped before counting.
     */
    phone: z
      .string()
      .trim()
      .max(32)
      .optional()
      .default('')
      .refine(
        (value) => {
          if (value === '') return true;
          if (!/^\+?[\d\s().-]+$/.test(value)) return false;
          const digits = value.replace(/\D/g, '').length;
          return digits >= 7 && digits <= 15;
        },
        { error: 'phone' },
      ),
    organization: optionalText(160),
    country: optionalText(80),
    role: optionalText(120),
    helpWith: optionalText(60),
    volunteerType: optionalText(40),
    availability: optionalText(200),
    languages: optionalText(120),
    outlet: optionalText(160),
    deadline: optionalText(40),
    preferredContact: z.enum(['email', 'phone', '']).optional().default(''),
    message: z.string().trim().min(20).max(5000),
    company_website: z.string().max(200).optional().default(''),
    'cf-turnstile-response': z.string().max(4096).optional().default(''),
  })
  .superRefine((data, ctx) => {
    const reachBy = data.preferredContact || 'email';
    if (data[reachBy] === '') {
      ctx.addIssue({ code: 'custom', path: [reachBy], message: 'required' });
    }
  });

/**
 * Field-error codes. The client maps these to localised text — the Function
 * never returns a user-facing sentence, because it does not know which of the
 * two languages the visitor is reading.
 */
type ErrorCode = 'required' | 'email' | 'phone' | 'too_short' | 'too_long' | 'invalid';

function codeFor(issue: {
  code: string;
  message?: string;
  minimum?: unknown;
  origin?: unknown;
  format?: unknown;
}): ErrorCode {
  // The email and phone refines and the reach-by rule set their own message, which is the code itself.
  if (issue.message === 'phone') return 'phone';
  if (issue.message === 'email') return 'email';
  if (issue.message === 'required') return 'required';
  // zod v4 reports string formats as invalid_format with `format: 'email'`.
  if (issue.code === 'invalid_format' && (issue.format === 'email' || issue.origin === 'email')) {
    return 'email';
  }
  if (issue.code === 'too_small') return Number(issue.minimum) <= 1 ? 'required' : 'too_short';
  if (issue.code === 'too_big') return 'too_long';
  if (issue.code === 'invalid_type') return 'required';
  return 'invalid';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    },
  });
}

/** Strip control characters and collapse runaway whitespace before templating. */
function clean(value: string, max = 5000): string {
  return (
    value
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, max)
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Keyed so the stored hash cannot be reversed by hashing all 2^32 IPv4
 * addresses, which an unkeyed digest with a public prefix allows.
 */
async function hashIp(env: Env, ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.TURNSTILE_SECRET_KEY || 'sko-dev-rate-limit'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(ip));
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Key for the current fixed window. Fixing the window (rather than refreshing a
 * TTL on every write) means a burst can never extend its own window, and the
 * count for a given IP is bounded per window regardless of write ordering.
 */
async function rateLimitKey(env: Env, ip: string, now = Date.now()): Promise<string> {
  const window = Math.floor(now / 1000 / RATE_LIMIT_WINDOW_SECONDS);
  return `rl:${await hashIp(env, ip)}:${window}`;
}

function rateLimitTtl(now = Date.now()): number {
  const elapsed = Math.floor(now / 1000) % RATE_LIMIT_WINDOW_SECONDS;
  // KV rejects TTLs under 60 seconds.
  return Math.max(60, RATE_LIMIT_WINDOW_SECONDS - elapsed);
}

function rateLimitingConfigured(env: Env): env is Env & { RATE_LIMIT_KV: KVNamespaceLike } {
  /**
   * Deliberately fail-open, unlike Turnstile.
   *
   * Rate limiting is a secondary control — Turnstile is the one that actually
   * stops abuse, and it fails closed. Blocking a genuine grant inquiry because
   * a KV namespace had a blip would be the worse outcome.
   *
   * A missing binding is a deployment mistake rather than a transient fault, so
   * it is logged: Cloudflare's Workers logs will show it on the first
   * submission after a bad deploy.
   */
  return Boolean(env.RATE_LIMIT_KV);
}

/** Read-only check. Never consumes quota, so unverified requests cannot exhaust a shared IP. */
async function isRateLimited(env: Env, ip: string): Promise<boolean> {
  if (!rateLimitingConfigured(env)) {
    if (env.RATE_LIMIT_WAF_ENABLED !== 'true') {
      console.warn('[contact] RATE_LIMIT_KV binding is not configured — rate limiting is disabled');
    }
    return false;
  }
  try {
    const current = Number(
      (await bounded(env.RATE_LIMIT_KV.get(await rateLimitKey(env, ip)), KV_TIMEOUT_MS)) ?? '0',
    );
    return current >= RATE_LIMIT_MAX;
  } catch {
    console.warn('[contact] rate_limit_unavailable');
    return false;
  }
}

/**
 * Consume one unit of quota. Called only after Turnstile has verified the
 * request, so every counted submission cost the sender a solved challenge.
 *
 * KV has no atomic increment, so the read and write here can still race with
 * a concurrent verified submission from the same IP. Re-reading immediately
 * before the write keeps that gap to milliseconds rather than the full
 * Turnstile round-trip; a strict limit needs an upstream WAF rule.
 */
async function recordSubmission(env: Env, ip: string): Promise<void> {
  if (!rateLimitingConfigured(env)) return;
  try {
    const key = await rateLimitKey(env, ip);
    const current = Number((await bounded(env.RATE_LIMIT_KV.get(key), KV_TIMEOUT_MS)) ?? '0');
    await bounded(
      env.RATE_LIMIT_KV.put(key, String(current + 1), {
        expirationTtl: rateLimitTtl(),
      }),
      KV_TIMEOUT_MS,
    );
  } catch {
    console.warn('[contact] rate_limit_unavailable');
  }
}

/**
 * In production the token must also have been minted on the live hostname for
 * this form: the rehearsal and local builds can share the widget, and their
 * tokens would otherwise be accepted here.
 */
async function verifyTurnstile(
  env: Env,
  secret: string,
  token: string,
  ip: string,
): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(SERVICE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error('Turnstile unavailable');
  const result = (await response.json()) as {
    success?: boolean;
    hostname?: string;
    action?: string;
  };
  if (result.success !== true) return false;
  if (env.PUBLIC_DEPLOYMENT_ENV !== 'production') return true;
  return result.hostname === productionSite(env)?.hostname && result.action === TURNSTILE_ACTION;
}

async function sendEmail(env: Env, to: string, subject: string, html: string, replyTo: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(SERVICE_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}`);
  }
}

async function handlePost(context: FunctionContext): Promise<Response> {
  const { request, env } = context;
  const ip = context.clientIp ?? request.headers.get('CF-Connecting-IP') ?? '';

  /**
   * Require a JSON content type.
   *
   * A cross-origin HTML form can POST as text/plain without triggering a CORS
   * preflight — a "simple request" — so the browser would send it even though
   * it could not read the reply. The side effect (an email landing in SKO's
   * inbox) would still happen. Demanding application/json forces a preflight,
   * which this endpoint answers with 405.
   */
  const contentType = request.headers.get('Content-Type') ?? '';
  if (contentType.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    return json({ ok: false, error: 'unsupported_media_type' }, 415);
  }

  if (env.PUBLIC_DEPLOYMENT_ENV === 'production') {
    const origin = request.headers.get('Origin');
    if (origin !== null && origin !== productionSite(env)?.origin) {
      return json({ ok: false, error: 'forbidden_origin' }, 403);
    }
  }

  const declaredLength = Number(request.headers.get('Content-Length') ?? '0');
  if (declaredLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'payload_too_large' }, 413);
  }

  let payload: unknown;
  try {
    const raw = await readBody(request);
    payload = JSON.parse(raw);
  } catch (error) {
    if (error instanceof BodyReadError) return json({ ok: false, error: error.code }, error.status);
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    // Return codes, not sentences. The page renders the message in the
    // visitor's language; zod's built-in strings are English only.
    const fieldErrors: Record<string, ErrorCode> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !fieldErrors[field]) fieldErrors[field] = codeFor(issue);
    }
    return json({ ok: false, fieldErrors }, 400);
  }

  const data = parsed.data;

  // 1. Honeypot. Return success and send nothing — never teach the bot.
  if (data.company_website.trim() !== '') {
    return json({ ok: true });
  }

  if (!productionConfigured(env)) {
    console.warn('[contact] production_not_configured');
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  // 2. Rate limit — check only. Quota is consumed after Turnstile (step 4), so a
  // bot without a valid token cannot lock out real visitors behind the same NAT.
  if (await isRateLimited(env, ip)) {
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  /**
   * 3. Turnstile — FAIL CLOSED.
   *
   * This was previously written as `if (env.TURNSTILE_SECRET_KEY) { verify }`,
   * which meant a deployment that forgot the secret silently accepted every
   * unverified submission — the site's only spam control disabled by a missing
   * environment variable, with nothing to indicate it. A misconfiguration must
   * break the form loudly, not quietly switch the protection off.
   */
  if (!env.TURNSTILE_SECRET_KEY) {
    return json({ ok: false, error: 'not_configured' }, 500);
  }
  const token = data['cf-turnstile-response'];
  if (!token) {
    return json({ ok: false, error: 'verification_failed' }, 403);
  }
  try {
    if (!(await verifyTurnstile(env, env.TURNSTILE_SECRET_KEY, token, ip))) {
      return json({ ok: false, error: 'verification_failed' }, 403);
    }
  } catch {
    console.warn('[contact] verification_unavailable');
    return json({ ok: false, error: 'verification_unavailable' }, 503);
  }

  // 4. Only a verified submission counts against the shared-IP quota.
  await recordSubmission(env, ip);

  // 5. Route to the right inbox.
  const to =
    data.formType === 'partner'
      ? (env.PARTNER_TO_EMAIL ?? env.CONTACT_TO_EMAIL)
      : env.CONTACT_TO_EMAIL;
  if (!to || !env.RESEND_API_KEY || !env.MAIL_FROM) {
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  const name = clean(data.name, 120);
  const email = clean(data.email, 200);
  const phone = clean(data.phone, 32);
  const message = clean(data.message, 5000);

  const optionalRows: [string, string][] = [
    ['Phone', phone],
    ['Prefers', data.preferredContact],
    ['Organization', clean(data.organization, 160)],
    ['Role', clean(data.role, 120)],
    ['Country', clean(data.country, 80)],
    ['Help with', clean(data.helpWith, 60)],
    ['Wants to', clean(data.volunteerType, 40)],
    ['Availability', clean(data.availability, 200)],
    ['Languages', clean(data.languages, 120)],
    ['Outlet', clean(data.outlet, 160)],
    ['Deadline', clean(data.deadline, 40)],
  ];
  const rows: [string, string][] = [
    ['Name', name],
    ...(email ? ([['Email', email]] as [string, string][]) : []),
    ...optionalRows.filter(([, value]) => value !== ''),
    ['Form', data.formType],
  ];

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111a2b">` +
    `<h2 style="margin:0 0 16px">Website inquiry — ${escapeHtml(data.formType)}</h2>` +
    `<table style="border-collapse:collapse;margin-bottom:20px">` +
    rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#5f6b82">${escapeHtml(label)}</td>` +
          `<td style="padding:4px 0;font-weight:600">${escapeHtml(value)}</td></tr>`,
      )
      .join('') +
    `</table>` +
    `<div style="border-left:3px solid #475d8c;padding-left:16px;white-space:pre-wrap">${escapeHtml(message)}</div>` +
    `<p style="margin-top:24px;color:#5f6b82;font-size:13px">Sent from the SKO website. Reply directly to answer the sender.</p>` +
    `</div>`;

  // The subject is a mail header. `clean()` keeps line breaks because the
  // message body legitimately has them, so the one value that reaches a header
  // gets its own CR/LF strip — the same rule productionConfigured() applies to
  // the configured addresses.
  const subjectName = name.replace(/[\r\n]+/g, ' ').trim();

  try {
    await sendEmail(
      env,
      to,
      `[SKO website] ${data.formType} inquiry from ${subjectName}`,
      html,
      email,
    );
  } catch {
    console.warn('[contact] send_failed');
    return json({ ok: false, error: 'send_failed' }, 502);
  }

  return json({ ok: true });
}

/** Anything other than POST gets a clean 405 rather than a framework error page. */
export async function onRequest(context: FunctionContext): Promise<Response> {
  if (context.request.method === 'POST') return handlePost(context);
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
