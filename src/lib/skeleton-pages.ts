export type SkeletonType =
  | 'info'
  | 'focus'
  | 'country'
  | 'giving'
  | 'campaign'
  | 'blog'
  | 'post'
  | 'faq'
  | 'financials'
  | 'contact'
  | 'press'
  | 'careers'
  | 'legal';

export interface SkeletonPage {
  path: string;
  title: string;
  type: SkeletonType;
}

const pages = (type: SkeletonType, entries: Array<[string, string]>): SkeletonPage[] =>
  entries.map(([path, title]) => ({ path, title, type }));

export const skeletonPages: SkeletonPage[] = [
  ...pages('info', [
    ['/values', 'Our values'],
    ['/team', 'Our team'],
    ['/how-it-works', 'How it works'],
    ['/research-on-cash-transfers', 'Research on cash transfers'],
    ['/our-research', 'Our research'],
    ['/live-stories', 'Live stories'],
    ['/funders-and-partners', 'Funders and partners'],
    ['/policy-and-advocacy', 'Policy and advocacy'],
    ['/risks', 'Risks'],
    ['/debunking-myths', 'Debunking myths'],
    ['/avoiding-scams', 'Avoiding scams'],
    ['/where-your-donations-go', 'Where your donations go'],
    ['/rfp', 'RFPs and RFQs'],
    ['/email-sign-up', 'Newsletter sign up'],
    ['/fundraise', 'Fundraise'],
  ]),
  ...pages('focus', [
    ['/poverty-relief', 'Poverty relief'],
    ['/relief', 'Emergency cash'],
    ['/climate', 'Climate survival'],
    ['/ubi', 'Basic income'],
    ['/refugees', 'Refugees'],
    ['/sadaqah', 'Sadaqah'],
    ['/zakat', 'Zakat'],
    ['/rural-us', 'Rural U.S.'],
  ]),
  ...pages('country', [
    ['/drc', 'DRC'],
    ['/kenya', 'Kenya'],
    ['/malawi', 'Malawi'],
    ['/mozambique', 'Mozambique'],
    ['/rwanda', 'Rwanda'],
    ['/uganda', 'Uganda'],
    ['/united-states', 'United States'],
    ['/uk', 'United Kingdom'],
    ['/philippines', 'Philippines'],
  ]),
  ...pages('giving', [
    ['/ways-to-give', 'Ways to give'],
    ['/majorgifts', 'Major gifts'],
    ['/legacy-giving', 'Legacy gifts'],
    ['/guide-to-legacy-giving', 'Guide to legacy giving'],
    ['/crypto', 'Give crypto'],
    ['/donor-advised-funds', 'Donor-advised funds'],
    ['/employer-matching', 'Employer matching'],
    ['/corporate-partnerships', 'Corporate partnerships'],
    ['/workplace-talk', 'Workplace talk'],
    ['/giving-internationally', 'Giving internationally'],
    ['/offline-donation-methods', 'Offline donation methods'],
    ['/guide-to-donating-stocks-and-mutual-funds', 'Donating stocks and mutual funds'],
    ['/guide-to-charitable-trusts', 'Charitable trusts'],
    ['/qualified-charitable-distributions', 'Qualified charitable distributions'],
    ['/charitable-tax-strategies', 'Charitable tax strategies'],
    ['/end-of-year-giving-guidelines', 'End-of-year giving'],
    ['/donor-sign-in', 'Donor sign in'],
  ]),
  ...pages('campaign', [
    ['/eoy-call', 'Year-end event'],
    ['/daf-match-2026', 'Donor-advised fund match'],
    ['/givingtuesday', 'Giving Tuesday'],
    ['/cambodia-floods', 'Cambodia floods'],
  ]),
  ...pages('blog', [['/blog', 'Blog']]),
  ...pages(
    'post',
    [1, 2, 3, 4, 5, 6].map((n): [string, string] => [`/blog/post-${n}`, `Blog post ${n}`]),
  ),
  ...pages('financials', [
    ['/financials', 'Financials'],
    ['/financials-by-year', 'Financials by year'],
  ]),
  ...pages('press', [['/press', 'Press']]),
  ...pages('careers', [['/careers', 'Careers']]),
  ...pages('legal', [
    ['/privacy-policy', 'Privacy policy'],
    ['/terms-of-use', 'Terms of use'],
    ['/charity-disclosure', 'Charity disclosure'],
    ['/cookie-notice', 'Cookie notice'],
    ['/recipient-data-privacy-policy', 'Recipient data privacy policy'],
  ]),
];

const byPath = new Map(skeletonPages.map((page) => [page.path, page]));

export function findSkeletonPage(path: string): SkeletonPage | undefined {
  return byPath.get(path);
}
