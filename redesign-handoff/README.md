# Smaller-pages redesign: handoff brief

Temporary folder. Delete it (`rm -rf redesign-handoff`) once the redesign is merged. Nothing in `src/` may import or link to it, and it must not be committed.

## Goal

Redesign every smaller page so it matches the modern, premium look of the **home** and **contact** pages while keeping the NGO feel. Pages must be easy to read, easy to understand, and show **photos as proof**, not just text.

The look is set by the mockups in `mockups/` (open them in a browser; images load from `../../public/images`) and the full-page captures in `screenshots/` (1280px wide). Match them closely. They show layout, hierarchy, spacing and component style. They are **not** the source of copy (see Content rules).

## Hard rules

1. **Do not change the home page or the contact page.** That covers `src/page-templates/skeleton/SkeletonHome.astro`, `src/page-templates/sko/Contact.astro`, `src/components/home/*`, `src/components/forms/ContactForm.astro`, and the contact styles in `src/styles/forms.css`. Their rendered output must stay pixel-identical. Capture screenshots of `/`, `/km/`, `/contact/` and `/km/contact/` at desktop and mobile **before** you start and compare them at the end.
2. **Shared components.** `SkHero`, `SkSection` and `SkSplit` (in `src/components/skeleton/`) are used by home as well. Don't change their default output. Either add an opt-in prop or variant, or build new components (suggested folder: `src/components/page/`). Components used only by home (`SkDirector`, `SkFeatureBanner`, `SkMapProof`, `SkPartnerMarquee`, `SkPhotoCards`, `SkSplitCta`, `SkStory*`) may be **reused unchanged**. Never edit them.
3. **Header, nav and footer stay as they are.** The mockups show simplified stand-ins.
4. **Uncommitted owner changes.** `src/lib/header-scroll.ts` and `src/styles/global.css` may contain uncommitted edits by the owner. Don't revert or overwrite them. Only append to `global.css` if you must, or better, put new styles elsewhere.
5. **No invented content** (business, legal and client content needs owner sign-off). Every heading, sentence, number, name, date and photo caption must come from existing sources: Sanity via `src/lib/content` (`getSiteSettings`, `getPrograms`, `getImpactStats`, `getPartners`, `getReports`, `getStories`, `getDirectorMessage`, etc.) and the i18n strings in `src/lib/i18n/strings.ts` and `strings.redesign.ts`. If the mockup shows text that has no source, either omit it or add a new i18n key with the English taken from the existing site wording, and list it in your final report for the owner to approve.
6. **Bilingual.** Every page must work in `/km/` too. Templates take `lang`, and the `km` routes reuse them. Add new UI strings to both locales. **Khmer is written by SKO staff, never machine-translated.** Follow the `TODO(km)` convention in `strings.redesign.ts` (leave the Khmer value missing so it falls back to English with `lang="en"`). Test that Khmer text (wider glyphs, `--font-khmer`) doesn't overflow.
7. **Design tokens only.** Use the variables in `src/styles/theme.css`: colours `--color-*`, type scale `--text-*`, spacing `--spacing-*`, radius and shadows. No raw hex values. Fonts: Noto Sans for UI and headings, Source Serif 4 for body copy (already wired). Solid CTA buttons use brand blue `--color-blue-700`. `--color-surface-inverse` / `--color-blue-900` (navy) is used for hero panels and CTA bands. The danger tokens appear only on the Safeguarding "Reporting a concern" card.
8. **No new dependencies.**
9. **Comments:** follow `AGENTS.md`. No comments by default.

## Design system (from the mockups)

