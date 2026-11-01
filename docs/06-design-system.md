# Phase 2 — Design system

**Token source of truth:** [design-tokens/theme.css](design-tokens/theme.css) — moves to `src/styles/theme.css` in Phase 3.

---

## 1. Direction

**White is the material, not the background.** You asked for white; the whole system is built on that
rather than around it.

- **Structure comes from hairlines, not fills.** Every surface is `#FFFFFF` bounded by a 1px `#E1E8E5`
  border. Section banding uses `#F4F8F6` — a tint so slight it reads as a change in air pressure rather
  than a grey box.
- **The brand blue is rationed.** `#2B4CC7` appears as: primary buttons, a 44×3px accent rule above
  section headings, the impact numerals, link underlines, and two large filled areas per page maximum
  (one CTA band, the footer). Nothing else gets to use it.
- **The two light blues do the softening.** `#C3E9E8` and `#9BE1FF` carry chips, the decorative quotation
  mark, the page-hero wash, the donation-allocation bars, the registration badge and the input focus glow.
  They are surfaces, never text.
- **Shadows are the hover state, not the resting state.** On a white page a shadow reads as haze. Cards
  ship flat with a border; elevation appears on interaction. Shadow colour is `#0E1533` at low alpha, not
  black — neutral-black shadows look dirty against a cool white.
- **The numbers carry the trust.** Impact figures are set at 46px in teal, the largest type on the page
  after the H1, and every one carries a context line. "1,240 families" is marketing; "1,240 families since
  2007" is evidence. That distinction is the entire job of this site.

Result: institutional rather than campaign-y, which is what a grant officer needs to see in three seconds.

## 2. Colour

Full ramp with measured contrast in `theme.css`. Ratios are WCAG 2.1 relative-luminance calculations
against `#FFFFFF`, not estimates.

| Role                | Token         | Hex           | Contrast | Use                                |
| ------------------- | ------------- | ------------- | -------- | ---------------------------------- |
| Headings            | `ink-900`     | `#0E1533`     | 17.4:1   |                                    |
| Body                | `ink-600`     | `#3E4869`     | 8.5:1    |                                    |
| Meta / captions     | `ink-400`     | `#5C6689`     | 5.4:1    | AA floor for small text            |
| Dividers, disabled  | `ink-300`     | `#929AB5`     | 2.8:1    | **Never text**                     |
| **Brand**           | `blue-700`    | **`#2B4CC7`** | 6.2:1    | Buttons, rules, numerals           |
| Links, hover        | `blue-800`    | `#1E3894`     | 8.8:1    |                                    |
| Secondary, icons    | `blue-600`    | `#4A6BDB`     | 4.6:1    |                                    |
| Borders, underlines | `blue-200`    | `#B9C6EE`     | —        |                                    |
| Hover fills         | `blue-50`     | `#EEF2FD`     | —        |                                    |
| Dark surface        | `blue-900`    | `#14235C`     | 12.8:1   | Footer + one CTA band              |
| **Support**         | `aqua-200`    | **`#C3E9E8`** | —        | Chips, quote mark, notice wells    |
| **Support**         | `sky-200`     | **`#9BE1FF`** | —        | Accent bars, hero wash, focus glow |
| Error               | `danger-700`  | `#B42318`     | 6.6:1    | Form errors, "closes in N days"    |
| Success             | `success-700` | `#067647`     | 5.7:1    | Sent-form confirmation only        |

Ink is blue-black rather than neutral grey, so text sits in the same family as the brand. `#2B4CC7`
lands at 6.2:1 — near-identical to the previous brand colour, so it passes AA for normal text and for
white-on-blue buttons without any compensating adjustment.

**The two supporting tints carry surfaces, never text.** Everything set on them uses `ink-900` or
`blue-800`, and all four combinations were measured: ink-900 on aqua 13.4:1, blue-800 on aqua 6.8:1,
ink-900 on sky 12.1:1, blue-800 on sky 6.1:1 — all AA.

`ink-300` is fenced off from text in the token file's own comments, so the constraint travels with the
code rather than living in a doc nobody reopens. No colour is ever the sole carrier of meaning — every
chip pairs colour with a word, every form error pairs colour with an icon and a sentence.

