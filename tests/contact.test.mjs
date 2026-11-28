import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../functions/api/contact.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { onRequest } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.replace(/from ['"]zod['"]/, `from '${import.meta.resolve('zod')}'`)).toString('base64')}`
);
const valid = {
  name: 'Test Person',
  email: 'test@example.com',
  message: 'A legitimate enquiry with sufficient text.',
  'cf-turnstile-response': 'token',
};
const env = {
  TURNSTILE_SECRET_KEY: 'secret',
  RESEND_API_KEY: 'key',
  MAIL_FROM: 'website@example.com',
  CONTACT_TO_EMAIL: 'inbox@example.com',
  PARTNER_TO_EMAIL: 'partners@example.com',
};
const request = (body, headers = {}) =>
  new Request('https://website.test/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });

test('rejects oversized multibyte JSON before verification, without trusting declared length', async () => {
  for (const headers of [{}, { 'Content-Length': '1' }]) {
    const response = await onRequest({
      request: request(JSON.stringify({ ...valid, padding: 'ក'.repeat(12000) }), headers),
      env: {},
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error, 'payload_too_large');
  }
});

test('cancels a chunked oversized stream before buffering the remainder', async () => {
  let cancelled = false;
  let chunks = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (chunks++ < 4) controller.enqueue(new Uint8Array(17000));
      else controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request('https://website.test/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    duplex: 'half',
  });
  const response = await onRequest({ request: req, env: {} });
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
});

test('accepts the exact byte boundary and rejects one byte over', async () => {
  const base = JSON.stringify({
    ...valid,
    company_website: 'bot',
    padding: '',
  });
  const remaining = 32768 - Buffer.byteLength(base);
  for (const [size, status] of [
    [remaining, 200],
    [remaining + 1, 413],
  ]) {
    const response = await onRequest({
      request: request(base.replace('"padding":""', `"padding":"${'a'.repeat(size)}"`)),
      env: {},
    });
    assert.equal(response.status, status);
  }
});

test('verification network and JSON failures return controlled errors', async (t) => {
  for (const fetcher of [
    async () => {
      throw new Error('network');
    },
    async () => new Response('not JSON'),
  ]) {
    t.mock.method(globalThis, 'fetch', fetcher);
    const response = await onRequest({
      request: request(JSON.stringify(valid)),
      env,
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'verification_unavailable');
    t.mock.restoreAll();
  }
});

test('valid partner enquiry preserves routing, escaping and reply-to', async (t) => {
  let mail;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).includes('siteverify')) return Response.json({ success: true });
    mail = JSON.parse(options.body);
    return Response.json({ id: 'mail-id' });
  });
  const response = await onRequest({
    request: request(
      JSON.stringify({
        ...valid,
        formType: 'partner',
        name: '<Test Person>',
        organization: 'Example Fund',
        partnershipType: 'Funding',
      }),
    ),
    env,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(mail.to, ['partners@example.com']);
  assert.equal(mail.reply_to, 'test@example.com');
  assert.match(mail.html, /&lt;Test Person&gt;/);
  assert.match(mail.html, /Example Fund/);
  assert.match(mail.html, /Funding/);
});

test('a partner enquiry without an organisation is rejected on that field', async () => {
  const response = await onRequest({
    request: request(JSON.stringify({ ...valid, formType: 'partner' })),
    env,
  });
  assert.equal(response.status, 400);
  assert.deepEqual((await response.json()).fieldErrors, { organization: 'required' });
});

test('media details reach the general inbox', async (t) => {
  let mail;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).includes('siteverify')) return Response.json({ success: true });
    mail = JSON.parse(options.body);
    return Response.json({ id: 'mail-id' });
  });
  const response = await onRequest({
    request: request(
      JSON.stringify({ ...valid, formType: 'media', outlet: 'Phnom Penh Post', deadline: 'Friday' }),
    ),
    env,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(mail.to, ['inbox@example.com']);
  assert.match(mail.html, /Phnom Penh Post/);
  assert.match(mail.subject, /media inquiry/);
});

test('invalid JSON, media type, fields and methods preserve rejection contracts', async () => {
  for (const [req, status] of [
    [request('{'), 400],
    [request('{}', { 'Content-Type': 'text/plain' }), 415],
    [request('{}'), 400],
    [new Request('https://website.test/api/contact'), 405],
  ]) {
    assert.equal((await onRequest({ request: req, env: {} })).status, status);
  }
});

test('a stalled request is cancelled at the total body deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let cancelled = false;
  const body = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request('https://website.test/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    duplex: 'half',
  });
  const pending = onRequest({ request: req, env: {} });
  t.mock.timers.tick(5000);
  const response = await pending;
  assert.equal(response.status, 408);
  assert.equal(cancelled, true);
});

