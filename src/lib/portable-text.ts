/**
 * Portable Text → HTML.
 *
 * Written by hand rather than pulled from a package so the markup matches the
 * design system exactly (external links get rel="noopener noreferrer", images
 * carry captions and required alt, headings start at h2 because the page owns
 * the h1).
 *
 * Every text node is escaped before it reaches the output, so the result is
 * safe for `set:html` even though the source is trusted CMS content.
 */

import type { Locale } from './i18n/config';
import { pick, text } from './i18n/utils';
import { hasImage, imageSrcSet, imageUrl } from './sanity/image';
import type {
  PortableBlock,
  PortableCalloutBlock,
  PortableImageBlock,
  PortableTextBlock,
} from './content/types';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isTextBlock(block: PortableBlock): block is PortableTextBlock {
  return block._type === 'block';
}

function isImageBlock(block: PortableBlock): block is PortableImageBlock {
  return block._type === 'image';
}

function isCalloutBlock(block: PortableBlock): block is PortableCalloutBlock {
  return block._type === 'callout';
}

/** The inline HTML of one text block, without its <p> or <li> wrapper. */
export function renderSpans(block: PortableTextBlock): string {
  const markDefs = block.markDefs ?? [];

  return (block.children ?? [])
    .map((span) => {
      let html = esc(span.text ?? '');
      for (const mark of span.marks ?? []) {
        const def = markDefs.find((entry) => entry._key === mark);
        if (def?._type === 'link' && def.href) {
          const href = esc(def.href);
          const external = /^https?:\/\//i.test(def.href);
          const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
          html = `<a href="${href}"${attrs}>${html}${external ? '<span aria-hidden="true"> ↗</span>' : ''}</a>`;
          continue;
        }
        switch (mark) {
          case 'strong':
            html = `<strong>${html}</strong>`;
            break;
          case 'em':
            html = `<em>${html}</em>`;
            break;
          case 'underline':
            html = `<u>${html}</u>`;
            break;
          case 'code':
            html = `<code>${html}</code>`;
            break;
          default:
            break;
        }
      }
      return html;
    })
    .join('');
}

function renderImage(block: PortableImageBlock, lang: Locale): string {
  // An image block whose asset has not been uploaded yet is dropped rather than
  // drawn as an empty frame. Unlike a card or a hero this reserves no slot in
  // the layout, so there is nothing to hold open, and a caption without its
  // picture reads as a mistake.
  if (!hasImage(block)) return '';

  const alt = esc(text(block.alt, lang));
  const captionPicked = pick(block.caption, lang);
  const caption = captionPicked.value ? esc(captionPicked.value) : '';
  const captionLang = captionPicked.isFallback ? ` lang="${captionPicked.lang}"` : '';

  const src = imageUrl(block, { width: 1200 });
  const srcset = imageSrcSet(block);
  const width = block.dimensions?.width ?? 1200;
  const height = block.dimensions?.height ?? 800;
  const media = `<img src="${esc(src ?? '')}" srcset="${esc(srcset ?? '')}" sizes="(min-width: 48rem) 44rem, 100vw" width="${width}" height="${height}" alt="${alt}" loading="lazy" decoding="async" class="w-full rounded-[var(--radius-lg)]">`;

  const figcaption = caption
    ? `<figcaption class="mt-3 text-[color:var(--color-ink-400)] text-[0.9375rem]"${captionLang}>${caption}</figcaption>`
    : '';

  return `<figure class="my-8">${media}${figcaption}</figure>`;
}

function renderCallout(block: PortableCalloutBlock, lang: Locale): string {
  const picked = pick(block.text, lang);
  if (!picked.value) return '';
  const langAttr = picked.isFallback ? ` lang="${picked.lang}"` : '';
  const tone =
    block.tone === 'warning'
      ? 'background:var(--color-danger-50);border-color:var(--color-danger-700)'
      : 'background:var(--color-aqua-50);border-color:var(--color-blue-700)';
  return `<aside class="my-6 border-l-[3px] px-5 py-4 rounded-r-[var(--radius-md)]" style="${tone}"${langAttr}>${esc(picked.value)}</aside>`;
}

/** Convert a locale-resolved block array into HTML. */
export function blocksToHtml(blocks: PortableBlock[] | null | undefined, lang: Locale): string {
  if (!blocks || blocks.length === 0) return '';

  const output: string[] = [];
  let listType: 'bullet' | 'number' | null = null;

  const closeList = () => {
    if (listType) {
      output.push(listType === 'number' ? '</ol>' : '</ul>');
      listType = null;
    }
  };

  for (const block of blocks) {
    if (isImageBlock(block)) {
      closeList();
      output.push(renderImage(block, lang));
      continue;
    }
    if (isCalloutBlock(block)) {
      closeList();
      output.push(renderCallout(block, lang));
      continue;
    }
    if (!isTextBlock(block)) continue;

    const inner = renderSpans(block);
    if (inner.trim() === '') continue;

    if (block.listItem) {
      if (listType !== block.listItem) {
        closeList();
        listType = block.listItem;
        output.push(listType === 'number' ? '<ol>' : '<ul>');
      }
      output.push(`<li>${inner}</li>`);
      continue;
    }

    closeList();
    switch (block.style) {
      case 'h2':
        output.push(`<h2>${inner}</h2>`);
        break;
      case 'h3':
        output.push(`<h3>${inner}</h3>`);
        break;
      case 'h4':
        output.push(`<h4>${inner}</h4>`);
        break;
      case 'blockquote':
        output.push(`<blockquote>${inner}</blockquote>`);
        break;
      default:
        output.push(`<p>${inner}</p>`);
    }
  }

  closeList();
  return output.join('\n');
}

/** Plain text, for meta descriptions and excerpts. */
export function blocksToPlainText(blocks: PortableBlock[] | null | undefined, limit = 160): string {
  if (!blocks) return '';
  const parts: string[] = [];
  for (const block of blocks) {
    if (!isTextBlock(block)) continue;
    for (const span of block.children ?? []) parts.push(span.text ?? '');
  }
  const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
  return joined.length > limit ? `${joined.slice(0, limit - 1).trimEnd()}…` : joined;
}
