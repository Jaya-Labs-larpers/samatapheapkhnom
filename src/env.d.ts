/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DEPLOYMENT_ENV?: string;
  readonly PUBLIC_CONTENT_SOURCE?: string;
  readonly PUBLIC_CONTACT_ENABLED?: string;
  /** "false" turns smooth scrolling off site-wide. */
  readonly PUBLIC_SMOOTH_SCROLL?: string;
  /** Sanity project id. Blank means "build from local fixtures". */
  readonly PUBLIC_SANITY_PROJECT_ID?: string;
  readonly PUBLIC_SANITY_DATASET?: string;
  readonly PUBLIC_SANITY_API_VERSION?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
