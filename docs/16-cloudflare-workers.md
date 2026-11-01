# Hosting on Cloudflare Workers

The website is served by Cloudflare Workers static assets, with one Worker script in front of
`/api/*`. This is the active deployment runbook. It replaces the Vercel setup and the Cloudflare Pages steps in
[09-deployment.md](09-deployment.md), kept for history.

One rule: **rehearse on workers.dev, pass the checks there, and only then touch the real domain.**

## Shape

| Piece               | Where                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker config       | `wrangler.jsonc`. Top level is the rehearsal (`sko-website` on workers.dev); `env.production` is `sko-website-production` on `www.samatapheapkhnom.org`.                                                                                                                                                                  |
| Worker script       | `worker/index.ts`. Only `/api/*` reaches it (`assets.run_worker_first`). It answers `/api/contact` through `functions/api/contact.ts` and hands everything else back to static assets.                                                                                                                                        |
| Static site         | `dist/`, built by `npm run build`. Missing pages get the nearest `404.html`; `scripts/not-found.mjs` copies the Khmer page to `dist/km/404.html` so `/km/*` misses are Khmer.                                                                                                                                                 |
| Headers and caching | `public/_headers`. Applies to static responses only; the Worker sets its own headers on `/api/*`.                                                                                                                                                                                                                             |
| Rate limiting       | KV binding `RATE_LIMIT_KV`, one namespace per environment (IDs in `wrangler.jsonc`). Best effort, fails open; Turnstile is the control that fails closed.                                                                                                                                                                     |
| Build-time values   | `PUBLIC_*` variables. Locally in `.env`; in CI as repository variables. `PUBLIC_DEPLOYMENT_ENV` is always set explicitly.                                                                                                                                                                                                     |
| Runtime values      | `PUBLIC_DEPLOYMENT_ENV` and `CONTACT_ENABLED` are plain `vars` in `wrangler.jsonc`. Everything else is a Wrangler secret: `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_TO_EMAIL`, `PARTNER_TO_EMAIL`. Locally, `.dev.vars`; when that file is absent `wrangler dev` falls back to `.env` and `.env.local`. |

`compatibility_date` is pinned to the date of the workerd build that ships with the installed Wrangler.
Bump it when Wrangler is upgraded; a date newer than the local runtime makes `wrangler dev` refuse to start.

Trailing slashes: Astro writes `about/index.html` and Workers' default `auto-trailing-slash` serves it
at `/about/`, redirecting `/about` once. Do not change either side alone.

## Commands

| Command                                          | What it does                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                  | The one command: tests, typecheck, build with CSP and structural checks. CI runs it; nothing deploys unless it passes.                                  |
| `npm run preview`                                | Builds, then serves `dist/` with the Worker under `wrangler dev`. The honest local preview; the form endpoint exists only here, not under `astro dev`.  |
| `npx wrangler deploy --dry-run --env production` | Validates the production config and bundle without deploying.                                                                                           |
| `npm run deploy:rehearsal`                       | Deploys the top-level environment to workers.dev. The empty `--env ""` is deliberate: once a named environment exists Wrangler needs it.                |
| `npm run deploy:production`                      | Deploys `env.production` from your machine. Normally Workers Builds does this on every push to `main`.                                                  |
| `npm run check:edge -- <base-url>`               | Live checks: routes, both 404 pages, headers, caching, API behaviour, indexing state. Add `--indexable` on the day production stops shipping `noindex`, and `--expect-build` straight after deploying `dist/` (the Workers Builds deploy command does). The production Worker's cron runs the same checks hourly. |
| `npx wrangler versions list --env production`    | Deployed versions.                                                                                                                                      |
| `npx wrangler rollback --env production`         | Restores the previous Worker and its files. It does not undo DNS, Redirect Rules, secrets or KV contents.                                               |
| `npx wrangler secret put NAME --env production`  | Sets a runtime secret. A person runs this from their own terminal.                                                                                      |

## Rehearsal (workers.dev)

1. Build in preview mode with the rehearsal's own URL as `PUBLIC_SITE_URL`:
   `PUBLIC_DEPLOYMENT_ENV=preview PUBLIC_SITE_URL=https://sko-website.<subdomain>.workers.dev npm run check`
2. `npm run deploy:rehearsal`. Note the URL it prints.
3. Set the runtime secrets on the rehearsal with `npx wrangler secret put NAME` (no `--env`). Test values are fine; `CONTACT_ENABLED` is `false` in the config so nothing delivers.
4. Add the workers.dev hostname to the Turnstile widget (Cloudflare dashboard → Turnstile).
5. `npm run check:edge -- https://sko-website.<subdomain>.workers.dev` must be all green, and the
   page must not be indexable (preview builds emit `noindex` and a disallow-all robots file).
