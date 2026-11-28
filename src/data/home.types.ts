/**
 * Temporary homepage copy, one typed file per language (home.en.ts, home.km.ts)
 * until the CMS has fields for it. Field names are the ones the CMS will use.
 */
export interface HomeProgrammeCopy {
  /** One-line summary shown on the programme card. */
  summary?: string;
  /** TODO(content): key number SKO chooses for the card; falls back to the programme's first result. */
  keyNumber?: string;
  /** TODO(content): label under the key number. */
  keyLabel?: string;
}

export interface HomeStoryCopy {
  /** Link text on the story card; defaults to "Read the story". */
  linkLabel?: string;
  /** TODO(content): Khan the family lives in, confirmed with SKO. */
  khan?: string;
}

export interface HomeExplainer {
  type: 'explainer' | 'facts';
  title: string;
  href: string;
}

export interface HomeData {
  programmes: Record<string, HomeProgrammeCopy>;
  stories: Record<string, HomeStoryCopy>;
  /** TODO(content): explainers need new writing from SKO; the section renders only when there are items. */
  explainers: HomeExplainer[];
}
