import { defineField, defineType } from 'sanity';

/**
 * Alt text is required on every image field in this Studio.
 *
 * An image with no alt is invisible to a screen reader, and on this site the
 * org chart in particular is meaningless without it.
 */
export const imageWithAlt = defineType({
  name: 'imageWithAlt',
  title: 'Image',
  type: 'image',
  // Only lqip is extracted, so phone uploads never publish EXIF or GPS location.
  options: { hotspot: true, metadata: ['lqip'] },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text — describe the image in words',
      type: 'localeString',
      description:
        'What a person would see if the image loaded. For a chart or diagram, describe the relationships in words, not just the title.',
      validation: (rule) => rule.required().error('Alt text is required on every image.'),
    }),
    defineField({
      name: 'caption',
      title: 'Caption (optional)',
      type: 'localeString',
    }),
  ],
});

export const callout = defineType({
  name: 'callout',
  title: 'Callout',
  type: 'object',
  fields: [
    defineField({
      name: 'tone',
      title: 'Tone',
      type: 'string',
      options: {
        list: [
          { title: 'Information', value: 'info' },
          { title: 'Important', value: 'warning' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
    }),
    defineField({ name: 'text', title: 'Text', type: 'localeText' }),
  ],
  preview: {
    select: { title: 'text.en' },
    prepare: ({ title }) => ({
      title: title ?? 'Callout',
      subtitle: 'Callout',
    }),
  },
});

/**
 * A question and its answer.
 *
 * These are published as structured data, which is how a page gets picked up by
 * Google's "People also ask" and quoted by AI assistants. Write each answer so
 * it makes sense on its own, lifted away from the page around it — and keep it
 * factual. A vague answer is not quoted by anything.
 */
export const faqItem = defineType({
  name: 'faqItem',
  title: 'Question and answer',
  type: 'object',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'localeString',
      description: 'Write it the way someone would actually ask it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'localeText',
      description:
        'Two or three sentences. Must make sense on its own — it will be read without the rest of the page.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'question.en', subtitle: 'answer.en' },
  },
});

export const seo = defineType({
  name: 'seo',
  title: 'Search & social',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: 'title',
      title: 'Search-result title',
      type: 'localeString',
      description: 'Leave blank to use the page title.',
    }),
    defineField({
      name: 'description',
      title: 'Search-result description',
      type: 'localeText',
      description: 'Around 150 characters. Leave blank to use the page intro.',
    }),
    defineField({
      name: 'image',
      title: 'Social share image',
      type: 'imageWithAlt',
    }),
    defineField({
      name: 'noindex',
      title: 'Hide from search engines',
      type: 'boolean',
      initialValue: false,
    }),
  ],
});

export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (r) => r.required().uri({ scheme: ['http', 'https'] }),
    }),
  ],
  preview: { select: { title: 'platform', subtitle: 'url' } },
});

export const bankAccount = defineType({
  name: 'bankAccount',
  title: 'Bank account',
  type: 'object',
  fields: [
    defineField({ name: 'bankName', title: 'Bank name', type: 'string' }),
    defineField({ name: 'accountName', title: 'Account name', type: 'string' }),
    defineField({
      name: 'accountNumber',
      title: 'Account number',
      type: 'string',
    }),
    defineField({ name: 'swift', title: 'SWIFT / BIC', type: 'string' }),
    defineField({
      name: 'branchAddress',
      title: 'Branch address',
      type: 'string',
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'USD / KHR',
    }),
  ],
  preview: { select: { title: 'bankName', subtitle: 'accountNumber' } },
});

export const donationQr = defineType({
  name: 'donationQr',
  title: 'Donation QR code',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label (bank or wallet name)',
      type: 'localeString',
    }),
    defineField({
      name: 'image',
      title: 'QR code image',
      type: 'imageWithAlt',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'instructions',
      title: 'Line underneath',
      type: 'localeString',
    }),
  ],
  preview: { select: { title: 'label.en', media: 'image' } },
});

export const allocationItem = defineType({
  name: 'allocationItem',
  title: 'Allocation',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'localeString' }),
    defineField({
      name: 'percent',
      title: 'Percent',
      type: 'number',
      validation: (r) => r.required().min(0).max(100),
    }),
    defineField({ name: 'note', title: 'Note', type: 'localeText' }),
  ],
  preview: {
    select: { title: 'label.en', subtitle: 'percent' },
    prepare: ({ title, subtitle }) => ({
      title,
      subtitle: `${subtitle ?? 0}%`,
    }),
  },
});
