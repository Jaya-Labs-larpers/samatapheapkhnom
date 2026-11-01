/**
 * The seam that keeps internal content markers off the public site.
 *
 * Unfinished copy is tracked in the source with bracketed markers —
 * `[NEEDS SKO]`, `[EXAMPLE]`, `[PLACEHOLDER …]` — so `scripts/content-review.mjs`
 * can list exactly what SKO still owes, and so nobody quietly invents a fact to
 * fill a gap. Those markers are a note to the team,
 * not copy: a visitor must never see one, and must never see the instruction
 * that follows it either ("Replace this with your own first post…").
 *
 * So the marker stays in the source and the value is dropped on the way out.
 * Every component already has an empty state — a section with nothing to say
 * hides itself rather than rendering scaffolding. The same pass runs over CMS
 * content, because a staff member drafting in Sanity can type a marker too.
 *
 * Enforced downstream by `markerFailures()` in scripts/readiness.mjs, which
 * fails the build if a marker still reaches the HTML.
 */

import type { LocaleString, PortableSpan } from './types';

/**
 * Marker vocabulary, kept in step with scripts/content-review.mjs and
 * scripts/readiness.mjs. Deliberately an explicit list rather than "any
 * bracketed capitals" — real copy is allowed to contain brackets.
 */
const MARKER =
  /\[(?:NEEDS SKO|NEEDS [A-Z][A-Z ]*|PLACEHOLDER|EXAMPLE|SAMPLE|DRAFT|TODO|TBD|LOGO|STATIC MAP|KHMER REVIEW)\b[^\]]*\]/i;

/** True when a string is an internal marker rather than publishable copy. */
export function isPlaceholderText(value: unknown): boolean {
  return typeof value === 'string' && MARKER.test(value);
}

/** True when a localised string has no publishable value in any locale. */
export function isEmptyLocaleString(value?: LocaleString | null): boolean {
  return !Object.values(value ?? {}).some((entry) => typeof entry === 'string' && entry.trim());
}

function isPortableTextBlock(value: Record<string, unknown>): boolean {
  return value._type === 'block' && Array.isArray(value.children);
}

/**
 * A block is dropped whole when its text is a marker. Stripping only the
 * offending span would leave an empty paragraph behind, and stripping only the
 * `[NEEDS SKO]` prefix would leave the instruction addressed to staff.
 */
function blockText(value: Record<string, unknown>): string {
  return (value.children as PortableSpan[])
    .map((child) => (typeof child?.text === 'string' ? child.text : ''))
    .join('');
}

function strip(value: unknown): unknown {
  if (typeof value === 'string') return MARKER.test(value) ? undefined : value;
  if (Array.isArray(value)) return value.map(strip).filter((entry) => entry !== undefined);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (isPortableTextBlock(record) && MARKER.test(blockText(record))) return undefined;
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      const kept = strip(entry);
      if (kept !== undefined) out[key] = kept;
    }
    return out;
  }
  return value;
}

/**
 * Deep-copies `value` with every marked string, and every Portable Text block
 * whose text is marked, removed. Structure is preserved, so a partly-written
 * document keeps the paragraphs that are finished.
 */
export function stripPlaceholders<T>(value: T): T {
  return strip(value) as T;
}
