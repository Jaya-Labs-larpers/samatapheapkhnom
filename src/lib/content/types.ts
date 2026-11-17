/**
 * Shapes returned by the content layer.
 *
 * These are hand-written rather than generated because the GROQ projections in
 * queries.ts reshape Sanity's raw documents (flattening asset metadata, for
 * example). Once a real Sanity project exists, `npm run sanity:types` can
 * generate the raw document types and these stay as the projection contract.
 */

import type { Locale } from '../i18n/config';

export type LocaleString = Partial<Record<Locale, string | null>>;
export type LocaleBlocks = Partial<Record<Locale, PortableBlock[] | null>>;

/* --- Portable Text --------------------------------------------------------- */

export interface PortableSpan {
  _type: 'span';
  _key?: string;
  text: string;
  marks?: string[];
}

export interface PortableMarkDef {
  _key: string;
  _type: string;
  href?: string;
}

export interface PortableTextBlock {
  _type: 'block';
  _key?: string;
  style?: 'normal' | 'h2' | 'h3' | 'h4' | 'blockquote';
  listItem?: 'bullet' | 'number';
  level?: number;
  children?: PortableSpan[];
  markDefs?: PortableMarkDef[];
}

export interface PortableImageBlock {
  _type: 'image';
  _key?: string;
  alt?: LocaleString | null;
  caption?: LocaleString | null;
  asset?: CmsAsset | null;
  lqip?: string | null;
  dimensions?: CmsDimensions | null;
}

export interface PortableCalloutBlock {
  _type: 'callout';
  _key?: string;
  tone?: 'info' | 'warning';
  text?: LocaleString | null;
}

export type PortableBlock = PortableTextBlock | PortableImageBlock | PortableCalloutBlock;

/* --- Assets ---------------------------------------------------------------- */

export interface CmsAsset {
  _ref?: string;
  _id?: string;
  url?: string | null;
}

export interface CmsDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface CmsImage {
  asset?: CmsAsset | null;
  alt?: LocaleString | null;
  caption?: LocaleString | null;
  /** Low-quality image placeholder, from Sanity asset metadata. */
  lqip?: string | null;
  dimensions?: CmsDimensions | null;
  hotspot?: { x: number; y: number } | null;
  crop?: Record<string, number> | null;
}

export interface CmsFile {
  url?: string | null;
  size?: number | null;
  extension?: string | null;
}

/* --- Documents ------------------------------------------------------------- */

export interface Seo {
  title?: LocaleString | null;
  description?: LocaleString | null;
  image?: CmsImage | null;
  noindex?: boolean | null;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface BankAccount {
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  swift?: string | null;
  branchAddress?: string | null;
  currency?: string | null;
}

export interface DonationQr {
  label?: LocaleString | null;
  image?: CmsImage | null;
  instructions?: LocaleString | null;
}

export interface AllocationItem {
  label?: LocaleString | null;
  percent?: number | null;
  note?: LocaleString | null;
}

export interface SiteSettings {
  orgName?: LocaleString | null;
  orgShortName?: string | null;
  tagline?: LocaleString | null;
  logo?: CmsImage | null;
  ogImage?: CmsImage | null;
  /**
   * Photos behind the homepage hero card. One renders static; several
   * crossfade. Order is the display order.
   */
  homeHero?: CmsImage[] | null;
  registration?: LocaleString | null;
  address?: LocaleString | null;
  mapUrl?: string | null;
  geo?: { lat: number; lng: number } | null;
  phone?: string | null;
  email?: string | null;
  partnerEmail?: string | null;
  safeguardingContact?: LocaleString | null;
  /** Direct line for safeguarding concerns, offered instead of the form. */
  safeguardingEmail?: string | null;
  officeHours?: LocaleString | null;
  socials?: SocialLink[] | null;
  /** Questions shown on the Donate page and emitted as FAQPage structured data. */
  donationFaqs?: FaqItem[] | null;
  donation?: {
    qrCodes?: DonationQr[] | null;
    bankAccounts?: BankAccount[] | null;
    allocation?: AllocationItem[] | null;
    note?: LocaleBlocks | null;
  } | null;
  footerNote?: LocaleBlocks | null;
}

/**
 * A question and its answer, rendered on the page and emitted as FAQPage
 * structured data. Each answer must stand on its own — answer engines lift them
 * whole, without the surrounding page.
 */
export interface FaqItem {
  question?: LocaleString | null;
  answer?: LocaleString | null;
}

export interface Page {
  _id: string;
  slug: string;
  title?: LocaleString | null;
  intro?: LocaleString | null;
  heroImage?: CmsImage | null;
  body?: LocaleBlocks | null;
  faqs?: FaqItem[] | null;
  seo?: Seo | null;
}

export interface Program {
  _id: string;
  slug: string;
  title?: LocaleString | null;
  summary?: LocaleString | null;
  body?: LocaleBlocks | null;
  image?: CmsImage | null;
  /** The photo on the programme's card in listings; falls back to `image`. */
  cardImage?: CmsImage | null;
  order?: number | null;
  impactStats?: ImpactStat[] | null;
  seo?: Seo | null;
}

export interface Activity {
  _id: string;
  slug: string;
  title?: LocaleString | null;
  excerpt?: LocaleString | null;
  body?: LocaleBlocks | null;
  coverImage?: CmsImage | null;
  publishedAt?: string | null;
  category?: 'news' | 'event' | 'story' | 'announcement' | null;
  author?: string | null;
  featured?: boolean | null;
  program?: { slug: string; title?: LocaleString | null } | null;
  seo?: Seo | null;
}

export interface Story {
  _id: string;
  slug?: string | null;
  quote?: LocaleString | null;
  /** The story in full. When present it is shown instead of the pull quote. */
  body?: LocaleBlocks | null;
  personName?: string | null;
  personRole?: LocaleString | null;
  photo?: CmsImage | null;
  useSilhouette?: boolean | null;
  program?: { slug: string; title?: LocaleString | null } | null;
}

export interface Partner {
  _id: string;
  name: string;
  url?: string | null;
  logo?: CmsImage | null;
  category?: 'un-agency' | 'ingo' | 'government' | 'foundation' | 'corporate' | null;
  order?: number | null;
}

export interface Report {
  _id: string;
  title?: LocaleString | null;
  year?: number | null;
  type?: 'annual-report' | 'financial' | 'policy' | 'other' | null;
  summary?: LocaleString | null;
  file?: CmsFile | null;
  fileKm?: CmsFile | null;
}

export interface TeamMember {
  _id: string;
  name?: LocaleString | null;
  role?: LocaleString | null;
  photo?: CmsImage | null;
  group?: 'leadership' | 'board' | 'staff' | null;
  /** The _id of the person this member reports to, for the structure chart. */
  reportsTo?: string | null;
  /** A vacant seat shown in the chart, such as "Volunteer / Internship". */
  vacancy?: boolean | null;
  order?: number | null;
}

export interface DirectorMessage {
  name?: LocaleString | null;
  title?: LocaleString | null;
  photo?: CmsImage | null;
  pullQuote?: LocaleString | null;
  message?: LocaleBlocks | null;
  signature?: CmsImage | null;
}

export interface OrgChart {
  image?: CmsImage | null;
  caption?: LocaleString | null;
  textVersion?: LocaleBlocks | null;
}

export interface ImpactStat {
  _id: string;
  label?: LocaleString | null;
  value?: number | null;
  displayValue?: string | null;
  prefix?: LocaleString | null;
  suffix?: LocaleString | null;
  context?: LocaleString | null;
  countUp?: boolean | null;
  order?: number | null;
}
