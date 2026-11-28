import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const load = async (path, modules = {}) => {
  const source = await readFile(new URL(`../src/lib/${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    URL,
    require: (name) => {
      if (name in modules) return modules[name];
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return module.exports;
};

const hrefs = await load("safe-href.ts");
const { renderSpans } = await load("portable-text.ts", {
  "./i18n/utils": {},
  "./sanity/image": {},
  "./safe-href": hrefs,
});

const unsafe = [
  "javascript:alert(1)",
  " JavaScript:alert(1)",
  "java\tscript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "//evil.example/",
  "/\\evil.example/",
  "https://exa mple.com\n",
  "",
  null,
  undefined,
];

test("safeHref allows only site paths, fragments and http(s), plus opted-in mailto/tel", () => {
  for (const href of unsafe) assert.equal(hrefs.safeHref(href), null, String(href));
  for (const href of ["/about/", "#team", "https://example.org/a?b=1", "http://example.org"]) {
    assert.equal(hrefs.safeHref(href), href);
  }
  assert.equal(hrefs.safeHref("  /about/  "), "/about/");
  assert.equal(hrefs.safeHref("mailto:info@example.org"), null);
  assert.equal(hrefs.safeHref("tel:+85512345678"), null);
  assert.equal(hrefs.safeHref("mailto:info@example.org", { mailto: true }), "mailto:info@example.org");
  assert.equal(hrefs.safeHref("tel:+85512345678", { tel: true }), "tel:+85512345678");
});

const block = (href) => ({
  _type: "block",
  markDefs: [{ _key: "l", _type: "link", href }],
  children: [{ _type: "span", text: "Read more", marks: ["l"] }],
});

test("Portable Text never renders a javascript: or data: link, only its escaped text", () => {
  for (const href of unsafe) {
    const html = renderSpans(block(href));
    assert.equal(html, "Read more", String(href));
    assert.doesNotMatch(html, /<a\b/);
  }
});

test("Portable Text keeps safe links, marking only http(s) ones as external", () => {
  assert.equal(renderSpans(block("/about/")), '<a href="/about/">Read more</a>');
  assert.match(
    renderSpans(block("https://example.org/?a=1&b=2")),
    /^<a href="https:\/\/example\.org\/\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">/,
  );
  assert.equal(
    renderSpans(block("mailto:info@example.org")),
    '<a href="mailto:info@example.org">Read more</a>',
  );
});