test('production rejects test secrets and incomplete inbox/KV configuration before consuming a token', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    assert.fail('misconfiguration must not call services');
  });
  const configured = {
    TURNSTILE_SECRET_KEY: '0x-test-secret-for-unit-test',
    RESEND_API_KEY: 're_unit_test',
    MAIL_FROM: 'SKO <website@ngo.org>',
    CONTACT_TO_EMAIL: 'info@ngo.org',
    PARTNER_TO_EMAIL: 'partners@ngo.org',
    RATE_LIMIT_KV: { get: async () => '0', put: async () => {} },
    SITE_URL: 'https://www.ngo.org',
  };
  for (const production of [
    {
      ...configured,
      TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
    },
    { ...configured, PARTNER_TO_EMAIL: '' },
    { ...configured, MAIL_FROM: 'noreply@example.org' },
    { ...configured, RATE_LIMIT_KV: undefined },
    { ...configured, SITE_URL: undefined },
    { ...configured, SITE_URL: 'http://www.ngo.org' },
    { ...configured, SITE_URL: 'not a url' },
  ]) {
    const response = await onRequest({
      request: request(JSON.stringify(valid)),
      env: { ...production, PUBLIC_DEPLOYMENT_ENV: 'production' },
    });
    assert.equal(response.status, 500);
    assert.equal((await response.json()).error, 'not_configured');
  }
});

test('complete production settings preserve valid general enquiry delivery', async (t) => {
  let mail;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).includes('siteverify'))
      return Response.json({ success: true, hostname: 'www.ngo.org', action: 'contact' });
    assert.ok(options.signal instanceof AbortSignal);
    mail = JSON.parse(options.body);
    return Response.json({ id: 'mail-id' });
  });
  const configured = {
    PUBLIC_DEPLOYMENT_ENV: 'production',
    TURNSTILE_SECRET_KEY: '0x-test-secret-for-unit-test',
    RESEND_API_KEY: 're_unit_test',
    MAIL_FROM: 'SKO <website@ngo.org>',
    CONTACT_TO_EMAIL: 'info@ngo.org',
    PARTNER_TO_EMAIL: 'partners@ngo.org',
    RATE_LIMIT_KV: { get: async () => '0', put: async () => {} },
    SITE_URL: 'https://www.ngo.org',
  };
  const response = await onRequest({
    request: request(JSON.stringify(valid), { Origin: 'https://www.ngo.org' }),
    env: configured,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(mail.to, ['info@ngo.org']);
});

const production = {
  PUBLIC_DEPLOYMENT_ENV: 'production',
  TURNSTILE_SECRET_KEY: '0x-test-secret-for-unit-test',
  RESEND_API_KEY: 're_unit_test',
  MAIL_FROM: 'SKO <website@ngo.org>',
  CONTACT_TO_EMAIL: 'info@ngo.org',
  PARTNER_TO_EMAIL: 'partners@ngo.org',
  RATE_LIMIT_KV: { get: async () => '0', put: async () => {} },
  SITE_URL: 'https://www.ngo.org',
};

test('production rejects Turnstile tokens minted on another hostname or for another action', async (t) => {
  for (const verdict of [
    { success: true, hostname: 'sko-website.example.workers.dev', action: 'contact' },
    { success: true, hostname: 'localhost', action: 'contact' },
    { success: true, hostname: 'www.ngo.org', action: 'login' },
    { success: true, hostname: 'www.ngo.org' },
    { success: true },
  ]) {
    let sent = false;
    t.mock.method(globalThis, 'fetch', async (url) => {
      if (String(url).includes('siteverify')) return Response.json(verdict);
      sent = true;
      return Response.json({ id: 'mail-id' });
    });
    const response = await onRequest({ request: request(JSON.stringify(valid)), env: production });
    assert.equal(response.status, 403, JSON.stringify(verdict));
    assert.equal((await response.json()).error, 'verification_failed');
    assert.equal(sent, false);
    t.mock.restoreAll();
  }
});

test('production rejects a cross-origin POST before reading the body or calling services', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    assert.fail('a cross-origin request must not call services');
  });
  for (const origin of ['https://evil.example', 'http://www.ngo.org', 'https://ngo.org', 'null']) {
    const req = request(JSON.stringify(valid), { Origin: origin });
    const response = await onRequest({ request: req, env: production });
    assert.equal(response.status, 403, origin);
    assert.equal((await response.json()).error, 'forbidden_origin');
    assert.equal(req.bodyUsed, false);
  }
});

