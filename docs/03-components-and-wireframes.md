# Phase 1.3 — Component inventory & low-fi wireframe notes

## Component inventory

### Layout & chrome

| Component        | Props / data                                         | JS?            | Notes                                                                                |
| ---------------- | ---------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `BaseLayout`     | `title`, `description`, `lang`, `ogImage`, `noindex` | —              | `<html lang>`, meta, hreflang, JSON-LD slot                                          |
| `Header`         | `nav`, `lang`, `translationPath`                     | ~1 KB          | Sticky, transparent-over-hero on home                                                |
| `MobileNav`      | same                                                 | included above | Full-screen panel, focus trap, `Esc` to close, `inert` on background                 |
| `LanguageToggle` | `currentPath`, `lang`                                | —              | Two `<a>` tags, no JS. `hreflang` + `lang` attrs. Khmer label always in Khmer script |
| `Footer`         | `siteSettings`, `nav`                                | —              | 4-column → stacked                                                                   |
| `SkipLink`       | —                                                    | —              | First focusable element                                                              |
| `Breadcrumbs`    | `trail[]`                                            | —              | + `BreadcrumbList` JSON-LD                                                           |

### Content blocks

| Component             | Notes                                                                                                                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Hero`                | Variants: `home` (full-bleed image + overlay + dual CTA), `page` (compact, image optional)                                                                                                                                                          |
| `SectionHeading`      | Eyebrow + h2 + optional intro. The rhythm device used everywhere                                                                                                                                                                                    |
| `ImpactStatStrip`     | 3–4 `impactStat` cards. Numbers render as static text; **count-up animation only behind `prefers-reduced-motion`**, and honestly — recommend no animation. A number that animates reads as marketing; a number that just sits there reads as a fact |
| `ProgramCard`         | Image, title, summary, arrow link. Whole card clickable via a stretched-link pattern (single `<a>`, no nested interactives)                                                                                                                         |
| `ActivityCard`        | Cover, date (localized: `1 សីហា 2026` / `1 August 2026`), category chip, title, excerpt                                                                                                                                                             |
| `StoryQuote`          | Pull-quote with attribution; silhouette fallback                                                                                                                                                                                                    |
| `PartnerLogoWall`     | Grayscale → color on hover; grouped by category; `<a>` wraps logo with accessible name = partner name                                                                                                                                               |
| `ReportList`          | Rows: title, year, type badge, language badge, file size, download icon. `<a download>`                                                                                                                                                             |
| `DirectorMessageCard` | **Special treatment — see below**                                                                                                                                                                                                                   |
| `OrgChartViewer`      | **Special treatment — see below**                                                                                                                                                                                                                   |
| `RichText`            | Portable Text renderer: headings, lists, links (external gets `rel="noopener noreferrer"` + icon), inline images, callouts, embedded quotes                                                                                                         |
| `CtaBand`             | Full-width teal band, headline + button. Donate / Partner                                                                                                                                                                                           |
| `JobCard`             | Title, type, location, deadline (with "closes in N days")                                                                                                                                                                                           |
| `TeamGrid`            | Photo, name, role. Groups: leadership / board / staff                                                                                                                                                                                               |
| `EmptyState`          | "No open positions right now" — localized, never a blank page                                                                                                                                                                                       |

### Interactive

| Component         | JS                | Notes                                                                                         |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `ContactForm`     | ~4 KB + Turnstile | Variants: general / partner / volunteer. Honeypot, inline validation, aria-live status region |
| `Lightbox`        | ~2 KB             | Only used by `OrgChartViewer`. Native `<dialog>`, focus trap, `Esc`, pinch-zoom enabled       |
| `Pagination`      | —                 | Plain links, `rel="prev/next"`                                                                |
| `ResponsiveImage` | —                 | Sanity CDN srcset wrapper (see Tech Decisions)                                                |

**Total client JS budget: under 15 KB gzipped, excluding the Turnstile widget** (which loads only on pages with a form). Everything else ships as HTML.

## The two special treatments

### Director's message

```
┌─────────────────────────────────────────────────┐
│  ╱ 1px teal outline, 2px teal rule at top-left ╱ │
│                                                  │
│  ┌──────────┐   ❝  (decorative, teal, ~72px)     │
│  │          │                                    │
│  │ portrait │   Pull quote — display serif,      │
│  │  4:5     │   ~28px, generous leading          │
│  │          │                                    │
│  └──────────┘   Body message — sans, 17px        │
│                 [PLACEHOLDER 3–4 paragraphs]     │
│                                                  │
│                 ──────────── (signature rule)    │
│                 [PLACEHOLDER Name]               │
│                 Executive Director               │
└─────────────────────────────────────────────────┘
```

- Desktop: portrait left (~38%), text right. Mobile: portrait on top, full width, capped at ~320px tall with `object-position: top`.
- Teal `#0F6E56` accent rule and quotation glyph. The `❝` is `aria-hidden`; the quote itself is a real `<blockquote>`.
- **Khmer note:** the editorial serif is Latin-only. In Khmer the pull quote falls back to the Khmer display weight (Kantumruy Pro SemiBold) at slightly larger size and 1.9 line-height — Khmer script has no serif tradition and faking one looks wrong. Documented in the design system.
- Everything (photo, name, title, message, pull quote) from `directorMessage`.

