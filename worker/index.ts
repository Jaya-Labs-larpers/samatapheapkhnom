/**
 * The Worker in front of the static site.
 *
 * `assets.run_worker_first` sends only `/api/*` here. Every other request is
 * served straight from `dist/` without invoking this code, and requests for
 * missing pages fall through to the nearest `404.html`. Cron jobs are in
 * scheduled.ts.
 */

import { onRequest } from '../functions/api/contact';
import { scheduled } from './scheduled';

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PUBLIC_DEPLOYMENT_ENV?: string;
  CONTACT_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  CONTACT_TO_EMAIL?: string;
  PARTNER_TO_EMAIL?: string;
  RATE_LIMIT_KV?: KVNamespaceLike;
  CF_VERSION_METADATA?: { id: string; tag: string; timestamp: string };
  SITE_URL?: string;
  SANITY_PROJECT_ID?: string;
  SANITY_DATASET?: string;
  SANITY_API_VERSION?: string;
  DEPLOY_HOOK_URL?: string;
  ALERT_TO_EMAIL?: string;
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/contact' || pathname === '/api/contact/') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'method_not_allowed' }, 405, {
          Allow: 'POST',
        });
      }
      // Runtime kill switch, independent of the build-time PUBLIC_CONTACT_ENABLED.
      // Rejects before the body is read or any service is contacted.
      if (env.CONTACT_ENABLED !== 'true') {
        return json({ ok: false, error: 'preview_disabled' }, 503);
      }
      return onRequest({ request, env });
    }

    if (pathname.startsWith('/api/')) {
      return json({ ok: false, error: 'not_found' }, 404);
    }

    return env.ASSETS.fetch(request);
  },

  scheduled,
};