**Amber is gone.** The supporting tints now cover the allocation bars, and "closes in N days" uses the
error red — semantically right, and it adds no new hue. The only non-blue colours left are the two
semantics, and each exists purely to mean something.

## 3. Typography

| Role             | Family                                       | Loaded                                       |
| ---------------- | -------------------------------------------- | -------------------------------------------- |
| Latin UI + body  | Inter                                        | 400/600/700, Latin subset                    |
| Khmer everything | **Kantumruy Pro** (fallback Noto Sans Khmer) | 400/600/700, `U+1780–17FF` subset            |
| Display serif    | Source Serif 4                               | 600, Latin only — used for exactly one thing |

Self-hosted WOFF2, no third-party font request (ADR-006). Scale is fluid `clamp()`; body is **17px**, not
16 — most readers are on a phone, in daylight, on mobile data.

### Khmer rules, enforced in the base layer

These live in `@layer base` under `:lang(km)`, so they follow the language wherever it appears — including
a Khmer name inside an English sentence — instead of depending on a developer remembering per component.

| Rule                     | Value                                                          | Why                                                                                |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `line-height`            | 1.9 body / 1.5 headings                                        | Subscript consonants (ជើង) and above-baseline vowel signs collide at Latin leading |
| `font-size`              | +6.25% on `p, li, dd, figcaption` (em-scoped, never compounds) | Khmer reads smaller at the same nominal size                                       |
| `letter-spacing`         | `normal`, always                                               | Tracking separates a cluster from its base consonant                               |
| `text-transform`         | never — eyebrows drop uppercase in km                          | Khmer has no case                                                                  |
| `hyphens` / `word-break` | `none` / `normal`                                              | No inter-word spaces; forced breaks split clusters                                 |
| Measure                  | 44rem Latin / 40rem Khmer                                      | Same reading length, wider glyphs                                                  |

The preview shows the wrong-vs-right leading comparison side by side — it's the clearest argument for why
this is a system rule and not a stylistic preference.

**One deliberate exception:** the Director's pull quote is Source Serif in English and **Kantumruy SemiBold
at 24px/1.75 in Khmer**. Khmer has no serif tradition; faking one looks wrong.

## 4. Space, radius, elevation, motion

- Section rhythm `clamp(3.5rem, 2rem + 6vw, 7rem)`; gutter `clamp(1.25rem, .75rem + 2vw, 2.5rem)`;
  container 1200px.
- Radius: 8px buttons/inputs, 12px cards, 16px panels. No pills except the language toggle and pagination —
  fully rounded reads consumer-app, and this site needs to read institutional.
- Motion: 140ms hover, 220ms panels, one easing curve. **No scroll reveals, no parallax, and no count-up
  on the impact numbers** — a figure that animates on scroll reads as marketing. Everything collapses under
  `prefers-reduced-motion`.

## 5. The two agreed special treatments

**Director's message** — outlined card, 4px blue rule at top-left, decorative `"` in `aqua-200` and
`aria-hidden` (the quote itself is a real `<blockquote>`), Source Serif pull quote, signature rule with name
and title. Portrait 4:5 at ~300px on desktop, stacked and capped at 320px tall on mobile with
`object-position: top`. Photo, name, title, pull quote and body all CMS fields.

**Organizational structure** — image-first as agreed: a `<button>`-wrapped `<figure>` opening a native
`<dialog>` at full resolution, pinch-zoom on touch, `Esc` to close, focus returned to the trigger. Beneath
it, a collapsible **text version** of the reporting lines. I added that rather than substituting it — an
image of a chart is invisible to a screen reader and unreadable at 360px however good the zoom is, and it
costs one CMS field. The Sanity `alt` field's help text tells staff to describe the reporting lines in words.

## 6. Responsive behaviour

