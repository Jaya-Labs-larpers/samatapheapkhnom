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
      { path: '/about/approach', key: 'aboutApproach' },
      { path: '/about/partnerships', key: 'aboutPartnerships' },
      { path: '/about/leadership', key: 'aboutLeadership' },
      { path: '/team', key: 'ourTeam' },
      { path: '/faq', key: 'navFaq' },
    ],
  },
  { key: 'navWork', path: '/programs', programs: true },
  {
    key: 'navImpact',
    path: '/impact',
    sections: [
      { path: '/impact/projects', key: 'impactProjects' },
      { path: '/activities', key: 'navActivities' },
      { path: '/programs', key: 'ourPrograms' },
    ],
  },
  { key: 'navGetInvolved', path: '/contact' },
];

export const mobileNav: NavItem[] = [
  { key: 'navAbout', path: '/about' },
  { key: 'aboutApproach', path: '/about/approach' },
  { key: 'aboutPartnerships', path: '/about/partnerships' },
  { key: 'aboutLeadership', path: '/about/leadership' },
  { key: 'ourTeam', path: '/team' },
  { key: 'navWork', path: '/programs' },
  { key: 'navImpact', path: '/impact' },
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
      { key: 'ourTeam', path: '/team' },
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
