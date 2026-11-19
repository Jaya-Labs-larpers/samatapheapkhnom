/**
 * Interface strings added by the redesign (header, menus, footer, homepage).
 *
 * Khmer is written by SKO staff, never machine-translated. Every key without a
 * Khmer value below is a TODO(km): `t()` shows the English string and
 * `tLang()` reports it so the element can carry lang="en".
 */
export const redesignEn = {
  // --- Header and menus -----------------------------------------------------
  navPrimaryLabel: 'Main',
  navWhoWeAre: 'Who we are',
  navApproach: 'Our approach',
  navValues: 'Mission & values',
  navTeam: 'Team',
  navReportsFinances: 'Reports & finances',
  navActivitiesNews: 'Activities & news',
  navAllProgrammes: 'All programmes',
  navPlaces: 'Places',
  navPhnomPenh: 'Phnom Penh',
  navImpactResults: 'Impact & results',
  navFamiliesStories: "Families' stories",
  navWhereWeWork: 'Where we work',
  navAllWaysToGetInvolved: 'All ways to get involved',
  navVolunteerInternships: 'Volunteer & internships',
  menuExplore: 'Explore',
  menuConnect: 'Connect with us',
  menuFacebookLabel: 'SKO on Facebook',
  menuTelegramLabel: 'SKO on Telegram',
  menuInstagramLabel: 'SKO on Instagram',
  menuYoutubeLabel: 'SKO on YouTube',

  // --- Homepage hero --------------------------------------------------------
  heroSubtitle:
    "Since 2007, we've supported vulnerable families in Phnom Penh to build safer, healthier homes for their children.",
  heroVolunteer: 'Volunteer with SKO',
  donate: 'Donate',
  heroRegistered: 'Registered NGO · Permit No. 457',
  heroAnnualReports: 'Annual reports',

  // --- Homepage sections ----------------------------------------------------
  allProgramsLink: 'All our family support programs',
  trustedByPartners: 'Trusted by our partners and funders',
  storiesHeading: 'Families leading their own change',
  storiesPrevious: 'Previous story',
  storiesNext: 'Next story',
  readHerStory: 'Read her story',
  readTheStory: 'Read the full story',
  impactHeadline: 'Nearly 2,000 families supported across Phnom Penh',
  explainersHeading: 'Understand the issues',
  typeExplainer: 'Explainer',
  typeFacts: 'Facts',
  typeEvent: 'Event',
  typeAnnouncement: 'Announcement',
  typeReport: 'Report',
  typeStory: 'Story',
  typeNews: 'News',
  homeCtaBody: 'Talk to us about partnering, volunteering or our work with families.',
  getInvolvedLabel: 'Get involved',
  getInvolvedAnnualReports: 'Annual reports',

  // --- Donate page (draft copy, awaiting SKO approval) ----------------------
  donateTitle: 'Help a child grow up safe, in their own family',
  donateIntro:
    "Your gift supports SKO's social work with families in Phnom Penh's urban poor communities. Scan a KHQR code with any Cambodian banking app, or transfer to the account below.",
  donateBack: 'Back to the website',
  donateScanHeading: 'Scan to give',
  donateStep1: 'Open your banking app',
  donateStep2: 'Scan the KHQR code',
  donateStep3: 'Enter an amount and confirm',
  donateSample: 'Sample, not payable',
  donateBankHeading: 'Bank transfer',
  donateBankName: 'Bank',
  donateAccountName: 'Account name',
  donateAccountNumber: 'Account number',
  donateSupportsHeading: 'What your gift supports',
  donateReceipt: 'Need a receipt? Email {email} with your transfer reference and date.',
  donateThanks: 'Thank you. Every gift, whatever its size, helps a family stay together.',
  donateNoCards: 'SKO never asks for card details on this website.',

  // --- Footer ---------------------------------------------------------------
  footerGetInvolvedHeading: 'Get involved',
  footerOurWorkHeading: 'Our work',
  footerOrganisationHeading: 'Organisation',
  footerResourcesHeading: 'Resources',
  footerStayConnectedHeading: 'Stay connected',
  footerHousing: 'Housing & living conditions',
  footerCitizenship: "Children's active citizenship",
  footerEducationHealth: 'Education & health (FDP)',
  footerResilientCity: 'Resilient city & migration',
  footerAboutSko: 'About SKO',
  footerReportConcern: 'Report a concern',
  footerLatestActivities: 'Latest activities',
  footerPermit: 'Ministry of Interior Permit No. 457',
  footerCopyright: 'Samatapheap Khnom Organization',
} as const;

export const redesignKm: Partial<Record<keyof typeof redesignEn, string>> = {
  // TODO(km): every redesign string above needs a Khmer value from SKO staff.
  donate: 'បរិច្ចាគ',
  readTheStory: 'អានរឿងទាំងស្រុង',
};
