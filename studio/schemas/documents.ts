import { defineField, defineType } from 'sanity';

/* ===========================================================================
   SAFEGUARDING NOTE — read before adding a field to any schema here.

   Nothing in this dataset is private. The `production` dataset is public and
   the website build reads it without a token (ADR-004). That is safe only
   because no field anywhere models a beneficiary's real name, age, address,
   school, or case detail — and none ever may.

   If SKO one day needs genuinely private content in the CMS, that is a change
   to ADR-004, not a quiet addition of a token.
   =========================================================================== */

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'contact', title: 'Contact' },
    { name: 'donation', title: 'Donation' },
  ],
  fields: [
    defineField({
      name: 'orgName',
      title: 'Organisation name',
      type: 'localeString',
      group: 'identity',
    }),
    defineField({
      name: 'orgShortName',
      title: 'Short name (e.g. SKO)',
      type: 'string',
      group: 'identity',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'localeString',
      group: 'identity',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'imageWithAlt',
      group: 'identity',
    }),
    defineField({
      name: 'ogImage',
      title: 'Default social share image',
      type: 'imageWithAlt',
      group: 'identity',
      description: 'Shown when someone shares a link to this site. 1200×630 works best.',
    }),
    defineField({
      name: 'homeHero',
      title: 'Homepage hero photos',
      type: 'array',
      of: [{ type: 'imageWithAlt' }],
      group: 'identity',
      description:
        'The large photo at the top of the homepage. Add one for a still image, or three to four to have them fade slowly from one to the next. Text never sits directly on them — a white card holds the words — so you do not need to worry about a photo being too busy or too light. Only the first loads straight away; the rest arrive afterwards, so extra photos cost visitors on mobile data very little.',
      validation: (rule) =>
        rule.max(5).warning('More than four or five is rarely worth the extra weight.'),
    }),
    defineField({
      name: 'registration',
      title: 'Registration line',
      type: 'localeString',
      group: 'identity',
      description:
        'Shown on the homepage and in the footer. E.g. Ministry of Interior registration.',
    }),

    defineField({
      name: 'address',
      title: 'Address',
      type: 'localeText',
      group: 'contact',
    }),
    defineField({
      name: 'officeHours',
      title: 'Office hours',
      type: 'localeString',
      group: 'contact',
    }),
    defineField({
      name: 'mapUrl',
      title: 'Google Maps link',
      type: 'url',
      group: 'contact',
      validation: (r) => r.uri({ scheme: ['https', 'http'] }),
      description: 'A link, not an embed — an embedded map would load third-party trackers.',
    }),
    defineField({
      name: 'geo',
      title: 'Coordinates',
      type: 'object',
      group: 'contact',
      options: { columns: 2 },
      fields: [
        defineField({ name: 'lat', title: 'Latitude', type: 'number' }),
        defineField({ name: 'lng', title: 'Longitude', type: 'number' }),
      ],
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
      group: 'contact',
    }),
    defineField({
      name: 'email',
      title: 'General email',
      type: 'string',
      group: 'contact',
      validation: (r) => r.email(),
    }),
    defineField({
      name: 'partnerEmail',
      title: 'Partnerships / grants email',
      type: 'string',
      group: 'contact',
      validation: (r) => r.email(),
      description: 'Where the partner inquiry form is delivered.',
    }),
    defineField({
      name: 'safeguardingEmail',
      title: 'Safeguarding email',
      type: 'string',
      group: 'contact',
      description:
        'Offered on the contact page when a visitor chooses “Safeguarding concern”, instead of the form.',
      validation: (r) => r.email(),
    }),
    defineField({
      name: 'safeguardingContact',
      title: 'Safeguarding contact note',
      type: 'localeText',
      group: 'contact',
      description:
        'Shown on the contact page. Tells people to report a safeguarding concern directly rather than through the form.',
    }),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      of: [{ type: 'socialLink' }],
      group: 'contact',
    }),
    defineField({
      name: 'donationFaqs',
      title: 'Donation questions',
      type: 'array',
      of: [{ type: 'faqItem' }],
      group: 'donation',
      description:
        'Shown at the bottom of the Donate page and published as structured data. "How can I donate?", "Can I get a receipt?", "Where does my money go?" are the ones people actually ask.',
    }),

    defineField({
      name: 'donation',
      title: 'Donation details',
      type: 'object',
      group: 'donation',
      description:
        'QR images and bank details only. This site never collects card details — there are no payment fields anywhere and there never will be.',
      fields: [
        defineField({
          name: 'qrCodes',
          title: 'QR codes',
          type: 'array',
          of: [{ type: 'donationQr' }],
        }),
        defineField({
          name: 'bankAccounts',
          title: 'Bank accounts',
          type: 'array',
          of: [{ type: 'bankAccount' }],
        }),
        defineField({
          name: 'allocation',
          title: 'Where your money goes',
          type: 'array',
          of: [{ type: 'allocationItem' }],
        }),
        defineField({
          name: 'note',
          title: 'Receipt / tax note',
          type: 'localeBlock',
        }),
      ],
    }),

    defineField({
      name: 'footerNote',
      title: 'Footer note',
      type: 'localeBlock',
      group: 'identity',
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      options: { source: 'title.en', maxLength: 96 },
      description: 'Latin letters only. The same slug is used for both languages.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'intro', title: 'Intro', type: 'localeText' }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'imageWithAlt',
    }),
    defineField({ name: 'body', title: 'Body', type: 'localeBlock' }),
    defineField({
      name: 'faqs',
      title: 'Common questions',
      type: 'array',
      of: [{ type: 'faqItem' }],
      description:
        'Shown at the bottom of the page and published as structured data, which is how Google and AI assistants pick up answers. Three to six good questions beat a long list.',
    }),
    defineField({ name: 'seo', title: 'Search & social', type: 'seo' }),
  ],
  preview: { select: { title: 'title.en', subtitle: 'slug.current' } },
});

