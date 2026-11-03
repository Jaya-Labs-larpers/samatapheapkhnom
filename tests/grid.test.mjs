import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/grid.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports });
const { cardGridCols, cardImageSizes } = module.exports;

test("four cards wait for xl before sharing a row", () => {
  assert.match(cardGridCols(4), /sm:grid-cols-2 xl:grid-cols-4$/);
  assert.doesNotMatch(cardGridCols(4), /lg:grid-cols/);
});

test("five cards fall to three-and-two, never five across", () => {
  assert.match(cardGridCols(5), /lg:grid-cols-3$/);
});

test("one or two cards stay at pairs", () => {
  assert.equal(cardGridCols(1), cardGridCols(2));
  assert.doesNotMatch(cardGridCols(2), /lg:|xl:/);
});

test("multiples of three prefer thirds over quarters", () => {
  assert.match(cardGridCols(12), /lg:grid-cols-3$/);
  assert.match(cardGridCols(8), /xl:grid-cols-4$/);
});

test("sizes follow the same layout as the grid", () => {
  assert.match(cardImageSizes(4), /^\(min-width: 80rem\) 17rem/);
  assert.match(cardImageSizes(3), /\(min-width: 64rem\) 33vw/);
  assert.match(cardImageSizes(1), /^\(min-width: 75rem\) 36rem/);
});
