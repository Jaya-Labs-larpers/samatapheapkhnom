# Phase 6 — Deployment runbook

The site now runs on Cloudflare Workers static assets. Use [the Workers runbook](16-cloudflare-workers.md).
The Cloudflare Pages steps below are retained for reference, not as the active procedure. The service setup steps (Sanity, Turnstile,
Resend, analytics) still apply.

**Status: Phase 6 gate — prepared, awaiting the accounts and domain to execute.**

The repository has local verification and production readiness gates. Public launch still requires
approved content, production service configuration, and live checks. See
[the readiness review](12-deployment-readiness.md). Do not push or deploy to production until those gates pass.

Work through it in order — later steps depend on earlier ones. Content approval and live verification
are separate work, not a guaranteed short setup window.

---

## Before you start

Four things have been outstanding since Phase 1. Nothing here works without them:

| Needed                                                    | Why                                        |
| --------------------------------------------------------- | ------------------------------------------ |
| **A domain**, and access to its registrar                 | Steps 5 and 8                              |
| **A Git account that SKO owns**                           | Step 1 — see the warning below             |
| **The inbox addresses** for general and partner enquiries | Step 4                                     |
| **DNS control for the sending domain**                    | Step 8 — Resend needs SPF and DKIM records |

> **On account ownership.** Create the GitHub organisation and the Cloudflare, Sanity and Resend
> accounts under an **SKO-controlled email address**, not a personal one. An NGO website living in a
> departing volunteer's personal GitHub is a common and painful failure mode — recovering it later
> means proving ownership to three companies at once. Add a second SKO admin to each account today.

---

## 1. Git repository

Check the existing remote and repository ownership before adding or changing anything. Protect `main`
before enabling automatic production deployment: require the `verify`, `studio`, and `lighthouse`
jobs, reviewed pull requests, and no bypass pushes. Turn on Dependabot security updates. Work through
a reviewed branch; Cloudflare's Git integration does not wait for GitHub checks on an unrestricted push.
Branch protection is a dashboard setting and is not enforced by the workflow file alone.

## 2. Sanity project

```bash
cd studio
npx sanity login
npx sanity init --project-plan free
```

Choose **"Use the existing configuration"** when asked — the schemas are already written. Note the
**project ID**; you need it in step 4.

Then create the dataset as **public**:

```bash
npx sanity dataset create production --visibility public
```

Public is deliberate — see ADR-004 in `04-tech-decisions.md`. Every document in this dataset is
content intended for publication, and it removes the need for a token that could leak. It is only
safe because no beneficiary or child data is modelled; do not add any.

**Lock CORS** (Sanity → API → CORS origins). Delete the default wildcard, then add:

| Origin                                    | Credentials |
| ----------------------------------------- | ----------- |
| `http://localhost:3333`                   | **Yes**     |
| `https://<studio-hostname>.sanity.studio` | **Yes**     |

Add other authenticated Studio origins only when used. Website reads happen at build time and do
not require browser CORS. Set `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, and
`SANITY_STUDIO_HOSTNAME` for Studio. Automatic Studio updates are disabled in `deployment.autoUpdates`;
updates use the reviewed lockfile and must pass Studio checks.

Deploy the Studio:

```bash
SANITY_STUDIO_PROJECT_ID=<id> SANITY_STUDIO_HOSTNAME=sko npx sanity deploy
```

That publishes to `https://sko.sanity.studio` — free, and nothing for SKO to host or keep patched.

**Invite staff individually** (Sanity → Members). Give them the lowest role that lets them publish.
No shared logins — you want to know who changed what.

## 3. Cloudflare Pages project

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.

| Setting                | Value                                        |
| ---------------------- | -------------------------------------------- |
| Production branch      | `main`                                       |
| Framework preset       | None (`wrangler.toml` supplies the settings) |
| Build command          | `npm run build`                              |
| Build output directory | `dist`                                       |
| Node version           | set env var `NODE_VERSION` = `22`            |

