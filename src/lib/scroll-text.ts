const REVEAL_STEP = 2;
const REVEAL_SPAN = 10;

interface Segment {
  segment: string;
  isWordLike?: boolean;
}

interface Segmenter {
  segment(text: string): Iterable<Segment>;
}

type SegmenterFactory = (locale: string, granularity: 'word' | 'grapheme') => Segmenter;

const defaultSegmenter: SegmenterFactory = (locale, granularity) =>
  new Intl.Segmenter(locale, { granularity });

/**
 * Khmer is written without spaces and its letters stack into clusters, so it is
 * revealed a word at a time; other languages a character at a time, inside
 * words that never break.
 */
export function splitUnits(
  text: string,
  locale: string,
  segmenter: SegmenterFactory = defaultSegmenter,
): { words: string[][]; whole: boolean } {
  if (locale.startsWith('km')) {
    const units = [...segmenter(locale, 'word').segment(text)].map((part) => part.segment);
    return { words: [units], whole: true };
  }
  const words = text.split(/(\s+)/).filter((part) => part !== '');
  const graphemes = segmenter(locale, 'grapheme');
  return {
    words: words.map((word) =>
      /^\s+$/.test(word) ? [word] : [...graphemes.segment(word)].map((part) => part.segment),
    ),
    whole: false,
  };
}

export function revealWindow(units: number): number {
  return REVEAL_SPAN + REVEAL_STEP * Math.max(units - 1, 0);
}

/**
 * [data-scroll-text] is written out as the visitor scrolls past it: each unit
 * darkens from the dim colour to the text colour in turn. The sentence is
 * readable at every moment, and without this script it is plain text.
 */
export function initScrollText(root: ParentNode = document): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof Intl.Segmenter !== 'function') return;

  for (const el of root.querySelectorAll<HTMLElement>('[data-scroll-text]')) {
    const text = el.textContent ?? '';
    if (el.children.length > 0 || text.trim() === '') continue;
    const locale = el.lang || document.documentElement.lang || 'en';
    const { words, whole } = splitUnits(text, locale);

    el.setAttribute('aria-label', text);
    el.classList.add('scroll-text');
    el.replaceChildren();
    let index = 0;
    for (const word of words) {
      const holder =
        whole || (word.length === 1 && /^\s+$/.test(word[0]!))
          ? el
          : document.createElement('span');
      if (holder !== el) {
        holder.className = 'scroll-text__word';
        holder.setAttribute('aria-hidden', 'true');
        el.append(holder);
      }
      for (const unit of word) {
        if (/^\s+$/.test(unit)) {
          el.append(unit);
          continue;
        }
        const span = document.createElement('span');
        span.className = 'scroll-text__u';
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--i', String(index++));
        span.textContent = unit;
        holder.append(span);
      }
    }
    el.style.setProperty('--n', String(revealWindow(index)));
    el.dataset.scrub = '';
    el.dataset.scrubStart ??= 'top 70%';
    el.dataset.scrubEnd ??= 'bottom 70%';
  }
}