### Organizational structure

```
┌──────────────────────────────────────┐
│  [ org chart image, max-w-4xl ]      │  ← click / Enter to zoom
│  ⤢ hint icon, bottom-right           │
├──────────────────────────────────────┤
│  Caption: [PLACEHOLDER] …            │
└──────────────────────────────────────┘
```

- Container is a `<button>` wrapping a `<figure>` → opens a native `<dialog>` with the full-resolution image, pan/pinch-zoom on touch, `Esc`/close button, focus returned to the trigger.
- Required `alt` describing the reporting lines in words — an image of a chart is invisible to a screen reader otherwise. Field description in Sanity spells this out for staff.
- Below the image, an optional collapsible **text version** of the structure (a nested list) — this is the AA-safe route and it costs one CMS field. Recommend including it.
- Serves 2x on retina via Sanity CDN; the dialog loads the original.

## Wireframe notes per page

**Home** — structure follows the radiatinghope reference (spec: `docs/superpowers/specs/2026-11-18-home-restructure-design.md`): SkHero → SkStoryText (scrubbed mission text) → SkMapProof (lead stat over `public/maps/cambodia-phnom-penh.svg`, remaining stats below) → SkPhotoCards (programs) → SkEvents (event/announcement activities, tabs when both exist) → SkStorySlider → SkFeatureBanner (first program with a photo) → SkPosts → SkDirector → partner marquee → SkSplitCta `card`. Each section renders nothing without data. Header centre nav is a glass pill over the hero and light grey elsewhere; footer is light.

**About** — Page hero → mission & vision (two columns) → history timeline since 2007 (vertical list, year + event) → values (icon grid) → **DirectorMessageCard** → **OrgChartViewer** → TeamGrid → CtaBand.

**Programs index** — Hero → intro → three full-width alternating image/text blocks → CtaBand.
**Program detail** — Hero with program image → summary → rich body → related impact stats → related stories → other programs → CtaBand.

**Impact** — Hero → ImpactStatStrip (large) → methodology note ("how we count") → story cards (2-col) → testimonial carousel _(no — static stacked quotes; carousels hide content from crawlers and keyboard users)_ → link to Reports.

**Reports** — Hero → intro → ReportList grouped by year (newest first) → note on financial transparency → contact for more.

**Safeguarding** — Hero → policy summary in plain language → key commitments (checklist) → download PDF (both languages) → reporting-a-concern contact box.

**Partners** — Hero → intro → PartnerLogoWall by category → "partner with us" CtaBand.

**Donate** — Hero → why give (short) → **QR cards** (each: bank logo/label, QR image at min 240px, tap-to-enlarge, account name below) → **bank-wire table** (responsive: table on desktop, definition-list on mobile, copy-to-clipboard per field) → "Where your money goes" allocation bars → receipt/tax note → alternative ways to give (in-kind, volunteer) → contact. **No card fields, no payment SDK, no iframes.**

**Partner / grant inquiry** — Hero → what we're looking for → ContactForm (organization, contact name, email, country, inquiry type, message) → what happens next (response-time expectation) → downloadable capability statement.

**Volunteer** — Hero → roles → requirements incl. safeguarding screening note → ContactForm.

**Activities index** — Hero → optional category filter (plain links to `?`-less static filter pages, or drop filtering in v1) → 3-col ActivityCard grid → Pagination.
**Activity detail** — Cover image → title, date, category → body → gallery → related program → prev/next → back to Activities.

**Contact** — Hero → contact block (address, phone, email, hours) → static map image linking to Google Maps → ContactForm → footer note on safeguarding concerns routing.

## Responsive breakpoints

`sm 640 · md 768 · lg 1024 · xl 1280`. Content max-width `1200px`, prose max-width `68ch` Latin / `62ch` Khmer (Khmer glyphs are wider — the same ch count reads longer).

Mobile-first: every layout is designed at 360px first. Tap targets ≥ 44px. No horizontal scroll anywhere except the bank-details table, which scrolls inside its own container.
