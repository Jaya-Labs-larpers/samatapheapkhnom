import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const jsonc = (text) =>
  JSON.parse(text.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
const config = jsonc(await readFile(new URL("wrangler.jsonc", root), "utf8"));
const production = config.env.production;

test("static assets serve dist with the nearest 404 page and the Worker only in front of /api/", () => {
  assert.equal(config.main, "worker/index.ts");
  assert.equal(config.assets.directory, "./dist");
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.not_found_handling, "404-page");
  assert.deepEqual(config.assets.run_worker_first, ["/api/*"]);
  assert.equal(
    config.assets.html_handling,
    undefined,
    "default auto-trailing-slash matches Astro directory output",
  );
});

test("the rehearsal stays on workers.dev in preview mode and never delivers mail", () => {
  assert.equal(config.workers_dev, true);
  assert.equal(config.vars.PUBLIC_DEPLOYMENT_ENV, "preview");
  assert.notEqual(config.vars.CONTACT_ENABLED, "true");
  assert.equal(config.routes, undefined);
});

test("production is a separate Worker on the canonical host with its own KV namespace", () => {
  assert.equal(production.name, "sko-website-production");
  assert.equal(production.workers_dev, false);
  assert.equal(production.preview_urls, false);
  assert.deepEqual(production.routes, [
    { pattern: "www.samatapheapkhnom.org", custom_domain: true },
  ]);
  assert.equal(production.vars.PUBLIC_DEPLOYMENT_ENV, "production");
  const binding = (env) =>
    env.kv_namespaces.find(
      (namespace) => namespace.binding === "RATE_LIMIT_KV",
    );
  assert.ok(binding(config)?.id);
  assert.ok(binding(production)?.id);
  assert.notEqual(
    binding(config).id,
    binding(production).id,
    "rehearsal and production must not share a counter",
  );
  const publicVars = [
    "PUBLIC_DEPLOYMENT_ENV",
    "CONTACT_ENABLED",
    "SITE_URL",
    "SANITY_PROJECT_ID",
    "SANITY_DATASET",
    "SANITY_API_VERSION",
  ];
  for (const key of Object.keys({ ...config.vars, ...production.vars })) {
    assert.ok(publicVars.includes(key), `${key} is not a secret-safe var`);
  }
});

test("only production runs the cron jobs, on the schedules worker/scheduled.ts handles", async () => {
  assert.deepEqual(config.triggers.crons, []);
  const source = await readFile(new URL("worker/scheduled.ts", root), "utf8");
  const handled = [...source.matchAll(/^\s+\w+: '([^']*\*[^']*)',$/gm)].map((m) => m[1]);
  assert.deepEqual([...production.triggers.crons].sort(), handled.sort());
  assert.equal(production.vars.SITE_URL, "https://www.samatapheapkhnom.org");
  assert.equal(production.version_metadata.binding, "CF_VERSION_METADATA");
});

test("_headers carries the security and cache policy, with immutable only on hashed assets", async () => {
  const text = await readFile(new URL("public/_headers", root), "utf8");
  const blocks = new Map();
  let current;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      current = [];
      blocks.set(line.trim(), current);
    } else {
      const [name, ...value] = line.trim().split(":");
      current.push([name.trim().toLowerCase(), value.join(":").trim()]);
    }
  }
  const all = Object.fromEntries(blocks.get("/*"));
  assert.equal(all["x-frame-options"], "DENY");
  assert.equal(all["x-content-type-options"], "nosniff");
  assert.equal(all["referrer-policy"], "strict-origin-when-cross-origin");
  assert.equal(all["cross-origin-opener-policy"], "same-origin");
  assert.match(all["permissions-policy"], /camera=\(\)/);
  assert.equal(all["strict-transport-security"], "max-age=31536000");
  assert.equal(all["content-security-policy"], "frame-ancestors 'none'");
  assert.equal(
    all["cache-control"],
    undefined,
    "HTML must not inherit an asset cache policy",
  );
  assert.match(
    Object.fromEntries(blocks.get("/_astro/*"))["cache-control"],
    /immutable/,
  );
  for (const [pattern, headers] of blocks) {
    if (pattern === "/_astro/*") continue;
    assert.ok(
      !headers.some(([, value]) => /immutable/.test(value)),
      `${pattern} must not be immutable`,
    );
  }
});

test("the Khmer 404 page is copied to where the nearest-404 lookup finds it", async () => {
  const { copyLocalizedNotFound } = await import("../scripts/not-found.mjs");
  const dist = await mkdtemp(join(tmpdir(), "sko-dist-"));
  await mkdir(join(dist, "km", "404"), { recursive: true });
  await writeFile(
    join(dist, "km", "404", "index.html"),
    '<html lang="km"></html>',
  );
  assert.deepEqual(await copyLocalizedNotFound(dist), ["km/404.html"]);
  assert.equal(
    await readFile(join(dist, "km", "404.html"), "utf8"),
    '<html lang="km"></html>',
  );
  await assert.rejects(
    copyLocalizedNotFound(await mkdtemp(join(tmpdir(), "sko-empty-"))),
  );
});

test("_redirects sends the retired donate, careers, partner and volunteer URLs to contact with a 301", async () => {
  const text = await readFile(new URL("public/_redirects", root), "utf8");
  const rules = new Map();
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [from, to, status] = line.split(/\s+/);
    rules.set(from, { to, status: Number(status) });
  }
  for (const [from, to] of [
    ["/donate", "/contact/"],
    ["/donate/", "/contact/"],
    ["/km/donate", "/km/contact/"],
    ["/km/donate/", "/km/contact/"],
    ["/careers", "/contact/"],
    ["/careers/*", "/contact/"],
    ["/km/careers", "/km/contact/"],
    ["/km/careers/*", "/km/contact/"],
    ["/partner-with-us", "/contact/?topic=partner"],
    ["/partner-with-us/", "/contact/?topic=partner"],
    ["/km/partner-with-us", "/km/contact/?topic=partner"],
    ["/km/partner-with-us/", "/km/contact/?topic=partner"],
    ["/volunteer", "/contact/?topic=volunteer"],
    ["/volunteer/", "/contact/?topic=volunteer"],
    ["/km/volunteer", "/km/contact/?topic=volunteer"],
    ["/km/volunteer/", "/km/contact/?topic=volunteer"],
  ]) {
    assert.deepEqual(rules.get(from), { to, status: 301 }, from);
  }
  for (const [from, { to }] of rules) {
    assert.match(
      to,
      /^\/(km\/)?contact\/(\?topic=[a-z]+)?$/,
      `${from} must land on a contact page`,
    );
    assert.ok(
      from.startsWith("/km/") === to.startsWith("/km/"),
      `${from} must keep its language`,
    );
  }
});
