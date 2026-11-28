import assert from "node:assert/strict";
import test from "node:test";
import {
  edgeRow,
  formatRows,
  parseSanityUsers,
  presenceRows,
  productionPolicyRow,
  rulesetRow,
  sanityRows,
  workerSecretRows,
} from "../scripts/check-config.mjs";

test("presence rows report names and never include values", () => {
  assert.deepEqual(
    presenceRows(
      [{ name: "ONE", value: "private-value" }],
      ["ONE", "TWO"],
      "GitHub variable",
    ),
    [
      { name: "GitHub variable ONE", status: "PASS", detail: "" },
      { name: "GitHub variable TWO", status: "MISSING", detail: "" },
    ],
  );
  assert.ok(
    !formatRows(
      workerSecretRows(
        [{ name: "RESEND_API_KEY", value: "private-value" }],
        "production",
      ),
    ).includes("private-value"),
  );
});

test("production checks the cron secrets; the rehearsal, which runs no crons, does not", () => {
  const set = [
    "TURNSTILE_SECRET_KEY",
    "RESEND_API_KEY",
    "MAIL_FROM",
    "CONTACT_TO_EMAIL",
    "PARTNER_TO_EMAIL",
  ].map((name) => ({ name }));
  const missing = (environment) =>
    workerSecretRows(set, environment)
      .filter(({ status }) => status !== "PASS")
      .map(({ name }) => name);
  assert.deepEqual(missing("production"), [
    "Cloudflare production DEPLOY_HOOK_URL",
    "Cloudflare production ALERT_TO_EMAIL",
  ]);
  assert.deepEqual(missing("rehearsal"), []);
});

test("ruleset and Production policy require an active default-branch rule and only main", () => {
  assert.equal(
    rulesetRow(
      [
        {
          target: "branch",
          enforcement: "active",
          conditions: { ref_name: { include: ["~DEFAULT_BRANCH"] } },
        },
      ],
      "main",
    ).status,
    "PASS",
  );
  assert.equal(
    rulesetRow(
      [
        {
          target: "branch",
          enforcement: "disabled",
          conditions: { ref_name: { include: ["~DEFAULT_BRANCH"] } },
        },
      ],
      "main",
    ).status,
    "MISSING",
  );
  const environment = {
    deployment_branch_policy: { custom_branch_policies: true },
  };
  assert.equal(
    productionPolicyRow(environment, [{ name: "main" }]).status,
    "PASS",
  );
  assert.equal(
    productionPolicyRow(environment, [{ name: "main" }, { name: "preview" }])
      .status,
    "MISSING",
  );
});

test("Sanity output reports public visibility, no tokens, constrained CORS, webhook and member roles", () => {
  const users = [
    "┌────┬──────┬───────────────┐",
    "│ ID │ Name │ Roles         │",
    "├────┼──────┼───────────────┤",
    "│ 1  │ Jane │ Administrator │",
    "└────┴──────┴───────────────┘",
  ].join("\n");
  assert.deepEqual(parseSanityUsers(users), {
    count: 1,
    roles: ["Administrator: 1"],
  });
  const rows = sanityRows({
    visibility: "public\n",
    tokens: [],
    cors: "http://localhost:3333\nhttps://sko-studio.sanity.studio\n",
    hooks: "Name: Rebuild site on publish\n",
    users,
  });
  assert.deepEqual(
    rows.map(({ status }) => status),
    ["PASS", "PASS", "PASS", "PASS", "PASS"],
  );
  assert.equal(
    sanityRows({
      visibility: "private",
      tokens: [{}],
      cors: "*\n",
      hooks: "",
      users,
    }).filter(({ status }) => status === "MISSING").length,
    4,
  );
});

test("live check row uses the script's summary counts", () => {
  assert.deepEqual(edgeRow("28/28 checks passed against https://example.org"), {
    name: "Live edge checks",
    status: "PASS",
    detail: "28/28 passed",
  });
  assert.equal(
    edgeRow("27/28 checks passed against https://example.org").status,
    "MISSING",
  );
});