| Breakpoint | What changes                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 640      | 1-col cards · stats stack · nav → full-screen panel · buttons full-width · bank table → definition list · **hero photo moves above the white card** |
| 640–1023   | 2-col cards · stats 2×2 · director card still stacked                                                                                               |
| ≥ 1024     | 3-col cards · stats 4-up · director card side-by-side · horizontal nav                                                                              |
| ≥ 1280     | Container caps at 1200px, gutters grow                                                                                                              |

On mobile the hero photo sits _above_ the white card rather than behind it. Text over a CMS-uploaded photo
at 375px is a contrast gamble no image can be trusted to win, and the site's AA commitment can't depend on
which photo a staff member picks next year.

## 7. Accessibility — what AA commits us to

Built in: measured contrast on every token · 3px `:focus-visible` blue ring, inverted to white on dark surfaces ·
skip link first in tab order · semantic landmarks, one `h1`, no skipped heading levels · focus trap and
restore on the mobile nav and lightbox · `lang` per locale and on inline foreign passages · per-field form
errors via `aria-describedby` with icon _and_ text · `aria-live="polite"` status region · required alt on
every Sanity image field · 44px minimum tap targets · no horizontal scroll at 320px · layouts hold at 200%
zoom.

Verified in Phase 4, not assumed: axe-core clean on every route in both locales · full keyboard pass ·
Lighthouse ≥ 90 ×4 on the mobile profile in CI · a `document.fonts.check()` sweep confirming no Khmer glyph
falls back to a system font · 320px and 200%-zoom screenshots per page.

## 8. Notes on the placeholders

Everything in _this preview file_ is marked `[PLACEHOLDER]`. **No SKO facts, statistics, staff names, or a
director's name have been invented** — the numbers shown (1,240 / 3,800 / 18 / 96%) are visibly bracketed
placeholders demonstrating the component, not claims.

The preview is a design document, not the site. On the site itself those markers never render: the
content layer drops marked values on the way out, so an unfinished section is absent rather than
showing a note meant for the team. See `src/lib/content/placeholders.ts`.

Khmer strings are structurally correct and idiomatic enough to demonstrate typography, but they are
placeholders. They must be written or reviewed by an SKO staff member before launch. Machine-translating a
child-protection NGO's mission and shipping it is not something I'll do.

## 9. Content control — what staff edit

Section 09 of the preview shows the Sanity editor as staff will see it.

**Every number is a field.** `impactStat` documents carry `value`, `displayValue`, `label` (en/km),
`context` (en/km) and `order`. `displayValue` is what lets staff type `10,000+`, `96%` or Khmer numerals
`៩៥%` instead of being stuck with a raw integer. Nothing on the site is hardcoded — program stats, report
years, job deadlines, QR images, bank details, the Director's photo and message, the org-chart image and
caption all live in the CMS. The only things that don't are the layout and these design tokens.

**Activity posts carry both languages in one document.** `Title (English)` / `Title (ខ្មែរ)`,
`Body (English)` / `Body (ខ្មែរ)`, side by side, one Publish button. Staff write both — as you confirmed.

**The language toggle does not translate.** It loads the same page from the Khmer field a staff member
typed. There is no machine translation in this build. If a Khmer field is left empty, that block falls
back to the English text with `lang="en"` on it, so the page still works and a screen reader still switches
voice correctly; the Studio shows a save-time warning but never blocks publishing. A "draft the Khmer for
me" button in the Studio is buildable as a Phase 4 add-on — it needs an API key and, for a child-protection
NGO, a human sign-off step. Out of scope unless you ask for it.

## 10. Open for your call

1. **Hero treatment.** Full-bleed photo with an overlapping white card (shown), versus a fully white hero
   with the photo beside the text. The card version survives a bad photo better, which matters when the
   image comes from a CMS.
2. **Impact numerals in `blue-700` vs `ink-900`.** Blue shown. Ink is more austere and arguably more
   auditorial.
3. **Success green.** The one remaining green is the sent-form confirmation. Standard signal, but if you
   want zero green anywhere, it becomes `blue-700` with a tick — say so and I'll switch it.
4. **Logo.** The preview uses a placeholder `SKO` monogram tile. If SKO has a real logo, send the file —
   it may shift the header proportions and, if the logo carries its own colour, the blue ramp.
