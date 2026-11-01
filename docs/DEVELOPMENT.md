# Developing the SKO website

Astro + TypeScript + Tailwind v4 · Sanity (headless CMS) · Cloudflare Workers static assets +
one Worker for the form · Turnstile · Resend · Cloudflare Web Analytics.

Planning, design and architecture documents are indexed in [`docs/README.md`](README.md).

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

The site builds and runs with **no Sanity project configured** — the content layer falls back to
local fixtures in `src/lib/content/fixtures.ts`. The build prints which source it used.

### The Studio (separate npm project)

```bash
cd studio && npm install && npm run dev
```

`studio/` is deliberately **not** an npm workspace. CI runs `npm ci` at the repo root on every
production build; a workspace would drag Sanity's React toolchain into a build of a site that ships
no React.

---

## Scripts

| Command                       | What it does                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run dev`                 | Astro dev server. Pages only — the form endpoint is not served.                               |
| `npm run build`               | Static build to `dist/`, then per-page CSP, the Khmer 404 copy and structural checks.         |
| `npm run check`               | The one command: tests, typecheck, build. CI runs it before every deploy.                     |
| `npm run preview`             | Builds, then serves `dist/` **with the Worker** via `wrangler dev`. The honest local preview. |
| `npm run check:edge -- <url>` | Live checks against a deployed copy: routes, 404s, headers, caching, API.                     |
| `npm run deploy:rehearsal`    | Deploys to workers.dev. `npm run deploy:production` deploys the real site (CI's job).         |
| `npm run verify`              | Alias of `npm run build`.                                                                     |
| `npm run typecheck`           | `astro check` + `tsc --noEmit`.                                                               |
| `npm run format`              | Prettier across the repo.                                                                     |
| `npm run studio`              | Runs the Studio dev server from the root.                                                     |
| `npm run studio:deploy`       | Publishes the Studio to `<hostname>.sanity.studio`.                                           |

To exercise the contact form locally you need `npm run preview`, not `npm run dev` — the Worker
only exists under Wrangler. Copy `.dev.vars.example` to `.dev.vars` for its runtime settings.

---

## Repository layout

```
wrangler.jsonc             Worker config: rehearsal on workers.dev, env.production on the domain.
worker/index.ts            The Worker. Only /api/* reaches it; everything else is a static file.
functions/api/contact.ts   The form handler the Worker calls. The only real runtime code.
public/_headers            Security headers + cache policy for static responses.
src/lib/config.ts          The single seam for environment configuration.
src/lib/content/           The content layer. Pages import only from here — never the
                           Sanity client, never raw GROQ.
src/lib/i18n/              Locale config, UI strings, path helpers, field resolution.
src/lib/sanity/            Client, all GROQ queries, image URL builder.
src/page-templates/        Every page body. Route files are thin shells.
src/pages/                 Route shells: English at the root, Khmer under /km/.
studio/                    Sanity Studio — independent npm project.
```

---

## The rules that keep this maintainable

- **No component reads `import.meta.env`.** Everything goes through `src/lib/config.ts`, which fails
  loudly at build time rather than rendering an empty section in production.
- **All GROQ lives in `src/lib/sanity/queries.ts`.** No inline query strings in pages. This is what
  makes a schema change auditable in one file.
- **Every visible string goes through `t()` or comes from the CMS.** A hardcoded English string in a
  component is a review-blocking bug — it is the easiest way for a bilingual site to rot, and it is
  invisible until a Khmer reader hits it.
- **`PUBLIC_` is load-bearing.** Astro inlines any `PUBLIC_*` variable into the browser bundle.
  Server-only secrets are read in `worker/` and `functions/` from the Cloudflare env binding. They
  must never be imported into `src/`.
- **There is no Sanity token anywhere**, by design — see [`04-tech-decisions.md`](04-tech-decisions.md) ADR-004. Do not
  add one without revisiting that decision.
- **Nothing about a beneficiary or a child is modelled in the CMS.** The dataset is public. That is
  safe only because of this rule.

---

## Environment

See `.env.example` for the build-time list and `.dev.vars.example` for the Worker's runtime list.
Nothing in this repo contains a real secret. In production, build values are GitHub repository
variables and runtime secrets are Wrangler secrets on `env.production`.

## Deploying

The runbook is [`16-cloudflare-workers.md`](16-cloudflare-workers.md): rehearsal on
workers.dev, cutover, CI deploys, rollback, and who does which step.