export const program = defineType({
  name: 'program',
  title: 'Program',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      options: { source: 'title.en', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'summary',
      title: 'One-line summary',
      type: 'localeText',
    }),
    defineField({ name: 'body', title: 'Body', type: 'localeBlock' }),
    defineField({ name: 'image', title: 'Image', type: 'imageWithAlt' }),
    defineField({
      name: 'cardImage',
      title: 'Card image',
      type: 'imageWithAlt',
      description:
        'Shown on the programme card on the homepage and programme list. Leave empty to reuse the main image.',
    }),
    defineField({
      name: 'impactStats',
      title: 'Impact statistics',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'impactStat' }] }],
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 10,
    }),
    defineField({ name: 'seo', title: 'Search & social', type: 'seo' }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'order',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: { select: { title: 'title.en', media: 'image' } },
});

export const activity = defineType({
  name: 'activity',
  title: 'Activity / news',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      options: { source: 'title.en', maxLength: 96 },
      description: 'Latin letters only — the same URL serves both languages.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'News', value: 'news' },
          { title: 'Event', value: 'event' },
          { title: 'Story', value: 'story' },
          { title: 'Announcement', value: 'announcement' },
        ],
      },
      initialValue: 'news',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'imageWithAlt',
    }),
    defineField({ name: 'excerpt', title: 'Summary', type: 'localeText' }),
    defineField({ name: 'body', title: 'Body', type: 'localeBlock' }),
    defineField({
      name: 'program',
      title: 'Related program',
      type: 'reference',
      to: [{ type: 'program' }],
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      initialValue: 'SKO Communications',
    }),
    defineField({
      name: 'featured',
      title: 'Show on the homepage',
      type: 'boolean',
      initialValue: false,
      description: 'The three most recent featured posts appear on the homepage.',
    }),
    defineField({ name: 'seo', title: 'Search & social', type: 'seo' }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'newest',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title.en', date: 'publishedAt', media: 'coverImage' },
    prepare: ({ title, date, media }) => ({
      title: title ?? '(untitled)',
      subtitle: date ? new Date(date).toLocaleDateString('en-GB') : 'No date',
      media,
    }),
  },
});

export const story = defineType({
  name: 'story',
  title: 'Story / testimonial',
  type: 'document',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'localeText',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'personName',
      title: 'Name shown',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'body',
      title: 'Full story (optional)',
      type: 'localeBlock',
      description: 'The story in full. When filled in, it is shown instead of the quote.',
    }),
    defineField({ name: 'personRole', title: 'Role', type: 'localeString' }),
    defineField({
      name: 'photo',
      title: 'Photo (optional)',
      type: 'imageWithAlt',
    }),
    defineField({
      name: 'useSilhouette',
      title: 'Use an illustrated avatar instead of a photo',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'program',
      title: 'Program',
      type: 'reference',
      to: [{ type: 'program' }],
    }),
    defineField({
      name: 'consentConfirmed',
      title: 'Consent confirmed',
      type: 'boolean',
      initialValue: false,
      description:
        'Tick only when documented consent exists for publishing this story. This story will not appear on the website until this is ticked.',
      validation: (r) =>
        r.custom((value) =>
          value === true ? true : 'Consent must be confirmed before this story can be published.',
        ),
    }),
  ],
  preview: {
    select: { title: 'personName', subtitle: 'quote.en', media: 'photo' },
  },
});

export const partner = defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'imageWithAlt',
      description: 'SVG or transparent PNG. Confirm the partner permits use of their logo.',
    }),
    defineField({
      name: 'url',
      title: 'Website',
      type: 'url',
      validation: (r) => r.uri({ scheme: ['https', 'http'] }),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'UN agency', value: 'un-agency' },
          { title: 'International NGO', value: 'ingo' },
          { title: 'Government', value: 'government' },
          { title: 'Foundation', value: 'foundation' },
          { title: 'Corporate', value: 'corporate' },
        ],
      },
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 10,
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'category', media: 'logo' } },
});

