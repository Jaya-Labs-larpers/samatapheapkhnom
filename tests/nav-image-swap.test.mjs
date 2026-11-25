import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/nav-image-swap.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function load() {
  const context = { exports: {}, Promise };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

function recorder() {
  const runs = [];
  const finishers = [];
  const run = (src) => {
    runs.push(src);
    return new Promise((resolve) => finishers.push(resolve));
  };
  const finishNext = async () => {
    finishers.shift()();
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { runs, run, finishNext };
}

test("latest request wins: requests made during a fade collapse to the newest", async () => {
  const { createSwapQueue } = load();
  const { runs, run, finishNext } = recorder();
  const request = createSwapQueue(run);
  request("a");
  request("b");
  request("c");
  await finishNext();
  await finishNext();
  assert.deepEqual(runs, ["a", "c"]);
});

test("same src twice is a no-op", async () => {
  const { createSwapQueue } = load();
  const { runs, run, finishNext } = recorder();
  const request = createSwapQueue(run);
  request("a");
  await finishNext();
  request("a");
  assert.deepEqual(runs, ["a"]);
});

test("returning to the shown image while another is pending cancels the pending one", async () => {
  const { createSwapQueue } = load();
  const { runs, run, finishNext } = recorder();
  const request = createSwapQueue(run);
  request("a");
  request("b");
  request("a");
  await finishNext();
  assert.deepEqual(runs, ["a"]);
});