test('rate-limit keys are keyed by the secret, not a reversible hash of the IP', async (t) => {
  const keysFor = async (secret) => {
    const keys = [];
    const kv = {
      get: async () => null,
      put: async (key) => {
        keys.push(key);
      },
    };
    t.mock.method(globalThis, 'fetch', async (url) =>
      Response.json(String(url).includes('siteverify') ? { success: true } : { id: 'mail-id' }),
    );
    await onRequest({
      request: request(JSON.stringify(valid), { 'CF-Connecting-IP': '192.0.2.1' }),
      env: { ...env, TURNSTILE_SECRET_KEY: secret, RATE_LIMIT_KV: kv },
    });
    t.mock.restoreAll();
    return keys[0].split(':')[1];
  };
  const unkeyed = Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sko:192.0.2.1')),
  )
    .subarray(0, 12)
    .toString('hex');
  const first = await keysFor('secret-a');
  assert.match(first, /^[0-9a-f]{24}$/);
  assert.notEqual(first, unkeyed);
  assert.notEqual(first, await keysFor('secret-b'));
  assert.equal(first, await keysFor('secret-a'));
});

test('service requests have abort deadlines and verification rejection does not send mail', async (t) => {
  let sent = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    if (String(url).includes('siteverify')) return Response.json({ success: false });
    sent = true;
    return Response.json({ id: 'mail-id' });
  });
  assert.equal((await onRequest({ request: request(JSON.stringify(valid)), env })).status, 403);
  assert.equal(sent, false);
});

test('stalled KV reads and writes fail open within a deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  // Turnstile must pass: the KV write only happens for verified submissions.
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, id: 'mail-id' }));
  for (const stalled of ['get', 'put']) {
    const kv = { get: async () => '0', put: async () => {} };
    let stalls = 0;
    kv[stalled] = () => {
      stalls += 1;
      return new Promise(() => {});
    };
    let settled = false;
    const pending = onRequest({
      request: request(JSON.stringify(valid)),
      env: { ...env, RATE_LIMIT_KV: kv },
    }).finally(() => {
      settled = true;
    });
    // Every stalled call (the check read, then the record read/write) is
    // released only by its deadline, never by the stall resolving.
    let released = 0;
    while (!settled) {
      if (stalls > released) {
        released = stalls;
        t.mock.timers.tick(1000);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(stalls >= 1);
    assert.equal((await pending).status, 200);
  }
});

test('rate-limit quota is consumed only by Turnstile-verified submissions', async (t) => {
  const store = new Map();
  const kv = {
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => {
      store.set(key, value);
    },
  };
  let verified = false;
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (String(url).includes('siteverify')) return Response.json({ success: verified });
    return Response.json({ id: 'mail-id' });
  });
  const withKv = { ...env, RATE_LIMIT_KV: kv };

  // Unverified requests (missing or rejected token) must not touch the counter.
  const { 'cf-turnstile-response': _token, ...noToken } = valid;
  assert.equal((await onRequest({ request: request(JSON.stringify(noToken)), env: withKv })).status, 403);
  assert.equal((await onRequest({ request: request(JSON.stringify(valid)), env: withKv })).status, 403);
  assert.equal(store.size, 0);

  verified = true;
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await onRequest({ request: request(JSON.stringify(valid)), env: withKv })).status, 200);
  }
  assert.deepEqual([...store.values()], ['5']);
  const limited = await onRequest({ request: request(JSON.stringify(valid)), env: withKv });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, 'rate_limited');
});

test('rate-limit keys use a fixed window so a burst cannot extend its own expiry', async (t) => {
  const puts = [];
  const kv = {
    get: async () => null,
    put: async (key, value, options) => {
      puts.push({ key, ttl: options?.expirationTtl });
    },
  };
  t.mock.method(globalThis, 'fetch', async (url) =>
    Response.json(String(url).includes('siteverify') ? { success: true } : { id: 'mail-id' }),
  );
  const at = (ms) => {
    t.mock.method(Date, 'now', () => ms);
    return onRequest({ request: request(JSON.stringify(valid)), env: { ...env, RATE_LIMIT_KV: kv } });
  };
  const base = 1667 * 600 * 1000; // start of a 600-second window
  await at(base + 30_000); // 30s into the window
  await at(base + 599_000); // 599s into the same window
  await at(base + 600_000); // first second of the next window
  assert.equal(puts[0].key, puts[1].key);
  assert.notEqual(puts[1].key, puts[2].key);
  assert.equal(puts[0].ttl, 570);
  assert.equal(puts[1].ttl, 60); // clamped to KV's 60-second minimum
  assert.equal(puts[2].ttl, 600);
});

test('line breaks in the name never reach the mail subject header', async (t) => {
  let mail;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).includes('siteverify')) return Response.json({ success: true });
    mail = JSON.parse(options.body);
    return Response.json({ id: 'mail-id' });
  });
  const response = await onRequest({
    request: request(
      JSON.stringify({ ...valid, name: 'Sender\r\nBcc: victim@example.com\nX-Injected: 1' }),
    ),
    env,
  });
  assert.equal(response.status, 200);
  assert.doesNotMatch(mail.subject, /[\r\n]/, 'the subject is a single header line');
  assert.match(mail.subject, /^\[SKO website\] general inquiry from Sender Bcc: victim@example\.com X-Injected: 1$/);
});