export const report = defineType({
  name: 'report',
  title: 'Report / policy',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Annual report', value: 'annual-report' },
          { title: 'Financial statement', value: 'financial' },
          { title: 'Policy', value: 'policy' },
          { title: 'Other', value: 'other' },
        ],
      },
      initialValue: 'annual-report',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'summary', title: 'Summary', type: 'localeText' }),
    defineField({
      name: 'file',
      title: 'PDF (English)',
      type: 'file',
      options: { accept: '.pdf' },
      validation: (r) =>
        r.custom((value, context) =>
          value?.asset || (context.document as { link?: string } | undefined)?.link
            ? true
            : 'Upload the PDF, or add a link below.',
        ),
    }),
    defineField({
      name: 'link',
      title: 'Link instead of a PDF (optional)',
      type: 'url',
      description:
        'Where the report lives until the PDF is uploaded here, such as a shared folder. Ignored once a PDF is uploaded above.',
      validation: (r) => r.uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'fileKm',
      title: 'PDF (Khmer, optional)',
      type: 'file',
      options: { accept: '.pdf' },
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'imageWithAlt',
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'year',
      by: [{ field: 'year', direction: 'desc' }],
    },
  ],
  preview: { select: { title: 'title.en', subtitle: 'year' } },
});

export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team member',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'localeString',
      description: 'Khmer and Latin spelling of the same name.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'role', title: 'Role', type: 'localeString' }),
    defineField({ name: 'photo', title: 'Photo', type: 'imageWithAlt' }),
    defineField({ name: 'bio', title: 'Short bio', type: 'localeText' }),
    defineField({
      name: 'reportsTo',
      title: 'Reports to',
      type: 'reference',
      to: [{ type: 'teamMember' }],
      description:
        'Places this person under their manager in the structure chart on the About page.',
    }),
    defineField({
      name: 'vacancy',
      title: 'Vacant seat',
      type: 'boolean',
      description:
        'An open position shown in the chart, such as “Volunteer / Internship”. Put the position in Name.',
      initialValue: false,
    }),
    defineField({
      name: 'group',
      title: 'Group',
      type: 'string',
      options: {
        list: [
          { title: 'Leadership', value: 'leadership' },
          { title: 'Board', value: 'board' },
          { title: 'Staff', value: 'staff' },
        ],
      },
      initialValue: 'staff',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 10,
    }),
  ],
  preview: {
    select: { title: 'name.en', subtitle: 'role.en', media: 'photo' },
  },
});

export const directorMessage = defineType({
  name: 'directorMessage',
  title: "Director's message",
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'localeString' }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      initialValue: undefined,
    }),
    defineField({ name: 'photo', title: 'Portrait', type: 'imageWithAlt' }),
    defineField({
      name: 'pullQuote',
      title: 'Pull quote',
      type: 'localeString',
      description: 'One sentence, set large above the message.',
    }),
    defineField({ name: 'message', title: 'Message', type: 'localeBlock' }),
    defineField({
      name: 'signature',
      title: 'Signature image (optional)',
      type: 'imageWithAlt',
    }),
  ],
  preview: { prepare: () => ({ title: "Director's message" }) },
});

export const orgChart = defineType({
  name: 'orgChart',
  title: 'Organizational structure',
  type: 'document',
  fields: [
    defineField({
      name: 'image',
      title: 'Chart image',
      type: 'imageWithAlt',
      description:
        'In the alt text, describe the reporting lines in words — "Board of Directors oversees the Executive Director, who oversees…". A screen reader cannot see the picture.',
    }),
    defineField({ name: 'caption', title: 'Caption', type: 'localeString' }),
    defineField({
      name: 'textVersion',
      title: 'Text version',
      type: 'localeBlock',
      description:
        'The same structure written as a nested list. Shown in a "read as text" panel under the image — this is what makes the page usable on a phone and for screen readers.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Organizational structure' }) },
});

export const impactStat = defineType({
  name: 'impactStat',
  title: 'Impact statistic',
  type: 'document',
  fields: [
    defineField({
      name: 'value',
      title: 'Value',
      type: 'number',
      description: 'The raw number. Used for sorting and structured data.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'displayValue',
      title: 'Display value (optional)',
      type: 'string',
      description:
        'What visitors actually see. Use this for "10,000+", "96%" or Khmer numerals. Leave blank to show the raw number formatted for the language.',
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'localeString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'prefix',
      title: 'Prefix (optional)',
      type: 'localeString',
      description: 'A qualifier set small before the figure, such as “Nearly”.',
    }),
    defineField({
      name: 'suffix',
      title: 'Suffix (optional)',
      type: 'localeString',
    }),
    defineField({
      name: 'context',
      title: 'Context line',
      type: 'localeString',
      description:
        'The line underneath, e.g. "since 2007" or "2025 cohort". A number without context reads as marketing; a number with it reads as evidence. Please always fill this in.',
      validation: (r) =>
        r.warning('A statistic without context is much less credible to a funder.'),
    }),
    defineField({
      name: 'countUp',
      title: 'Count up when it comes into view',
      type: 'boolean',
      description:
        'Rolls the figure up from zero over about two seconds. On unless switched off; a plain year such as 2007 never rolls.',
      initialValue: true,
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 10,
    }),
  ],
  preview: {
    select: { title: 'displayValue', value: 'value', subtitle: 'label.en' },
    prepare: ({ title, value, subtitle }) => ({
      title: title ?? String(value ?? ''),
      subtitle,
    }),
  },
});
