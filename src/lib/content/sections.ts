/**
 * Splits a long CMS body into its "## " sections so a page can lay each one
 * out on its own, while staff keep editing a single body in Sanity.
 *
 * The layout is chosen from the shape of a section, never from its wording,
 * so it works the same for the Khmer body and survives staff renaming a
 * heading. Nothing here writes or rewrites copy: every word shown still comes
 * from the CMS block it was typed into.
 */
import type { PortableBlock, PortableTextBlock } from './types';

/**
 * - statement: one short paragraph, set large beside its heading
 * - terms: three or more paragraphs that each open "Term. …", as numbered rows
 * - points: three or more bullets that each open "Term: …", as numbered rows
 * - facts: nothing but bullets, set as ruled lines
 * - prose: anything else, as running text under its heading
 */
export type SectionLayout = 'statement' | 'terms' | 'points' | 'facts' | 'prose';

export interface BodySection {
  heading: string;
  blocks: PortableBlock[];
  layout: SectionLayout;
}

export interface SplitBody {
  /** Blocks before the first heading. */
  lead: PortableBlock[];
  sections: BodySection[];
}

/** A statement longer than this reads as a paragraph, not a line to set large. */
export const STATEMENT_MAX_CHARS = 240;

export interface TermLimits {
  maxChars: number;
  maxWords: number;
}

/** A value's name: "Integrity", "Respect for families". */
export const TERM_LIMITS: TermLimits = { maxChars: 40, maxWords: 3 };

/**
 * An activity's name runs longer ("Leadership and Management Training for
 * youth and young people"), so programme bodies allow more room. A section
 * still only becomes rows when every paragraph opens this way.
 */
export const ACTIVITY_LIMITS: TermLimits = { maxChars: 64, maxWords: 10 };

function isTextBlock(block: PortableBlock): block is PortableTextBlock {
  return block._type === 'block';
}

export function blockText(block: PortableBlock): string {
  return isTextBlock(block) ? (block.children ?? []).map((child) => child.text).join('') : '';
}

/** Plain enough to lay out as rows: no formatting, though links are allowed. */
function isPlain(block: PortableBlock): boolean {
  if (!isTextBlock(block)) return false;
  const linkKeys = new Set(
    (block.markDefs ?? []).filter((def) => def._type === 'link').map((def) => def._key),
  );
  return (block.children ?? []).every((child) => (child.marks ?? []).every((m) => linkKeys.has(m)));
}

/**
 * The part of a row's text after its lead-in, as a block, so a link inside the
 * running text survives the split into "Term" and "rest".
 */
export function blockAfterLeadIn(block: PortableBlock, rest: string): PortableTextBlock | null {
  if (!isTextBlock(block)) return null;
  let skip = blockText(block).trimEnd().length - rest.length;
  const children = [];
  for (const child of block.children ?? []) {
    if (skip >= child.text.length) {
      skip -= child.text.length;
      continue;
    }
    children.push({ ...child, text: child.text.slice(skip) });
    skip = 0;
  }
  return { ...block, children };
}

export function hasLinkMarks(block: PortableBlock): boolean {
  return isTextBlock(block) && (block.markDefs ?? []).some((def) => def._type === 'link');
}

/**
 * "Integrity. We are honest…" → { term: "Integrity", rest: "We are honest…" }.
 * Accepts the Khmer full stop (។) as well as ".". Returns null when the
 * opening sentence is longer than a short term, so ordinary prose never splits.
 */
export function splitLeadIn(
  text: string,
  limits: TermLimits = TERM_LIMITS,
): { term: string; rest: string } | null {
  const match = /^([^.។]+)[.។]\s*([\s\S]+)$/.exec(text.trim());
  if (!match) return null;
  const term = match[1]!.trim();
  const rest = match[2]!.trim();
  if (!term || !rest || term.length > limits.maxChars) return null;
  if (term.split(/\s+/).length > limits.maxWords) return null;
  return { term, rest };
}

const POINT_MAX_CHARS = 60;
const POINT_MAX_WORDS = 6;

/**
 * "Integrated support: Responds to…" → { term: "Integrated support", rest: "Responds to…" }.
 * A bullet's lead-in runs longer than a value's name, so it gets a colon and
 * more room; a longer opening is ordinary prose and does not split.
 */
export function splitPoint(text: string): { term: string; rest: string } | null {
  const match = /^([^:：]+)[:：]\s*([\s\S]+)$/.exec(text.trim());
  if (!match) return null;
  const term = match[1]!.trim();
  const rest = match[2]!.trim();
  if (!term || !rest || term.length > POINT_MAX_CHARS) return null;
  if (term.split(/\s+/).length > POINT_MAX_WORDS) return null;
  return { term, rest };
}

export function layoutFor(
  blocks: PortableBlock[],
  limits: TermLimits = TERM_LIMITS,
): SectionLayout {
  if (blocks.length === 0 || !blocks.every(isTextBlock)) return 'prose';
  const text = blocks as PortableTextBlock[];
  if (
    text.length >= 3 &&
    text.every((block) => block.listItem && isPlain(block) && splitPoint(blockText(block)))
  ) {
    return 'points';
  }
  if (text.every((block) => block.listItem)) return 'facts';
  if (text.some((block) => block.listItem || (block.style && block.style !== 'normal')))
    return 'prose';
  if (text.length === 1 && blockText(text[0]!).length <= STATEMENT_MAX_CHARS) return 'statement';
  if (
    text.length >= 3 &&
    text.every((block) => isPlain(block) && splitLeadIn(blockText(block), limits))
  ) {
    return 'terms';
  }
  return 'prose';
}

export interface Chapter {
  heading: string;
  blocks: PortableBlock[];
}

/**
 * A long prose section that staff broke up with "### " headings, as chapters
 * a page can set side by side. Fewer than two "### " headings is no chapters.
 */
export function splitChapters(blocks: PortableBlock[]): {
  intro: PortableBlock[];
  chapters: Chapter[];
} {
  const intro: PortableBlock[] = [];
  const chapters: Chapter[] = [];
  for (const block of blocks) {
    if (isTextBlock(block) && block.style === 'h3') {
      chapters.push({ heading: blockText(block), blocks: [] });
    } else if (chapters.length > 0) {
      chapters[chapters.length - 1]!.blocks.push(block);
    } else {
      intro.push(block);
    }
  }
  return chapters.length >= 2 ? { intro, chapters } : { intro: blocks, chapters: [] };
}

export function splitBody(
  blocks: PortableBlock[] | null | undefined,
  limits: TermLimits = TERM_LIMITS,
): SplitBody {
  const lead: PortableBlock[] = [];
  const sections: Omit<BodySection, 'layout'>[] = [];

  for (const block of blocks ?? []) {
    if (isTextBlock(block) && block.style === 'h2') {
      sections.push({ heading: blockText(block), blocks: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1]!.blocks.push(block);
    } else {
      lead.push(block);
    }
  }

  return {
    lead,
    sections: sections
      .filter((section) => section.heading.trim() || section.blocks.length > 0)
      .map((section) => ({
        ...section,
        layout: layoutFor(section.blocks, limits),
      })),
  };
}