6. Walk the real journeys on a phone and a desktop.

## Cutover to the domain

The zone is already on Cloudflare nameservers. A person does the dashboard steps.

1. **Free the hostname.** Delete the `www` CNAME that points at Vercel. Wrangler refuses to create a
   custom domain over an existing record.
2. **Deploy production.** `npm run deploy:production` (or the deploy workflow). Wrangler creates the
   custom domain, its DNS record and its certificate.
3. **Apex placeholder.** DNS → add `AAAA`, name `@`, content `100::`, Proxied. It never receives
   traffic; it lets Cloudflare answer for the apex. If an apex record exists, switch it to Proxied.
4. **Apex to www.** Rules → Redirect Rules → create. Wildcard pattern, request URL
   `https://samatapheapkhnom.org/*`, target `https://www.samatapheapkhnom.org/${1}`, 301,
   preserve query string. Ignore the built-in template; it points the wrong way.
5. SSL/TLS → turn on **Always Use HTTPS**.
6. Verify from the authoritative server, not the local resolver:
   `dig +short A www.samatapheapkhnom.org @hadlee.ns.cloudflare.com`, then
   `curl -sI https://www.samatapheapkhnom.org/` shows `server: cloudflare`,
   `curl -sI "https://samatapheapkhnom.org/x/?q=1"` is a 301 to the www URL, and
   `npm run check:edge -- https://www.samatapheapkhnom.org` passes.
7. Perform the one real business action once forms are enabled: submit each form, confirm delivery.

## Domain move (October 2026)

The site moved from `www.sko-samatapheapkhnom.org` to `www.samatapheapkhnom.org`.

- **New zone.** The apex `A` record stays on the cPanel host (15.235.164.97) because mail,
  webmail and the SPF `+a` depend on it. Do not touch `mail`, `MX`, SPF or DKIM. A Redirect Rule
  sends the apex to `https://www.samatapheapkhnom.org/${1}` before it reaches cPanel, except
  `/.well-known/`, `/webmail`, `/cpanel` and `/whm`, which the cPanel host still answers.
- **Old zone.** Kept, and kept registered. One Redirect Rule sends every path on the apex and
  `www` to the same path on `https://www.samatapheapkhnom.org`, query kept, in one 301. `www`
  is a proxied `AAAA 100::` placeholder so Cloudflare answers for it. The Resend records there
  are untouched until sending moves to the new domain.

## Deploying from CI

After cutover nobody deploys from a laptop.

- A person creates the API token: My Profile → API Tokens → template **Edit Cloudflare Workers**,
  zone `samatapheapkhnom.org` included. Use the value labelled API Token, never the Global API
  Key. Store it with `gh secret set CLOUDFLARE_API_TOKEN`; the account ID goes in
  `CLOUDFLARE_ACCOUNT_ID`.
- Public build values are repository variables: `PUBLIC_SITE_URL`, `PUBLIC_CONTENT_SOURCE`,
  `PUBLIC_CONTACT_ENABLED`, `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_CF_ANALYTICS_TOKEN`,
  `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, `PUBLIC_SANITY_API_VERSION`.
- Deploys run on Cloudflare Workers Builds, not GitHub Actions (Actions stopped running on the org's
  free plan in October 2026). Set up once in the dashboard: Workers & Pages →
  `sko-website-production` → Settings → Builds → Connect the repository, production branch `main`.
  - Build command `npm ci && npm run check`
  - Deploy command
    `npx wrangler deploy --env production && npm run check:edge -- https://www.samatapheapkhnom.org --expect-build`
  - Build variables: `PUBLIC_DEPLOYMENT_ENV=production` plus every repository variable above.
  - A failed live check fails the build but does not roll back; roll back by hand (below).
- `.github/workflows/deploy.yml` is now a manual fallback with automatic rollback, run from the
  Actions tab when Actions is available.

## Cron jobs

The production Worker runs these itself (`worker/scheduled.ts`, schedules in `wrangler.jsonc`). The
rehearsal runs none.

| Schedule (UTC)  | Job                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------- |
| `15 * * * *`    | Uptime: the `check:edge` checks against `SITE_URL`.                                          |
| `45 * * * *`    | Content sync (below).                                                                        |
| `0 19 * * *`    | Nightly rebuild through the deploy hook, 02:00 Asia/Phnom_Penh, so expired job posts drop off. |

A failing job throws, so it shows as an error under the Worker's Logs, and emails `ALERT_TO_EMAIL`
through Resend once that secret and the Resend secrets are set. Secrets, set from your own
terminal with `npx wrangler secret put <NAME> --env production`:

- `DEPLOY_HOOK_URL`: Settings → Builds → Deploy Hooks → create one for `main`.
- `ALERT_TO_EMAIL`: who hears about failures.

