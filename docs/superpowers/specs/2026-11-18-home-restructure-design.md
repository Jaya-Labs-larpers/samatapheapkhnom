# Home restructure from the radiatinghope clone — design

## Intent

Re-present existing SKO content using the section structure of `~/Sites/radiatinghope-clone` (emotion → claim → proof → ask). Navbar and footer may be rewritten. No content changes.

## Goals

- Home follows the clone's 12-beat arc (`docs/research/landing-structure/PAGE_TOPOLOGY.md`, `STORYTELLING.md`, `BEHAVIORS.md` in the clone).
- Nav: fixed glass pill over hero, light-gray over white; footer: 4 link columns + bottom bar. Both apply site-wide.
- Khmer and English both render.

## Non-goals / anti-goals

- No new copy, claims, numbers, names, prices. Business content needs owner sign-off.
- No copied clone assets, fonts (commercial typeface), or copy.
- No new dependencies. Existing scroll libs (`scrub`, `scroll-text`, `count-up`, `carousel`, Lenis) are reused.
- Other pages change only via new nav/footer.

## Approaches

1. **Section-for-section remap on existing skeleton components (chosen, approved).** Extend `SkeletonHome` and `Sk*` components; add new ones where a layout is missing.
2. Port clone React components to Astro 1:1: rejected, pulls in clone-specific content and markup.
3. Rebuild home from scratch: rejected, discards the uncommitted work already matching the arc.

## Section map

| #   | Clone beat         | SKO source                                       | Note                                                                                                                          |
| --- | ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 0   | Announcement bar   | —                                                | Skipped; no copy.                                                                                                             |
| 1   | Hero               | `SkHero`                                         | Exists.                                                                                                                       |
| 2   | Mission line       | tagline / `homeHeroIntro`                        | Large centered statement, existing copy.                                                                                      |
| 3   | Our story          | `SkStoryText`                                    | Exists (scrubbed text).                                                                                                       |
| 4   | Map proof          | stats + `public/maps/cambodia-phnom-penh.svg`    | Big number over Cambodia map, Phnom Penh highlighted. Map is SKO's own (Natural Earth based), not the CC BY-SA Wikimedia one. |
| 5   | Donate widget      | —                                                | Skipped until `/donate` copy exists.                                                                                          |
| 6   | Ways to help       | programs (`SkRows` → photo cards)                | One title per card.                                                                                                           |
| 7   | Events             | featured activities, tabbed/dated list           | Only fields that already exist (date, title, link).                                                                           |
| 8   | Stories slider     | `getStories` + carousel                          | Dated, named stories.                                                                                                         |
| 9   | Feature banner     | existing program/story photo + existing CTA text | Full-bleed, rounded bottom.                                                                                                   |
| 10  | Latest news        | `SkPosts`                                        | Exists.                                                                                                                       |
| 11  | Closing CTA        | `SkSplitCta` → rounded photo card                | Existing copy/actions.                                                                                                        |
| 12  | Footer             | `Footer.astro`                                   | Rewritten to 4 columns using existing links/legal text.                                                                       |
| —   | Partners, director | existing                                         | Placed before closing CTA (trust strip).                                                                                      |

## Left to builder

Component names, CSS, responsive breakpoints, motion details within `docs/17-scroll-motion.md` rules (static fallback first, reduced-motion safe). Section order tweaks only if a section has no data (render nothing).
