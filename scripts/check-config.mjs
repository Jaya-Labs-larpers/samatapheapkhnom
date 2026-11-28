import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const runFile = promisify(execFile);
const repository = "Jaya-Labs-larpers/SKO---NGO-website";
const projectId = "xm91vtfk";
const siteUrl = "https://www.samatapheapkhnom.org";
const variableNames = [
  "PUBLIC_SITE_URL",
  "PUBLIC_CONTENT_SOURCE",
  "PUBLIC_CONTACT_ENABLED",
  "PUBLIC_TURNSTILE_SITE_KEY",
  "PUBLIC_CF_ANALYTICS_TOKEN",
  "PUBLIC_SANITY_PROJECT_ID",
  "PUBLIC_SANITY_DATASET",
  "PUBLIC_SANITY_API_VERSION",
];
const githubSecretNames = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"];
const workerSecretNames = [
  "TURNSTILE_SECRET_KEY",
  "RESEND_API_KEY",
  "MAIL_FROM",
  "CONTACT_TO_EMAIL",
  "PARTNER_TO_EMAIL",
];
const cronSecretNames = ["DEPLOY_HOOK_URL", "ALERT_TO_EMAIL"];

export function workerSecretNamesFor(environment) {
  return environment === "production"
    ? [...workerSecretNames, ...cronSecretNames]
    : workerSecretNames;
}

export function row(name, ok, detail = "") {
  return { name, status: ok ? "PASS" : "MISSING", detail };
}

export function skipped(name, detail = "tool unavailable or not logged in") {
  return { name, status: "SKIPPED", detail };
}

export function formatRows(rows) {
  const width = Math.max(
    "Setting".length,
    ...rows.map(({ name }) => name.length),
  );
  return [
    `${"Setting".padEnd(width)}  Status   Detail`,
    `${"-".repeat(width)}  -------  ------`,
    ...rows.map(({ name, status, detail }) =>
      `${name.padEnd(width)}  ${status.padEnd(7)}  ${detail}`.trimEnd(),
    ),
  ].join("\n");
}

export function presenceRows(entries, names, prefix) {
  const present = new Set(entries.map(({ name }) => name));
  return names.map((name) => row(`${prefix} ${name}`, present.has(name)));
}

export function rulesetRow(rulesets, defaultBranch) {
  const found = rulesets.some(
    ({ target, enforcement, conditions }) =>
      target === "branch" &&
      enforcement === "active" &&
      (conditions?.ref_name?.include ?? []).some(
        (ref) =>
          ref === "~DEFAULT_BRANCH" || ref === `refs/heads/${defaultBranch}`,
      ),
  );
  return row("GitHub default branch ruleset", found);
}

export function productionPolicyRow(environment, policies) {
  const custom = environment.deployment_branch_policy?.custom_branch_policies;
  const names = policies.map(({ name }) => name);
  return row(
    "GitHub Production branch policy",
    custom === true && names.length === 1 && names[0] === "main",
    custom
      ? names.join(", ") || "no allowed branches"
      : "custom policy disabled",
  );
}

export function workerSecretRows(entries, environment) {
  return presenceRows(
    entries,
    workerSecretNamesFor(environment),
    `Cloudflare ${environment}`,
  );
}

