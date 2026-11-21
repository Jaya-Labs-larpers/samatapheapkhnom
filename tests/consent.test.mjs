import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/consent.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

const context = { exports: {} };
vm.runInNewContext(compiled, context);
const consent = context.exports;

const throwing = () => {
  throw new Error("blocked");
};

test("the storage key stays the one earlier visitors already have", () => {
  assert.equal(consent.CONSENT_KEY, "sko-analytics-choice");
});

test("a saved choice is read back", () => {
  for (const value of ["accepted", "declined"]) {
    assert.equal(consent.readChoice({ getItem: () => value }), value);
  }
});

test("anything else reads as no choice yet", () => {
  assert.equal(consent.readChoice({ getItem: () => null }), null);
  assert.equal(consent.readChoice({ getItem: () => "yes" }), null);
  assert.equal(consent.readChoice({ getItem: throwing }), null);
  assert.equal(consent.readChoice(undefined), null);
  assert.equal(consent.readChoice(null), null);
});

test("saving survives blocked storage", () => {
  const saved = [];
  consent.saveChoice({ setItem: (k, v) => saved.push([k, v]) }, "accepted");
  assert.deepEqual(saved, [["sko-analytics-choice", "accepted"]]);
  assert.doesNotThrow(() => consent.saveChoice({ setItem: throwing }, "declined"));
  assert.doesNotThrow(() => consent.saveChoice(undefined, "declined"));
});

test("only Google Analytics cookies are picked out", () => {
  assert.deepEqual(
    [...consent.analyticsCookieNames("_ga=1; _ga_ABC123=2; theme=x; _gax=3")],
    ["_ga", "_ga_ABC123"],
  );
  assert.deepEqual([...consent.analyticsCookieNames("")], []);
});

function fakeDocument(cookie) {
  const writes = [];
  return {
    writes,
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      writes.push(value);
    },
  };
}

test("analytics cookies are expired on the host and every parent domain", () => {
  const doc = fakeDocument("_ga=1; _ga_X=2; theme=dark");
  consent.clearAnalyticsCookies(doc, "www.sko.org.kh");
  const expected = [];
  for (const name of ["_ga", "_ga_X"]) {
    const base = `${name}=; Max-Age=0; path=/`;
    expected.push(
      base,
      `${base}; domain=www.sko.org.kh`,
      `${base}; domain=sko.org.kh`,
      `${base}; domain=org.kh`,
    );
  }
  assert.deepEqual(doc.writes, expected);
});

test("a single-label host gets no domain attribute", () => {
  const doc = fakeDocument("_ga=1");
  consent.clearAnalyticsCookies(doc, "localhost");
  assert.deepEqual(doc.writes, ["_ga=; Max-Age=0; path=/"]);
});