Use a tested Node 22 release at least 22.12 (Sanity's minimum), consistently with `.nvmrc` and CI.
`npm run build` now includes CSP processing and structural checks. On Pages, builds of `main` are
production-gated; other branches are previews. Keep the production branch set to `main` or update
the repository's environment detection and tests when changing it.

`wrangler.toml` in the repo root already declares the output directory and compatibility date, so
the build settings are version-controlled rather than living only in the dashboard.

## 4. Environment variables

Settings → **Environment variables**. Set these for **Production** _and_ **Preview** separately —
Cloudflare does not copy between them, and a preview build with missing variables fails in ways that
look like code bugs.

**Public** (inlined into the browser bundle by design):

| Variable                    | Value                                                                 |
| --------------------------- | --------------------------------------------------------------------- |
| `PUBLIC_SITE_URL`           | `https://<your-domain>` (preview: the `*.pages.dev` URL)              |
| `PUBLIC_SANITY_PROJECT_ID`  | from step 2                                                           |
| `PUBLIC_SANITY_DATASET`     | `production`                                                          |
| `PUBLIC_SANITY_API_VERSION` | `2026-01-01`                                                          |
| `PUBLIC_TURNSTILE_SITE_KEY` | from step 6                                                           |
| `PUBLIC_CF_ANALYTICS_TOKEN` | from step 9                                                           |
| `PUBLIC_DEPLOYMENT_ENV`     | `production` for Production; `preview` for Preview                    |
| `PUBLIC_CONTENT_SOURCE`     | `sanity` for Production; fixtures allowed only for development/review |

**Secrets** — use the **Encrypt** option so they cannot be read back:

| Variable               | Value                     |
| ---------------------- | ------------------------- |
| `TURNSTILE_SECRET_KEY` | from step 6               |
| `RESEND_API_KEY`       | from step 8               |
| `MAIL_FROM`            | `noreply@<your-domain>`   |
| `CONTACT_TO_EMAIL`     | general enquiries inbox   |
| `PARTNER_TO_EMAIL`     | partnerships/grants inbox |

Production refuses localhost/example/Pages URLs, test Turnstile site keys, missing CMS settings,
missing essential published documents, unfinished markers, and missing donation QR/bank data. Do
not bypass this gate to get a first production deployment. Khmer pages that fall back to English
are listed as build warnings, not failures: the fallback is marked `lang="en"`, and staff fill in
the Khmer in Sanity.
`npm run build:production` exercises the gate locally. An intentionally configured preview remains
available before content is complete and uses `noindex` plus a disallowing robots file.

Use separate Preview credentials, a separate CMS review dataset, separate KV namespace and test
recipient inboxes; do not send preview enquiries to staff or spend production quotas. Public build
checks cannot prove that runtime secrets, account ownership, DNS or recipient delivery are correct.
For local Pages Functions put runtime settings in ignored `.dev.vars`, not just Astro's `.env`.

## 5. Custom domain and HTTPS

Pages project → **Custom domains** → **Set up a domain**.

- **If the domain is already on Cloudflare:** the DNS record is created for you.
- **If not:** either move the nameservers to Cloudflare (recommended — you get the WAF and analytics),
  or add the `CNAME` your registrar requires as shown.

Add both `<your-domain>` and `www.<your-domain>`, and set one to redirect to the other so the site
has a single canonical host. HTTPS is automatic; certificates issue within minutes and renew
themselves. Once it resolves, turn on **Always Use HTTPS**.

Review HSTS before enabling it at the edge. The repository already sends a one-year policy with
`includeSubDomains; preload`; verify all affected subdomains support HTTPS and decide whether a
conservative initial policy is needed. The header alone does not register a preload submission.

> Do this **after** the domain resolves, not before. HSTS with preload is hard to undo — browsers
> cache it — so a mistake here is expensive.

## 6. Turnstile

Cloudflare → **Turnstile** → **Add widget**. Add your production hostname to the production widget.
For a separate preview widget add the actual project hostname, such as `sko-website.pages.dev` if
assigned. Wildcards such as `*.pages.dev` are invalid; a hostname already authorizes its subdomains,
including branch/hash previews. Do not authorize all of `pages.dev`. Mode: **Managed**.
Copy each environment's site key and secret key into step 4.

> **The form now fails closed.** If `TURNSTILE_SECRET_KEY` is missing or wrong, submissions return a
> controlled error rather than silently going through unverified. Test both forms and confirm
> actual delivery after deployment; a successful page build does not prove runtime configuration.

## 7. Rate-limiting KV namespace

```bash
npx wrangler kv namespace create RATE_LIMIT_KV
npx wrangler kv namespace create RATE_LIMIT_KV --preview
```

Paste production and preview IDs into `wrangler.toml` using `[[kv_namespaces]]` and
`[[env.preview.kv_namespaces]]` respectively, then uncomment those blocks. A top-level `preview_id`
is not a deployment-preview override. Do not configure dashboard bindings that contradict the file.
Binding name must be exactly `RATE_LIMIT_KV`. KV limiting is best effort and fails open on storage
errors; KV has no atomic increment, so concurrent verified submissions can briefly exceed the limit.
Only Turnstile-verified submissions count, in fixed ten-minute windows. Monitor errors and use
upstream abuse controls when needed.

## 8. Email delivery (Resend)

1. Create the account, **Domains** → add `<your-domain>`.
2. Add the **SPF** and **DKIM** records Resend shows you at your DNS provider.
3. Wait for both to verify. **Do not skip this** — without SPF and DKIM, form notifications will land
   in spam, and you will conclude the form is broken when it is not.
4. Create an API key with **Sending access only**, not full access. Put it in step 4.

Ensure `MAIL_FROM` uses the verified sender domain. Check current account quotas and confirm
general/partner inbox delivery and reply-to behavior. Requests have timeouts but emails are not
automatically retried: a timeout can occur after delivery, so retries need an idempotency design.

## 9. Analytics

Cloudflare → **Web Analytics** → **Add a site**. Copy the token into `PUBLIC_CF_ANALYTICS_TOKEN`.

Cookieless and privacy-preserving — no consent banner needed, which is why the site sets no cookies
at all. The beacon host is already allowed in the CSP.

## 10. Rebuild on publish

**Deploy hook:** Pages → Settings → Builds & deployments → **Deploy hooks** → Add. Name it
`sanity-publish`, branch `main`. Copy the URL — treat it as a secret; anyone with it can trigger
builds.

**Sanity webhook:** Sanity → API → Webhooks → Create.

| Field       | Value                         |
| ----------- | ----------------------------- |
| URL         | the deploy hook URL           |
| Dataset     | `production`                  |
| Trigger on  | Create, Update, Delete        |
| Filter      | `!(_id in path("drafts.**"))` |
| HTTP method | `POST`                        |

The filter is what stops every keystroke in a draft from triggering a build. Cloudflare's build queue
debounces the rest, so publishing three posts in a row produces one useful build.

**Nightly rebuild:** so time-sensitive content drops off without anyone touching the CMS — expired
job posts in particular. Create a Cron Trigger (Workers → Cron) or any scheduler that POSTs to the
deploy hook at **02:00 Asia/Phnom_Penh**. A Pages Function cannot have a Worker Cron Trigger; use a
separate scheduled Worker or workflow. Keep the hook URL secret. Test both publish and deletion.
Job expiry currently compares UTC date strings; approve the intended Cambodia-time deadline semantics.

## 11. Uptime monitoring

Free options that suit an NGO budget:

- **UptimeRobot** — 5-minute checks on `https://<your-domain>/` and `/km/`, email alerts.
- **Cloudflare Health Checks** — if you are on a paid plan.

Also add a check on `/donate/`. It is the page whose breakage costs the most and the one nobody
visits often enough to notice.

Configure deployment failure alerts and enquiry-delivery monitoring. Record a last-known-good
deployment and rehearse rollback in a preview. After a production rollback recheck forms, runtime
bindings and both locales; rolling back static files does not prove secrets or services are restored.

## 12. Post-deploy verification

Do all of these on the live site before telling anyone it is launched.

- [ ] `https://<domain>` and `https://<domain>/km/` both load
- [ ] Valid Khmer pages stay 200; missing Khmer pages return localized 404, not a redirect or soft 200
- [ ] Donation QR codes scan correctly and bank details match the approved records
- [ ] Mobile navigation and PDF downloads work
- [ ] The language toggle moves between matching pages, not back to the homepage
- [ ] Khmer text renders in Kantumruy Pro — not a system fallback. Check a Khmer heading against
      the design preview
- [ ] **Submit the contact form and confirm the email arrives.** Then check it is not in spam
- [ ] Submit the partner form and confirm it reaches the _partnerships_ inbox, not the general one
- [ ] `curl -I https://<domain>` shows HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
      `Referrer-Policy`, `Permissions-Policy`
- [ ] View source: the `<meta http-equiv="Content-Security-Policy">` tag is present and contains
      `sha256-` hashes
- [ ] Browser console is clean — no CSP violations
- [ ] `https://<domain>/sitemap-index.xml` resolves and lists both locales
- [ ] `https://<domain>/robots.txt` points at the real sitemap URL, not `example.org`
- [ ] Publish a test post in Sanity; confirm a build starts within a minute and the post appears
- [ ] Delete the test post; confirm it disappears after the next build
- [ ] Run Lighthouse on the live URL, mobile profile — all four categories should stay above 90
- [ ] Submit Google Search Console verification and the sitemap
- [ ] Failure alerts and rollback have been tested

## 13. Two things to change in code before launch

Neither is a code change you need me for, but both are wrong until you do them:

1. **`public/robots.txt`** — replace `https://example.org/sitemap-index.xml` with the real domain.
2. **Fixture content** — once Sanity has real content, the finished copy replaces the fixtures on
   its own. Unfinished fields are _not_ visible on the live site: the content layer strips every
   `[NEEDS SKO]` / `[EXAMPLE]` marker before render and the build fails if one reaches the HTML
   (`src/lib/content/placeholders.ts`, `scripts/check-build.mjs`), so a gap shows up as a section
   that is simply absent. To see what SKO still owes, run `node scripts/content-review.mjs` and open
   `SKO-content-review.html` — that reads the source, not the rendered site, and lists every gap.

---

## What it costs

| Service                             | Plan      | Cost                                                     |
| ----------------------------------- | --------- | -------------------------------------------------------- |
| Cloudflare Pages                    | Free      | $0 — 500 builds/month; this site uses roughly 60–100     |
| Cloudflare Turnstile, Analytics, KV | Free      | $0                                                       |
| Sanity                              | Free      | $0 — 20 users, 10 GB assets. PDFs are the thing to watch |
| Resend                              | Free      | $0 — 3,000 emails/month                                  |
| UptimeRobot                         | Free      | $0                                                       |
| **Domain**                          | registrar | **$10–35/year**                                          |

**Total recurring: the domain only**, as specified. Cloudflare Registrar sells at cost if you move
the domain there.

The one thing that could push you off a free tier is Sanity asset storage, if SKO uploads many large
PDFs and photos. 10 GB is a lot of annual reports, but compress scanned PDFs before uploading.
