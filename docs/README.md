# SKO website — project documentation

Project: production bilingual (km/en) website for **Samatapheap Khnom Organization**, Phnom Penh.
Stack per brief: Astro + TypeScript + Tailwind · Sanity · Cloudflare Pages + Functions + Turnstile · Resend · Cloudflare Web Analytics.

Delivered in six phases, each with an approval gate.

**Start here if you are:**

| You are…                    | Read                                                                            |
| --------------------------- | ------------------------------------------------------------------------------- |
| Deploying it                | [16-cloudflare-workers.md](16-cloudflare-workers.md)                            |
| A developer picking this up | [DEVELOPMENT.md](DEVELOPMENT.md), then [07-architecture.md](07-architecture.md) |

---

# Phase 1 — Planning

| #   | Deliverable                                             | Document                                                           |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Sitemap + URL structure, both locales                   | [01-sitemap-and-urls.md](01-sitemap-and-urls.md)                   |
| 2   | Sanity content model, finalized                         | [02-sanity-content-model.md](02-sanity-content-model.md)           |
| 3   | Component inventory + wireframe notes                   | [03-components-and-wireframes.md](03-components-and-wireframes.md) |
| 4   | Tech decisions (ADRs, i18n, images, forms, deploy, env) | [04-tech-decisions.md](04-tech-decisions.md)                       |
| 5   | Repo structure plan                                     | [05-repo-structure.md](05-repo-structure.md)                       |

**Phase 1 approved.** Recorded decisions:

- Front end is **white-dominant**.
- Palette is **slate blue `#475D8C`** with **`#C3E9E8`** and **`#9BE1FF`** as supporting tints. No green.
- Staff write **both English and Khmer directly** on each Activity post. No machine translation.

# Phase 2 — Design

| #   | Deliverable                                                                                                                | Document                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 6   | Design system — colour, type (Latin + Khmer), space, radius, shadow, motion                                                | [06-design-system.md](06-design-system.md)         |
| 7   | Tokens as Tailwind config                                                                                                  | [design-tokens/theme.css](design-tokens/theme.css) |
| 8   | Visual proof — palette, specimens, component kit, 6 desktop layouts, 3 mobile frames, and the Sanity editor staff will use | Kept private                                       |

**Phase 2 approved.**

# Phase 3 — Architecture & working skeleton

| #   | Deliverable                                                      | Where                                    |
| --- | ---------------------------------------------------------------- | ---------------------------------------- |
| 9   | What was built, what was verified, what is deliberately deferred | [07-architecture.md](07-architecture.md) |
| 10  | Developer setup and the rules that keep this maintainable        | [DEVELOPMENT.md](DEVELOPMENT.md)         |
| 11  | The code                                                         | `src/`, `functions/`, `studio/`          |

**Phase 3 approved.**

# Phase 4 — Build & implementation

| #   | Deliverable                                                 | Where                      |
| --- | ----------------------------------------------------------- | -------------------------- |
| 12  | Results, defects found and fixed, what is still placeholder | [08-build.md](08-build.md) |
| 13  | Per-page CSP generator                                      | `scripts/csp.mjs`          |
| 14  | Structural sweep over every built page                      | `scripts/check-build.mjs`  |

Lighthouse mobile: **100/100/100/100** on four of five key pages, 99 on the heaviest. CLS 0.
Note: the CSP question deferred in [07-architecture.md](07-architecture.md) §6 is now **settled and
enforcing** — see [08-build.md](08-build.md) §3.

**Phase 4 approved.**

# Phase 5 — Security review

| #   | Deliverable                                                     | Where        |
| --- | --------------------------------------------------------------- | ------------ |
| 15  | Findings, remediation, checklist, and the go-live prerequisites | Kept private |

8 findings: 6 fixed in code, 1 accepted with rationale, 1 is a Phase 6 deployment prerequisite.
`npm audit` → **0 vulnerabilities** on the site. The headline fix: the contact form's Turnstile check
was **failing open** when unconfigured — it now fails closed.

**Phase 5 signed off.**

# Phase 6 — Deployment

| #   | Deliverable                                                | Where                                                                                                            |
| --- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 16  | Step-by-step deployment runbook                            | **[16-cloudflare-workers.md](16-cloudflare-workers.md)** (service setup in [09-deployment.md](09-deployment.md)) |
| 17  | Staff guide, English                                       | Kept private                                                                                                     |
| 18  | Staff guide, Khmer                                         | Kept private                                                                                                     |
| 19  | Pages build settings under version control                 | `../wrangler.toml`                                                                                               |
| 20  | CI: typecheck, structural checks, audit, Lighthouse floors | `../.github/workflows/verify.yml`                                                                                |

**Status: prepared, awaiting accounts and a domain to execute.** The runbook is the sequence to follow.

---

## Decisions on the record

Settled during the phase gates, and load-bearing — changing any of them means revisiting the phase
that decided it.

| Decision        | Outcome                                                                  | Where                               |
| --------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| URL style       | English unprefixed (`/about/`), Khmer at `/km/about/`                    | [01](01-sitemap-and-urls.md)        |
| Sanity i18n     | Field-level `{en, km}` — one document, one Publish button                | [02](02-sanity-content-model.md)    |
| Sanity dataset  | **Public, no token anywhere in the build**                               | ADR-004, [04](04-tech-decisions.md) |
| Palette         | White-dominant, slate blue `#475D8C` + `#C3E9E8` / `#9BE1FF`. No green   | [06](06-design-system.md)           |
| Translation     | Staff write both languages. **No machine translation anywhere**          | [02](02-sanity-content-model.md)    |
| File uploads    | None anywhere, including CVs on careers                                  | [04](04-tech-decisions.md)          |
| Payments        | QR and bank details only. No card fields, no payment SDK, zero PCI scope | [01](01-sitemap-and-urls.md)        |
| Org chart       | Image treatment **plus** a text version — the accessible route           | [06](06-design-system.md)           |
| Newsletter      | Deferred past launch                                                     | [01](01-sitemap-and-urls.md)        |
| Nightly rebuild | Included — it is why job deadlines expire on their own                   | ADR-007                             |

## Two things that must not drift

**Khmer copy is placeholder.** Every Khmer route, font rule and CMS field is built, and the interface
strings are a working translation marked for review in `src/lib/i18n/strings.ts`. The _content_ — the
mission, the programme descriptions, the Director's message — needs a Khmer-speaking staff member
before launch. A child-protection NGO's mission should not go live machine-translated.

**Nothing sensitive belongs in the CMS.** No field anywhere models a beneficiary's real name, age,
location or case detail, and a story cannot publish without a consent tick — enforced in the Studio
rule _and_ in the published query. The dataset is public by design, so this is not a preference; it
is the condition that makes ADR-004 safe.