export function parseSanityUsers(output) {
  const plain = output.replace(/\x1b\[[0-9;]*m/g, "");
  const cells = plain
    .split("\n")
    .filter((line) => line.startsWith("│"))
    .map((line) =>
      line
        .split("│")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  const roleIndex = cells[0]?.findIndex((cell) => cell === "Roles");
  if (roleIndex === undefined || roleIndex < 0)
    throw new Error("unrecognized Sanity users output");
  const roles = cells.slice(1).map((entry) => entry[roleIndex]);
  const counts = Object.entries(
    roles.reduce(
      (result, role) => ({ ...result, [role]: (result[role] ?? 0) + 1 }),
      {},
    ),
  );
  return {
    count: roles.length,
    roles: counts.map(([role, count]) => `${role}: ${count}`),
  };
}

export function sanityRows({ visibility, tokens, cors, hooks, users }) {
  const origins = cors.trim().split(/\r?\n/).filter(Boolean).sort();
  const allowed = [
    "http://localhost:3333",
    "https://sko-studio.sanity.studio",
  ].sort();
  const members = parseSanityUsers(users);
  return [
    row("Sanity production dataset public", visibility.trim() === "public"),
    row(
      "Sanity API tokens empty",
      Array.isArray(tokens) && tokens.length === 0,
      `${tokens.length} tokens`,
    ),
    row(
      "Sanity CORS origins",
      JSON.stringify(origins) === JSON.stringify(allowed),
      `${origins.length} origins${origins.includes("*") ? ", wildcard present" : ""}`,
    ),
    row(
      "Sanity publish webhook",
      hooks.includes("Name: Rebuild site on publish"),
    ),
    row(
      "Sanity members",
      members.count > 0,
      `${members.count} member${members.count === 1 ? "" : "s"}; ${members.roles.join(", ")}`,
    ),
  ];
}

export function edgeRow(output) {
  const match = /\b(\d+)\/(\d+) checks passed\b/.exec(output);
  return row(
    "Live edge checks",
    Boolean(match) && match[1] === match[2],
    match ? `${match[1]}/${match[2]} passed` : "result unavailable",
  );
}

async function command(file, args) {
  const { stdout } = await runFile(file, args, {
    timeout: 60000,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

async function jsonCommand(file, args) {
  return JSON.parse(await command(file, args));
}

async function githubRows() {
  const rows = [];
  let repositoryInfo;
  try {
    repositoryInfo = await jsonCommand("gh", ["api", `repos/${repository}`]);
  } catch {
    return [skipped("GitHub repository access")];
  }

  try {
    const variables = await jsonCommand("gh", [
      "variable",
      "list",
      "--json",
      "name",
    ]);
    rows.push(...presenceRows(variables, variableNames, "GitHub variable"));
  } catch {
    rows.push(
      ...variableNames.map((name) => skipped(`GitHub variable ${name}`)),
    );
  }

  try {
    const secrets = await jsonCommand("gh", [
      "api",
      `repos/${repository}/actions/secrets`,
    ]);
    rows.push(
      ...presenceRows(
        secrets.secrets ?? [],
        githubSecretNames,
        "GitHub secret",
      ),
    );
  } catch {
    rows.push(
      ...githubSecretNames.map((name) => skipped(`GitHub secret ${name}`)),
    );
  }

  try {
    const listed = await jsonCommand("gh", [
      "api",
      `repos/${repository}/rulesets`,
    ]);
    const details = await Promise.all(
      listed.map(({ id }) =>
        jsonCommand("gh", ["api", `repos/${repository}/rulesets/${id}`]),
      ),
    );
    rows.push(rulesetRow(details, repositoryInfo.default_branch));
  } catch {
    rows.push(skipped("GitHub default branch ruleset"));
  }

  try {
    await command("gh", ["api", `repos/${repository}/vulnerability-alerts`]);
    rows.push(row("GitHub Dependabot alerts", true));
  } catch (error) {
    rows.push(
      /404/.test(error.stderr ?? "")
        ? row("GitHub Dependabot alerts", false)
        : skipped("GitHub Dependabot alerts"),
    );
  }

  try {
    const environment = await jsonCommand("gh", [
      "api",
      `repos/${repository}/environments/Production`,
    ]);
    if (environment.deployment_branch_policy?.custom_branch_policies) {
      const response = await jsonCommand("gh", [
        "api",
        `repos/${repository}/environments/Production/deployment-branch-policies`,
      ]);
      rows.push(
        productionPolicyRow(environment, response.branch_policies ?? []),
      );
    } else {
      rows.push(productionPolicyRow(environment, []));
    }
  } catch {
    rows.push(skipped("GitHub Production branch policy"));
  }
  return rows;
}

async function cloudflareRows() {
  const rows = [];
  for (const [label, environment] of [
    ["production", "production"],
    ["rehearsal", ""],
  ]) {
    try {
      const secrets = await jsonCommand("npx", [
        "wrangler",
        "secret",
        "list",
        "--env",
        environment,
      ]);
      rows.push(...workerSecretRows(secrets, label));
    } catch {
      rows.push(
        ...workerSecretNamesFor(label).map((name) =>
          skipped(`Cloudflare ${label} ${name}`),
        ),
      );
    }
  }
  return rows;
}

async function sanityCommand(args) {
  const prefix = ["--prefix", "studio", "exec", "--", "sanity"];
  await command("npm", [
    ...prefix,
    ...args,
    "--help",
    "--project-id",
    projectId,
  ]);
  return command("npm", [...prefix, ...args, "--project-id", projectId]);
}

async function sanityCheckRows() {
  try {
    const [visibility, tokenOutput, cors, hooks, users] = await Promise.all([
      sanityCommand(["datasets", "visibility", "get", "production"]),
      sanityCommand(["tokens", "list", "--json"]),
      sanityCommand(["cors", "list"]),
      sanityCommand(["hooks", "list"]),
      sanityCommand(["users", "list", "--no-invitations", "--no-robots"]),
    ]);
    return sanityRows({
      visibility,
      tokens: JSON.parse(tokenOutput),
      cors,
      hooks,
      users,
    });
  } catch {
    return [
      "Sanity production dataset public",
      "Sanity API tokens empty",
      "Sanity CORS origins",
      "Sanity publish webhook",
      "Sanity members",
    ].map((name) => skipped(name));
  }
}

async function liveRows() {
  try {
    return [
      edgeRow(await command("node", ["scripts/check-edge.mjs", siteUrl])),
    ];
  } catch (error) {
    return [error.stdout ? edgeRow(error.stdout) : skipped("Live edge checks")];
  }
}

async function main() {
  const rows = [
    ...(await githubRows()),
    ...(await cloudflareRows()),
    ...(await sanityCheckRows()),
    ...(await liveRows()),
  ];
  console.log(formatRows(rows));
  if (rows.some(({ status }) => status === "MISSING")) process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
