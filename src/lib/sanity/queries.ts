/**
 * Every GROQ query in the project lives here.
 *
 * No inline query strings in pages or components — that is what makes a schema
 * change auditable in one file rather than archaeology across the codebase.
 */

/** Flattens the asset metadata we need for responsive images and LQIP blur-up. */
const IMAGE = `{
  asset,
  alt,
  caption,
  hotspot,
  crop,
  "lqip": asset->metadata.lqip,
  "dimensions": asset->metadata.dimensions
}`;

const FILE = `{
  "url": asset->url,
  "size": asset->size,
  "extension": asset->extension
}`;

const SEO = `{ title, description, noindex, image ${IMAGE} }`;

/**
 * Studio stores a body photo as `imageWithAlt`; the renderer draws `image`
 * blocks and needs the asset's dimensions to reserve its space.
 */
const BODY_BLOCK = `{
  ...,
  _type == "imageWithAlt" => {
    "_type": "image",
    "lqip": asset->metadata.lqip,
    "dimensions": asset->metadata.dimensions
  }
}`;

const BODY = `body{ "en": en[]${BODY_BLOCK}, "km": km[]${BODY_BLOCK} }`;

const FAQ = `{ question, answer }`;

const IMPACT_STAT = `{ _id, label, value, displayValue, prefix, suffix, context, countUp, order }`;

const PROGRAM_REF = `{ "slug": slug.current, title }`;

export const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  orgName, orgShortName, tagline, registration, address, mapUrl, geo,
  phone, email, partnerEmail, safeguardingContact, safeguardingEmail, officeHours, socials,
  logo ${IMAGE},
  ogImage ${IMAGE},
  homeHero[]${IMAGE},
  donationFaqs[]${FAQ},
  donation{
    note,
    qrCodes[]{ label, instructions, image ${IMAGE} },
    bankAccounts[]{ bankName, accountName, accountNumber, swift, branchAddress, currency },
    allocation[]{ label, percent, note }
  },
  footerNote
}`;

export const pageBySlugQuery = `*[_type == "page" && slug.current == $slug][0]{
  _id, "slug": slug.current, title, intro, ${BODY},
  faqs[]${FAQ},
  heroImage ${IMAGE},
  seo ${SEO}
}`;

export const programsQuery = `*[_type == "program"] | order(order asc, _createdAt asc){
  _id, "slug": slug.current, title, summary, order,
  image ${IMAGE},
  cardImage ${IMAGE}
}`;

export const programBySlugQuery = `*[_type == "program" && slug.current == $slug][0]{
  _id, "slug": slug.current, title, summary, ${BODY}, order,
  image ${IMAGE},
  "impactStats": impactStats[]->${IMPACT_STAT},
  seo ${SEO}
}`;

export const activitiesQuery = `*[_type == "activity" && defined(slug.current)] | order(publishedAt desc){
  _id, "slug": slug.current, title, excerpt, publishedAt, category, author, featured,
  coverImage ${IMAGE},
  program->${PROGRAM_REF}
}`;

export const activityBySlugQuery = `*[_type == "activity" && slug.current == $slug][0]{
  _id, "slug": slug.current, title, excerpt, ${BODY}, publishedAt, category, author,
  coverImage ${IMAGE},
  program->${PROGRAM_REF},
  seo ${SEO}
}`;

export const storiesQuery = `*[_type == "story" && consentConfirmed == true] | order(_createdAt desc){
  _id, quote, body, personName, personRole, useSilhouette,
  photo ${IMAGE},
  program->${PROGRAM_REF}
}`;

export const partnersQuery = `*[_type == "partner"] | order(order asc, name asc){
  _id, name, url, category, order,
  logo ${IMAGE}
}`;

export const reportsQuery = `*[_type == "report"] | order(year desc, _createdAt desc){
  _id, title, year, type, summary,
  "file": select(defined(file.asset) => file ${FILE}, defined(link) => { "url": link }),
  fileKm ${FILE}
}`;

export const teamQuery = `*[_type == "teamMember"] | order(order asc, _createdAt asc){
  _id, name, role, group, order, vacancy,
  "reportsTo": reportsTo._ref,
  photo ${IMAGE}
}`;

export const directorMessageQuery = `*[_type == "directorMessage"][0]{
  name, title, pullQuote, message,
  photo ${IMAGE},
  signature ${IMAGE}
}`;

export const orgChartQuery = `*[_type == "orgChart"][0]{
  caption, textVersion,
  image ${IMAGE}
}`;

/** Site-wide figures only: a statistic a program references belongs to that program's page. */
export const impactStatsQuery = `*[_type == "impactStat" && !(_id in *[_type == "program"].impactStats[]._ref)] | order(order asc, _createdAt asc)${IMPACT_STAT}`;
