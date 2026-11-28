import type { UIKey } from './i18n/strings';

export interface NavLink {
  label: string;
  path: string;
}

export interface NavItem {
  key: UIKey;
  path: string;
}

export const mainNav: NavItem[] = [
  { key: 'navAbout', path: '/about' },
  { key: 'navWork', path: '/programs' },
  { key: 'navImpact', path: '/impact' },
  { key: 'navActivities', path: '/activities' },
  { key: 'navGetInvolved', path: '/contact' },
];

export const mobileNav: NavItem[] = [
  { key: 'navAbout', path: '/about' },
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
  headingKey: UIKey;
  links: NavItem[];
}

/** Only pages that exist on the site. */
export const footerColumns: FooterColumn[] = [
  {
    id: 'organisation',
    headingKey: 'footerOrganisation',
    links: [
      { key: 'navAbout', path: '/about' },
      { key: 'navPartners', path: '/partners' },
      { key: 'navSafeguarding', path: '/safeguarding' },
      { key: 'navFaq', path: '/faq' },
    ],
  },
  {
    id: 'work',
    headingKey: 'navWork',
    links: [
      { key: 'navPrograms', path: '/programs' },
      { key: 'navImpact', path: '/impact' },
      { key: 'navActivities', path: '/activities' },
      { key: 'navReports', path: '/reports' },
    ],
  },
];