| Piece | What it looks like | Used on |
|---|---|---|
| **Split hero** | Navy panel on the left (breadcrumb, H1, serif lead, optional outline chips linking to subpages); photo on the right, full-bleed to the edge, with an optional white **stat badge** (big blue number + label) at the bottom left. Stacks on mobile (photo below). | About, Impact, Partners, Safeguarding, Program detail |
| **Solid hero** | Navy band, breadcrumb, H1, lead, optional filter chips or search. No photo. | Programs, Activities, Team (with the photo pulled up into the band), Reports, FAQ |
| **Glance bar** | A 4-column strip under the hero: small uppercase label + bold value, thin dividers. 2×2 on mobile. | About, Reports, Program detail |
| **In short box** | Light blue fill, 4px brand-blue left border, 3–4 bullet points. | About (extend to other text-heavy pages where useful) |
| **Step list** | 3 white cards, blue numbered circle, title, serif line. With a photo on top for Program detail. | Programs, Program detail |
| **Alternating rows** | Photo (4:3, rounded, caption chip) + text; sides alternate on each row; stat **pill** (aqua) + "Learn more →". | Programs |
| **Proof grid (bento)** | Stat cards (number + progress bar) mixed with captioned photos; one card filled brand blue. Source line with a check icon underneath. | Program detail; Impact's "Program results" is a simple version |
| **Photo cards** | Rounded card: photo 16:10, uppercase blue label, title, serif text. | About (vision/mission), Impact, Partners, Activities |
| **Map + stats** | Phnom Penh map (`public/maps/cambodia-phnom-penh.svg`) next to a navy panel of big sky-blue numbers. You may reuse `SkMapProof` unchanged if it fits. | Impact |
| **Person cards / name chips** | Avatar (photo if one exists in the CMS, otherwise an initials circle), name, role. Field staff appear as name chips grouped by team, in the order of SKO's structure in the CMS. | Team |
| **Logo wall** | White tiles grouped by partner type; logo if one exists, otherwise the name in bold. | Partners |
| **Document rows** | Cover thumbnail (gradient block with the title), year · type label, title, "PDF · language" meta, pill-shaped Download button. | Reports, Safeguarding |
| **Accordion** | Bordered rounded items, + / – toggle, first item open, serif answers. Sticky side card on desktop (photo + navy "Still have a question?" card). | FAQ |
| **Alert card** | Pale danger background; contact person; email (filled) and phone (outline) buttons. | Safeguarding |
| **Featured post** | Large photo + text card side by side; a 3-column grid underneath. | Activities |
| **CTA band** | Rounded navy block: heading, short line, blue primary button + outline secondary button. | Most pages, at the bottom |
| **Caption chip** | Small dark translucent label in the bottom-left corner of a photo. Text comes from CMS caption or alt only. | Every photo |

Rhythm: sections alternate white and `--color-surface-subtle`; `--spacing-section` vertical padding; `--container-page` width; cards use radius 14px and 1px `--color-line` borders, with no heavy shadows.

## Page map

| Mockup | Route(s) | Template to rework |
|---|---|---|
| `1-about` | `/about/`, `/about/[group]` | `src/page-templates/sko/About.astro` |
| `2-programs` | `/programs/` | `sko/Programs.astro` |
| `10-program-detail` | `/programs/[slug]` | `sko/Program.astro` |
| `3-impact` | `/impact/`, `/impact/[section]` | `sko/Impact.astro` |
| `4-activities` | `/activities/`, `/activities/page/[page]` | `sko/Activities.astro` (match `sko/Activity.astro` and `sko/Story.astro` to the same style) |
| `5-team` | `/team/` | `sko/Team.astro` |
| `6-partners` | `/partners/` | `sko/Partners.astro` |
| `7-reports` | `/reports/` | `sko/Reports.astro` |
| `8-faq` | `/faq/` | `sko/Faq.astro` |
| `9-safeguarding` | `/safeguarding/` (and `/privacy/`, which uses the same template) | `sko/Policy.astro` |

All `/km/...` mirrors follow automatically. Out of scope: home, contact, donate (`sko/Donate.astro`, not live in production), lab, 404.

## Placeholders in the mockups (don't ship as-is)

- Director photo and leadership portraits: show the CMS image if one exists, otherwise the initials avatar.
- Empty "Next activity" cards: show only the real posts that exist.
- "Partner logo" text on program detail: use the program's real partners from the CMS, or drop the row.
- Filter chips (Activities, Reports, FAQ) and FAQ search: build them only if the data has matching categories or types. Search, if built, is a small client-side filter with no dependency and must work for Khmer.
- Value icons on About: use the existing `src/components/Icon.astro` set, not emoji.
- Photo-to-section pairing: use the images the CMS attaches to each program, story or page. The mockups reuse a few local images only to illustrate layout.

## Process

1. Read this file, view every screenshot, and open the mockups in a browser to see the responsive behaviour (around 640px breakpoint).
2. Read the current templates, `src/components/skeleton/*`, `src/styles/skeleton.css` and `theme.css`, and `docs/06-design-system.md`. If `graphify-out/graph.json` exists, start with `graphify query`.
3. Take the "before" screenshots of home and contact (Hard rule 1).
4. Build the shared components first, then go page by page in the order of the page map.
5. After each page, check it at 1280px and 390px in both `en` and `km`. Check for no horizontal scroll, AA contrast, one H1, logical heading order, alt text, visible focus, and that `prefers-reduced-motion` is respected.
6. At the end, run `npm run check` (tests, typecheck, build, perf checks), confirm home and contact are unchanged, then run `graphify update .`.
7. Don't commit or push unless the owner asks. Never commit `redesign-handoff/`.
8. Final report:
   - pages done
   - new components
   - new i18n keys (with their English text, Khmer marked TODO)
   - any content gaps where the mockup had no data
   - before/after confirmation for home and contact
