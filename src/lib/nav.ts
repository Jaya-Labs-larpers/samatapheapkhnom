import type { UIKey } from './i18n/strings';

export interface NavLink {
  label: string;
  path: string;
}

export interface NavSection {
  /** The id of the section on the page, or the path of a page of its own. */
  id?: string;
  path?: string;
  key: UIKey;
}

export interface NavItem {
  key: UIKey;
  path: string;
  /** In-page sections listed in the dropdown. */
  sections?: NavSection[];
  /** Dropdown lists each program, linking to its own page. */
  programs?: boolean;
}

export const mainNav: NavItem[] = [
  {
    key: 'navAbout',
    path: '/about',
    sections: [
      { id: 'director', key: 'directorMessage' },
      { path: '/team', key: 'ourTeam' },
      { id: 'faq', key: 'faqHeading' },
    ],
  },
  { key: 'navWork', path: '/programs', programs: true },
  {
    key: 'navImpact',
    path: '/impact',
    sections: [
      { id: 'results', key: 'resultsAtAGlance' },
      { id: 'programs', key: 'ourPrograms' },
    ],
  },
  { key: 'navActivities', path: '/activities' },
  { key: 'navGetInvolved', path: '/contact' },
];

export const mobileNav: NavItem[] = [
  { key: 'navAbout', path: '/about' },
  { key: 'ourTeam', path: '/team' },
  { key: 'navWork', path: '/programs' },
  { key: 'navImpact', path: '/impact' },
  { key: 'navActivities', path: '/activities' },
  { key: 'navReports', path: '/reports' },
  { key: 'navSafeguarding', path: '/safeguarding' },
  { key: 'navPartners', path: '/partners' },
  { key: 'navFaq', path: '/faq' },
  { key: 'navContact', path: '/contact' },
];

export interface FooterColumn {
  id: string;
  heading: string;
  links: NavLink[];
}

export const footerColumns: FooterColumn[] = [
  {
    id: 'action',
    heading: 'Take action',
    links: [
      { label: 'Donate', path: '/donate' },
      { label: 'Make a major gift', path: '/majorgifts' },
      { label: 'Legacy gifts', path: '/legacy-giving' },
      { label: 'Ways to give', path: '/ways-to-give' },
      { label: 'Edit monthly donation', path: '/donor-sign-in' },
      { label: 'Download receipts', path: '/donor-sign-in' },
      { label: 'Employer match', path: '/employer-matching' },
      { label: 'Fundraise', path: '/fundraise' },
      { label: 'Start a corporate partnership', path: '/corporate-partnerships' },
      { label: 'Organize a workplace talk', path: '/workplace-talk' },
    ],
  },
  {
    id: 'focus',
    heading: 'Focus areas',
    links: [
      { label: 'Poverty relief', path: '/poverty-relief' },
      { label: 'Emergency cash', path: '/relief' },
      { label: 'Climate survival', path: '/climate' },
      { label: 'Basic income', path: '/ubi' },
      { label: 'Refugees', path: '/refugees' },
      { label: 'United States', path: '/united-states' },
      { label: 'Sadaqah', path: '/sadaqah' },
    ],
  },
  {
    id: 'organisation',
    heading: 'Organization',
    links: [
      { label: 'About', path: '/about' },
      { label: 'Values', path: '/values' },
      { label: 'People', path: '/team' },
      { label: 'Risks', path: '/risks' },
    ],
  },
  {
    id: 'resources',
    heading: 'Resources',
    links: [
      { label: 'Policy & advocacy', path: '/policy-and-advocacy' },
      { label: 'Financials', path: '/financials' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Blog', path: '/blog' },
      { label: 'Careers', path: '/careers' },
      { label: 'RFPs & RFQs', path: '/rfp' },
      { label: 'Press', path: '/press' },
    ],
  },
  {
    id: 'connected',
    heading: 'Stay connected',
    links: [
      { label: 'Newsletter', path: '/email-sign-up' },
      { label: 'Contact us', path: '/contact' },
      { label: 'Press inquiries', path: '/press' },
    ],
  },
];

export const legalLinks: NavLink[] = [
  { label: 'Privacy policy', path: '/privacy-policy' },
  { label: 'Terms of use', path: '/terms-of-use' },
  { label: 'Charity disclosure', path: '/charity-disclosure' },
];
