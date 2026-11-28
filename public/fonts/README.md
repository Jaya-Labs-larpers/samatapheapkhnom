# Self-hosted fonts

These files are committed and served from this origin. **Nothing is requested from Google at
runtime** — no third-party font request, no privacy question for European institutional donors, and
a simpler CSP (`font-src 'self'`).

| File                    | Family          | Covers                       | Size  |
| ----------------------- | --------------- | ---------------------------- | ----- |
| `noto-sans-khmer.woff2` | Noto Sans Khmer | Khmer block, weights 400–700 | 57 KB |

All are SIL Open Font Licence. Noto Sans sets headings, navigation and controls; Source Serif 4 sets
reading text; Noto Sans Khmer supplies Khmer, designed to match Noto Sans.

## Two things that matter about these files

**They are variable fonts.** One file per subset covers the whole 400–700 range, which is smaller
than three static weights. The `@font-face` rules in `src/styles/theme.css` therefore declare
`font-weight: 400 700`. If someone "simplifies" that to a single weight, the browser stops using the
weight axis and synthesises a faux bold instead — which looks noticeably wrong on Khmer.

**`unicode-range` does the work.** A subset file is only downloaded if the page actually renders a
character in its block. So `inter-latin-ext.woff2` costs nothing until a partner name like
_Planète Enfants & Développement_ appears, and an English page does not pay for the Khmer file
beyond the one word in the language toggle — which loads lazily under `font-display: swap`.

`BaseLayout.astro` preloads only the font the current locale sets body copy in.

## Regenerating

The download script lives outside the repo (it ran once). To refresh: request
`https://fonts.googleapis.com/css2?family=…&display=swap` with a modern browser User-Agent (an old
one gets you TTF instead of WOFF2), group the returned `@font-face` blocks by subset and source URL,
and declare the min/max weight range per group.
