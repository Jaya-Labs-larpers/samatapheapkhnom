import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const component = await readFile(
  new URL('../src/components/forms/ContactForm.astro', import.meta.url),
  'utf8',
);
const script = component.match(/<script>([\s\S]*?)<\/script>/)[1];
const compiled = ts.transpileModule(script, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

const STRINGS = {
  sending: 'Sending…',
  required: 'This field is required.',
  email: 'Enter a complete email address',
  phone: 'Enter a valid phone number',
  too_short: 'Please write a little more',
  too_long: 'Too long',
  invalid: 'This field is required.',
  rate_limited: 'Too many messages',
  verification: 'The security check did not pass',
  unavailable: 'The contact form is not available on this preview',
  errorTitle: "We couldn't send that.",
  errorBody: 'Please try again, or email us directly at',
  fallbackEmail: 'info@example.org',
};

/**
 * Minimal DOM stand-ins for what the submit handler touches: the form with
 * its fields, the status line, the submit button and the toast.
 */
function harness({ enabled = true, reply, status = 200, network } = {}) {
  class HTMLElement {
    constructor() {
      this.attributes = {};
      this.focused = false;
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
    removeAttribute(name) {
      delete this.attributes[name];
    }
    focus() {
      this.focused = true;
    }
  }
  const field = (name, value) => Object.assign(new HTMLElement(), { name, value, disabled: false });
  const fields = [
    field('name', 'Reviewer'),
    field('email', 'review@example.org'),
    field('message', 'A message long enough to pass the schema.'),
    field('company_website', ''),
    field('cf-turnstile-response', 'token'),
    Object.assign(new HTMLElement(), { name: '', value: '', disabled: false }), // the submit button
  ];
  const elements = Object.assign([...fields], {
    namedItem: (name) => fields.find((entry) => entry.name === name) ?? null,
  });
  const statusLine = { id: 'form-general-status', hidden: true, textContent: '' };
  const buttonLabel = { textContent: 'Send message' };
  const button = {
    disabled: false,
    querySelector: (selector) => (selector === 'span' ? buttonLabel : null),
  };
  let submitHandler;
  let resetCalled = false;
  const form = {
    id: 'form-general',
    dataset: {
      formType: 'general',
      endpoint: '/api/contact',
      enabled: enabled ? 'true' : 'false',
      strings: JSON.stringify(STRINGS),
    },
    elements,
    querySelector: (selector) => {
      if (selector === '.form-status') return statusLine;
      if (selector === 'button[type="submit"]') return button;
      if (selector === '.cf-turnstile') return null;
      return null;
    },
    addEventListener(_, callback) {
      submitHandler = callback;
    },
    reset() {
      resetCalled = true;
    },
  };
  const toastListeners = {};
  const toast = {
    hidden: true,
    classList: {
      names: new Set(),
      add(name) {
        this.names.add(name);
      },
      remove(name) {
        this.names.delete(name);
      },
    },
    addEventListener(type, callback) {
      toastListeners[type] = callback;
    },
    removeEventListener(type) {
      delete toastListeners[type];
    },
  };
  const frames = [];
  const timers = [];
  const requests = [];
  const injected = [];

  vm.runInNewContext(compiled, {
    HTMLElement,
    window: {},
    document: {
      querySelectorAll: () => [form],
      querySelector: (selector) => {
        if (selector === '[data-toast="form-general"]') return toast;
        return null;
      },
      createElement: () => ({}),
      head: { append: (node) => injected.push(node) },
      addEventListener: (type, callback) => type === 'astro:page-load' && callback(),
    },
    requestAnimationFrame: (callback) => frames.push(callback),
    setTimeout: (callback) => {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout: () => {},
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (network) throw new Error('network down');
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => reply,
      };
    },
  });

  return {
    toast,
    toastListeners,
    statusLine,
    button,
    buttonLabel,
    fields,
    requests,
    injected,
    get resetCalled() {
      return resetCalled;
    },
    submit: async (event = { preventDefault() {} }) => {
      await submitHandler(event);
    },
    flushFrames: () => frames.splice(0).forEach((callback) => callback()),
    flushTimers: () => timers.splice(0).forEach((callback) => callback()),
  };
}

test('a submit posts the fields as JSON to the API and never navigates', async () => {
  const h = harness({ reply: { ok: true } });
  let defaultPrevented = false;

  await h.submit({
    preventDefault() {
      defaultPrevented = true;
    },
  });

  assert.equal(defaultPrevented, true, 'the page must not navigate');
  assert.equal(h.requests.length, 1, 'exactly one request');
  const { url, options } = h.requests[0];
  assert.equal(url, '/api/contact');
  assert.equal(options.method, 'POST');
  assert.equal(
    options.headers['Content-Type'],
    'application/json',
    'JSON content type, so a cross-origin form post cannot be replayed as a simple request',
  );
  const body = JSON.parse(options.body);
  assert.equal(body.formType, 'general');
  assert.equal(body.name, 'Reviewer');
  assert.equal(body.company_website, '', 'the honeypot travels with the payload');
  assert.equal(body['cf-turnstile-response'], 'token');
});

test('success clears the form and reveals the confirmation', async () => {
  const h = harness({ reply: { ok: true } });
  await h.submit();

  assert.equal(h.resetCalled, true, 'typed content does not linger after sending');
  assert.equal(h.toast.hidden, false, 'the confirmation is in the layout');
  assert.equal(h.statusLine.hidden, true, 'no error is shown');
  assert.equal(h.button.disabled, false, 'the button is usable again');
  assert.equal(h.buttonLabel.textContent, 'Send message', 'the label returns from "Sending…"');

  h.flushFrames();
  assert.ok(h.toast.classList.names.has('is-shown'), 'it fades in');
});

test('the confirmation retreats on its own', async () => {
  const h = harness({ reply: { ok: true } });
  await h.submit();
  h.flushFrames();

  h.flushTimers();
  assert.equal(h.toast.classList.names.has('is-shown'), false, 'it fades out');
  assert.equal(h.toast.hidden, false, 'it stays until the fade finishes');

  h.toastListeners.transitionend();
  assert.equal(h.toast.hidden, true, 'then it leaves the layout');
});

test('field errors mark the field, explain in the visitor\'s language and do not confirm', async () => {
  const h = harness({ status: 400, reply: { ok: false, fieldErrors: { email: 'email', message: 'too_short' } } });
  await h.submit();

  assert.equal(h.toast.hidden, true, 'nothing was sent, so nothing is confirmed');
  assert.equal(h.resetCalled, false, 'the visitor keeps what they typed');
  const email = h.fields.find((field) => field.name === 'email');
  const message = h.fields.find((field) => field.name === 'message');
  assert.equal(email.attributes['aria-invalid'], 'true');
  assert.equal(message.attributes['aria-invalid'], 'true');
  assert.equal(email.attributes['aria-describedby'], 'form-general-status');
  assert.equal(email.focused, true, 'focus lands on the first problem');
  assert.equal(h.statusLine.hidden, false);
  assert.equal(h.statusLine.textContent, STRINGS.email, 'the localised sentence, not the API code');
});

test('rate limiting and verification failures are explained without the fallback inbox', async () => {
  for (const [error, expected] of [
    ['rate_limited', STRINGS.rate_limited],
    ['verification_failed', STRINGS.verification],
  ]) {
    const h = harness({ status: 429, reply: { ok: false, error } });
    await h.submit();
    assert.equal(h.toast.hidden, true);
    assert.equal(h.statusLine.textContent, expected);
  }
});

test('other failures name the inbox to email instead', async () => {
  for (const options of [
    { status: 502, reply: { ok: false, error: 'send_failed' } },
    { status: 500, reply: { ok: false, error: 'not_configured' } },
    { network: true },
  ]) {
    const h = harness(options);
    await h.submit();
    assert.equal(h.toast.hidden, true, 'a failure never shows the confirmation');
    assert.match(h.statusLine.textContent, /We couldn't send that\./);
    assert.match(h.statusLine.textContent, /info@example\.org$/);
    assert.equal(h.button.disabled, false, 'the visitor can retry');
  }
});

test('a disabled form (preview) explains itself without touching the network', async () => {
  const h = harness({ enabled: false, reply: { ok: true } });
  await h.submit();

  assert.equal(h.requests.length, 0, 'no request leaves a preview');
  assert.equal(h.toast.hidden, true);
  assert.match(h.statusLine.textContent, /not available on this preview/);
});

test('a second submit after an error clears the previous marks', async () => {
  const h = harness({ status: 400, reply: { ok: false, fieldErrors: { name: 'required' } } });
  await h.submit();
  const name = h.fields.find((field) => field.name === 'name');
  assert.equal(name.attributes['aria-invalid'], 'true');

  // Simulate the API now accepting the corrected form.
  h.requests.length = 0;
  const h2 = harness({ reply: { ok: true } });
  await h2.submit();
  const name2 = h2.fields.find((field) => field.name === 'name');
  assert.equal(name2.attributes['aria-invalid'], undefined);
  assert.equal(h2.statusLine.hidden, true);
});
