import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/menu.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

class El {
  constructor(name = 'el') {
    this.name = name;
    this.attrs = new Map();
    this.listeners = {};
    this.dataset = {};
    this.hidden = false;
    this.tabIndex = 0;
    this.found = {};
    this.foundAll = {};
  }
  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }
  fire(type, event = {}) {
    for (const fn of this.listeners[type] ?? [])
      fn({ target: this, preventDefault() {}, ...event });
  }
  setAttribute(name, value) {
    this.attrs.set(name, String(value));
  }
  getAttribute(name) {
    return this.attrs.has(name) ? this.attrs.get(name) : null;
  }
  hasAttribute(name) {
    return this.attrs.has(name);
  }
  removeAttribute(name) {
    this.attrs.delete(name);
  }
  toggleAttribute(name, on) {
    if (on) this.attrs.set(name, '');
    else this.attrs.delete(name);
  }
  querySelector(selector) {
    return this.found[selector] ?? null;
  }
  querySelectorAll(selector) {
    return this.foundAll[selector] ?? [];
  }
  contains(other) {
    return other === this;
  }
  focus() {
    context.document.activeElement = this;
  }
  get offsetWidth() {
    return 1;
  }
}

let context;

function load({ desktop = false } = {}) {
  const timers = [];
  const html = new El('html');
  const doc = new El('document');
  const burger = new El('burger');
  burger.dataset = { labelOpen: 'Open menu', labelClose: 'Close menu' };
  burger.setAttribute('aria-expanded', 'false');
  const panel = new El('panel');
  panel.hidden = true;
  const link = new El('panel-link');
  panel.foundAll['a[href], button:not([disabled])'] = [link];

  const item = new El('item');
  const toggle = new El('toggle');
  const dd = new El('dd');
  item.found['[data-dd]'] = dd;
  item.found['[data-dd-toggle]'] = toggle;
  item.foundAll['.dd__link'] = [];

  doc.documentElement = html;
  doc.found['[data-mobile-open]'] = burger;
  doc.found['[data-mobile-panel]'] = panel;
  doc.foundAll['[data-mgroup]'] = [];
  doc.foundAll['[data-nav-item]'] = [item];

  context = {
    exports: {},
    document: doc,
    window: {
      matchMedia: (query) => ({
        matches: query.includes('reduce') ? false : desktop,
        addEventListener() {},
      }),
      setTimeout: (fn, ms) => timers.push({ fn, ms }),
      clearTimeout() {},
    },
  };
  vm.runInNewContext(compiled, context);
  return { menu: context.exports, burger, panel, html, doc, timers, item, toggle };
}

test("the bar's menu button opens the phone menu and turns into its close button", () => {
  const { menu, burger, panel, html } = load();
  menu.initMenus();
  burger.fire('click');
  assert.equal(burger.getAttribute('aria-expanded'), 'true');
  assert.equal(burger.getAttribute('aria-label'), 'Close menu');
  assert.equal(panel.hidden, false);
  assert.equal(panel.dataset.state, 'open');
  assert.ok(html.hasAttribute('data-menu-open'));
});

test('pressing the menu button again closes the menu after the 400ms fade', () => {
  const { menu, burger, panel, html, timers } = load();
  menu.initMenus();
  burger.fire('click');
  burger.fire('click');
  assert.equal(burger.getAttribute('aria-expanded'), 'false');
  assert.equal(burger.getAttribute('aria-label'), 'Open menu');
  assert.equal(html.hasAttribute('data-menu-open'), false);
  const close = timers.at(-1);
  assert.equal(close.ms, 400);
  close.fn();
  assert.equal(panel.hidden, true);
});

test('Escape closes the phone menu', () => {
  const { menu, burger, doc } = load();
  menu.initMenus();
  burger.fire('click');
  doc.fire('keydown', { key: 'Escape' });
  assert.equal(burger.getAttribute('aria-expanded'), 'false');
});

test('a desktop drop-down opens at once and closes 300ms after the pointer leaves', () => {
  const { menu, item, toggle, timers } = load({ desktop: true });
  menu.initDropdowns();
  item.fire('pointerenter', { pointerType: 'mouse' });
  assert.equal(timers.at(-1).ms, 0);
  timers.at(-1).fn();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  item.fire('pointerleave', { pointerType: 'mouse' });
  assert.equal(timers.at(-1).ms, 300);
  timers.at(-1).fn();
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
});