Run a job locally: `npx wrangler dev --env production`, then
`curl -X POST "http://localhost:8787/cdn-cgi/local/explorer/api/local/scheduled?worker=sko-website-production" -H 'Content-Type: application/json' -d '{"cron":"15 * * * *"}'`.

## Publishing from the Studio

The site reads Sanity at build time, so a publish reaches the live site only through a deploy. A
Sanity webhook calls the Workers Builds deploy hook on every publish. A person sets it up once:

- Deploy hook: Workers & Pages → `sko-website-production` → Settings → Builds → Deploy Hooks →
  create one for `main`. The URL is the credential; keep it out of the repository.
- Webhook "Rebuild site on publish": sanity.io/manage → project `xm91vtfk` → API → Webhooks.
  - URL: the deploy hook URL; method POST; no headers.
  - Dataset `production`; trigger on create, update and delete; drafts and versions off.
- Check: publish any small edit, and a build appears under the Worker's Builds tab within seconds.
- Delivery log: `npx sanity hook logs "Rebuild site on publish"` from `studio/`. A 204 is a
  delivered publish.
- Safety net: the hourly content sync cron. If a publish is 10 minutes old and the live Worker
  version predates it, it calls the deploy hook and fails, which alerts. That means the webhook
  needs attention. If it already called the hook for that publish and the site is still behind, it
  reports the failed build instead of retrying. It remembers that in `RATE_LIMIT_KV` under
  `cron:content-sync:triggered`. Deletions are not detected; the nightly rebuild covers them.
- After a rollback the live version is older, so the next content sync rebuilds `main` if anything
  was published since. Fix or revert the bad commit before rolling back.

Workers Builds skips a hook call when a build from an earlier call has not started yet, so a burst
of publishes builds once or twice, not once per edit. Until `PUBLIC_CONTENT_SOURCE` is `sanity` those runs
still build from fixtures, harmlessly.

To seed an empty dataset from the fixtures, see `scripts/sanity-seed.mjs`.

## Rollback

Workers Builds does not roll back: a failed live check fails the build and leaves the new version
serving. Only the manual Deploy workflow rolls back automatically, when Actions is available.

Manual: `npx wrangler rollback --env production`, confirm with `check:edge`, redeploy the current
version. Rollback restores files and code only: DNS, Redirect Rules, secrets and KV contents are
unaffected.

## Enabling the contact form (later)

Requires, in order: the sending domain verified in Resend (SPF and DKIM records in the zone), the
production Turnstile widget listing `www.samatapheapkhnom.org`, the five secrets set on
`env.production`, `PUBLIC_CONTACT_ENABLED=true` at build time and `CONTACT_ENABLED` flipped to
`"true"` in `wrangler.jsonc` for production. Then submit both forms on the live site and confirm
each lands in the right inbox and not in spam.

## Automation and remaining ownership

- The Sanity publish webhook must point at the Workers Builds deploy hook (Publishing from the
  Studio, above).
- Nightly rebuild, hourly uptime and content sync run on the Worker's cron (Cron jobs, above). A
  local run of the uptime job passed 28/28 checks on 2026-10-21.
- Move the zone and Worker to an SKO-owned Cloudflare account.

## Launch record

|                      |                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cut over             | 21 September 2026, about 13:45 Asia/Phnom_Penh                                                                                                     |
| Source               | `main` at merge commit 445d403 (PR #5)                                                                                                             |
| Worker version       | `f1938c64-3155-4870-9ec4-89dffff0fa2e` on `sko-website-production`, deployed by Kimchhun from a laptop because CI was not yet wired                |
| CI deploys           | Active since 10:05 UTC the same day. First CI deploy: version `9ff8cdd6-22bb-446b-9860-303455f271c8`, 28/28 live checks from the runner            |
| Verified             | `check:edge` 28/28 against `https://www.sko-samatapheapkhnom.org`; apex → www is one 301 with path and query preserved; HTTP → HTTPS on both hosts |
| Rollback rehearsed   | Yes, same day: `wrangler rollback` to `f1938c64`, confirmed live, rolled forward to `9ff8cdd6`. Round trip about 22 seconds                        |
| Vercel               | Both projects deleted the same day. `vercel.json` and the Vercel test removed in PR #9                                                             |
| State                | Fixture content, `noindex`, forms disabled. Identical posture to the Vercel site it replaced                                                       |
| Accepted limitations | Cloudflare account is a personal one, not SKO's; no uptime check yet                                                                               |
| Review by            | 21 October 2026, or at the first content launch, whichever comes first                                                                             |

Still open after launch, in order: add the production hostname to the Turnstile widget; set the five
production secrets; add an uptime check with a named recipient; move the zone and Worker to an
SKO-owned account before the content launch.
