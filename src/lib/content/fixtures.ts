/**
 * Local fixture content.
 *
 * Used whenever PUBLIC_SANITY_PROJECT_ID is unset, so the site builds, previews
 * and can be reviewed before SKO's Sanity project exists. Once the project id is
 * configured the content layer switches to GROQ and this file is never read.
 *
 * CONTENT STATUS
 * --------------
 * English copy comes from "SKO (Website) 14 August 2026 Last review by ED.docx" —
 * the content document signed off by SKO's Executive Director — as revised by
 * the September 2026 "website info" documents (cover, About, and one per
 * programme), which also supplied every photo in public/images. Programs are the
 * four funded projects the document describes: HALI, Children's Active
 * Citizenship (TFCF1), Promoting Children's Education and Health through FDP
 * (TFCF2), and Resilient City and Migration Dynamics (RCMD).
 *
 * Anything still bracketed as [NEEDS SKO] is a fact the document does not supply
 * and this file does not invent — the full list
 * (donation bank/QR details and allocation %, volunteer roles, privacy retention line, first real news posts, and the actual report
 * PDFs).
 *
 * Khmer: titles, summaries, values, statistic labels and the FAQ answers are
 * translated and marked for review. Long-form body prose is English-only for
 * now and falls back with lang="en"; it needs a Khmer-speaking staff writer.
 */

import { inlineLinkSpans } from '../inline-links';
import { localCmsImage } from '../sanity/image';
import type {
  Activity,
  DirectorMessage,
  FaqItem,
  ImpactStat,
  LocaleBlocks,
  OrgChart,
  Page,
  Partner,
  PortableBlock,
  Program,
  Report,
  SiteSettings,
  Story,
  TeamMember,
} from './types';

/**
 * Compact Portable Text builder. A paragraph beginning "## " becomes an h2, "- " a bullet,
 * and `[anchor](/path)` becomes a link.
 */
function blocks(en: string[], km: string[]): LocaleBlocks {
  const build = (paragraphs: string[]): PortableBlock[] =>
    paragraphs.map((raw, index) => {
      const isHeading = raw.startsWith('## ');
      const isBullet = raw.startsWith('- ');
      return {
        _type: 'block' as const,
        _key: `b${index}`,
        style: isHeading ? ('h2' as const) : ('normal' as const),
        ...(isBullet ? { listItem: 'bullet' as const, level: 1 } : {}),
        ...inlineLinkSpans(isHeading ? raw.slice(3) : isBullet ? raw.slice(2) : raw),
      };
    });
  return { en: build(en), km: build(km) };
}

/** English-only body copy, pending a Khmer writer. Falls back with lang="en". */
function enOnly(en: string[]): LocaleBlocks {
  return blocks(en, []);
}

/** Sok Vanny's account, told on the homepage and on the RCMD programme page. */
const sokVannyStory = [
  'My name is Sok Vanny. I am a 57-year-old widow living in the Andoung 6 community, Sangkat Kouk Roka, Khan Prek Pnov. I am the primary caregiver for my two young grandchildren, who were left in my care after being abandoned by their parents.',
  'In the past, my family faced severe financial hardship and emotional distress. My only source of income came from harvesting wild vegetables and collecting snails to sell, earning barely 7,000 to 10,000 KHR per day. This was hardly enough to cover our basic daily meals, and on days I could not gather anything, we simply had no money for food.',
  'My life began to change for the better after receiving dedicated guidance, encouragement, and support from the Samatapheap Khnom Organization (SKO) team. They helped me understand the far-reaching impacts of living in hardship, particularly the risks of lacking proper legal documentation. SKO supported and facilitated the process of obtaining a Cambodian National ID Card for me and birth certificates for my grandchildren.',
  'These documents have been life-changing “Having birth certificates has made it significantly easier to access medical check-ups and healthcare for my grandchildren. They also allowed me to formally enroll them in school and secure vital nutrition assistance from the Voice Cambodia Organization. While having National ID Card, possessing official identification gives peace of mind, simplifies job applications, and allows to access legal micro-loans safely.',
  'This experience restored my strength and motivated me to keep moving forward. Inspired by this transformation, I now advocate within my village, helping my neighbors understand the importance of legal identity documents.',
  'Currently, I am gathering the necessary paperwork to apply for a Residence Book (Family Book), as the lack of this document still presents daily administrative challenges. Once my file is complete, I will seek further consultation and support from Mrs. Chhay Lim to complete the application process.',
];

/**
 * Donation FAQs — rendered on the Donate page and emitted as FAQPage
 * structured data. Written to be quoted whole: these are the questions an
 * answer engine or AI assistant actually gets asked about a small NGO.
 */
const donationFaqs: FaqItem[] = [
  {
    question: {
      en: 'How can I donate to SKO?',
      km: 'តើខ្ញុំអាចបរិច្ចាគទៅ SKO ដោយរបៀបណា?',
    },
    answer: {
      en: 'You can donate by scanning a KHQR code with any Cambodian banking app, or by international bank transfer using the account details on this page. SKO does not collect card details on this website.',
      km: 'អ្នកអាចបរិច្ចាគដោយស្កេនកូដ KHQR ជាមួយកម្មវិធីធនាគារកម្ពុជាណាមួយ ឬតាមការផ្ទេរប្រាក់ធនាគារអន្តរជាតិ។ SKO មិនប្រមូលព័ត៌មានកាតឥណទាននៅលើគេហទំព័រនេះទេ។',
    },
  },
  {
    question: {
      en: 'Can I get a receipt for my donation?',
      km: 'តើខ្ញុំអាចទទួលបង្កាន់ដៃសម្រាប់ការបរិច្ចាគបានទេ?',
    },
    answer: {
      en: 'Yes. Email info@example.org with your transfer reference and the date, and SKO will send an acknowledgement letter.',
      km: 'បាទ/ចាស។ សូមផ្ញើអ៊ីមែលទៅ info@example.org ជាមួយលេខយោងនៃការផ្ទេរប្រាក់ និងកាលបរិច្ឆេទ។',
    },
  },
  {
    question: {
      en: 'What does a donation to SKO pay for?',
      km: 'តើការបរិច្ចាគទៅ SKO ត្រូវប្រើសម្រាប់អ្វី?',
    },
    answer: {
      en: '[NEEDS SKO] Answer with the actual allocation from the most recent audited accounts. For example, the share going to direct family support and case work, to staff and training, and to administration.',
      km: '[NEEDS SKO] សូមឆ្លើយតាមការបែងចែកជាក់ស្តែងពីរបាយការណ៍សវនកម្មចុងក្រោយ។',
    },
  },
];

export const siteSettings: SiteSettings = {
  donationFaqs,
  orgName: { en: 'Samatapheap Khnom Organization', km: 'អង្គការសមត្ថភាពខ្ញុំ' },
  orgShortName: 'SKO',
  homeHero: [
    localCmsImage('home-hero', {
      en: 'The SKO team in Phnom Penh',
      km: 'ក្រុមការងារ SKO នៅរាជធានីភ្នំពេញ',
    }),
  ],
  tagline: {
    en: 'Families with the strength to change their own lives.',
    km: 'គ្រួសារដែលមានកម្លាំងផ្លាស់ប្តូរជីវិតរបស់ខ្លួនឯង។',
  },
  registration: {
    en: 'Registered with the Ministry of Interior | Permit No. 457 (សជណ) | 20 April 2007',
    km: 'ចុះបញ្ជីជាមួយក្រសួងមហាផ្ទៃ | លិខិតអនុញ្ញាតលេខ ៤៥៧ (សជណ) | ថ្ងៃទី ២០ ខែមេសា ឆ្នាំ ២០០៧',
  },
  address: {
    en: 'Office #8AE1, Street 138,\nSangkat Veal Vong, Khan 7 Makara,\nPhnom Penh, Cambodia',
    km: 'ការិយាល័យលេខ 8AE1 ផ្លូវ ១៣៨\nសង្កាត់វាលវង់ ខណ្ឌ៧មករា\nរាជធានីភ្នំពេញ ព្រះរាជាណាចក្រកម្ពុជា',
  },
  officeHours: {
    en: 'Monday–Friday, 8:00–17:00 (ICT)',
    km: 'ថ្ងៃចន្ទ–សុក្រ ម៉ោង ៨:០០–១៧:០០',
  },
  mapUrl: 'https://maps.app.goo.gl/hoZXXxgpDqWuKs6J8',
  phone: '+855 00 000 000',
  email: 'info@example.org',
  partnerEmail: 'info@example.org',
  safeguardingEmail: 'safeguarding@example.org',
  safeguardingContact: {
    en: 'To report a safeguarding concern, please contact the Senior Team Leader directly at safeguarding@example.org or +855 00 000 000 rather than using the form below. Concerns are treated confidentially.',
    km: 'ដើម្បីរាយការណ៍អំពីកង្វល់ការពារកុមារ សូមទាក់ទង នាយកក្រុមជាន់ខ្ពស់ ដោយផ្ទាល់តាមអ៊ីមែល safeguarding@example.org ឬលេខទូរស័ព្ទ +855 00 000 000 ជាជាងប្រើទម្រង់ខាងក្រោម។ រាល់កង្វល់ត្រូវបានរក្សាការសម្ងាត់។',
  },
  socials: [{ platform: 'Facebook', url: 'https://www.facebook.com/samatapheapkhnom' }],
  donation: {
    qrCodes: [
      {
        label: { en: '[NEEDS SKO] Bank name', km: '[NEEDS SKO] ឈ្មោះធនាគារ' },
        instructions: {
          en: 'Samatapheap Khnom Organization · KHR / USD',
          km: 'អង្គការសមត្ថភាពខ្ញុំ · KHR / USD',
        },
      },
      {
        label: { en: 'KHQR', km: 'KHQR' },
        instructions: {
          en: 'Works with any Cambodian banking app',
          km: 'ប្រើបានជាមួយកម្មវិធីធនាគារកម្ពុជាទាំងអស់',
        },
      },
    ],
    bankAccounts: [
      {
        bankName: 'N/A',
        accountName: 'Samatapheap Khnom Organization',
        accountNumber: 'N/A',
        swift: 'N/A',
        branchAddress: 'N/A',
        currency: 'USD / KHR',
      },
    ],
    allocation: [
      {
        label: { en: 'Programs', km: 'កម្មវិធី' },
        percent: 0,
        note: {
          en: '[NEEDS SKO] Percentage and description. Take these from the most recent audited accounts.',
          km: '[NEEDS SKO] ភាគរយ និងការពិពណ៌នា។ យកតាមរបាយការណ៍សវនកម្មចុងក្រោយ។',
        },
      },
    ],
    note: enOnly([
      'For a receipt or a donation acknowledgement letter, email info@example.org with your transfer reference and the date.',
    ]),
  },
};

/* -------------------------------------------------------------------------
   Impact statistics (site-wide — Home and Impact pages).

   The programme-level figures live on each programme page. These are the
   organisation-wide figures from the September 2026 cover document.
   ------------------------------------------------------------------------- */
export const impactStats: ImpactStat[] = [
  {
    _id: 'stat-since',
    value: 2007,
    displayValue: '2007',
    label: {
      en: 'Working in Phnom Penh since',
      km: 'ធ្វើការនៅរាជធានីភ្នំពេញតាំងពីឆ្នាំ',
    },
    context: {
      en: 'Registered with the Ministry of Interior, permit No. 457',
      km: 'ចុះបញ្ជីជាមួយក្រសួងមហាផ្ទៃ លិខិតលេខ ៤៥៧',
    },
    countUp: false,
    order: 1,
  },
  {
    _id: 'stat-khans',
    value: 14,
    displayValue: '14',
    label: { en: 'Khans of Phnom Penh', km: 'ខណ្ឌនៃរាជធានីភ្នំពេញ' },
    countUp: true,
    order: 2,
  },
  {
    _id: 'stat-sangkats',
    value: 105,
    displayValue: '105',
    label: { en: 'Sangkats reached', km: 'សង្កាត់ដែលបានទៅដល់' },
    context: {
      en: 'Urban poor communities across the capital',
      km: 'សហគមន៍ក្រីក្រតាមទីក្រុងទូទាំងរាជធានី',
    },
    countUp: true,
    order: 3,
  },
  {
    _id: 'stat-families',
    value: 2000,
    displayValue: '~2000',
    label: {
      en: 'Families receiving Support Services and Intervention',
      km: 'គ្រួសារទទួលបានសេវាគាំទ្រ និងអន្តរាគមន៍',
    },
    countUp: true,
    order: 4,
  },
];

/* -------------------------------------------------------------------------
   Programmes — the four funded projects from SKO's content document.

   TFCF1 (Children's Active Citizenship) and TFCF2 (Promoting Children's
   Education and Health through FDP) share one partner and one "Highlight
   Activities" list in the document. The document attaches that list to
   TFCF2, so the full activity list and partner line live there; TFCF1 carries
   its own purpose and impact section, with a pointer to its sister project.
   ------------------------------------------------------------------------- */
export const programs: Program[] = [
  {
    _id: 'program-hali',
    image: localCmsImage('hali-cover', {
      en: 'SKO social worker leading a community counselling session with families under a shelter in Phnom Penh',
      km: 'បុគ្គលិកសង្គមកិច្ច SKO កំពុងដឹកនាំវគ្គប្រឹក្សាសហគមន៍ជាមួយគ្រួសារ នៅក្រោមជម្រកមួយក្នុងរាជធានីភ្នំពេញ',
    }),
    cardImage: localCmsImage('hali-card', {
      en: 'Women in a community gender discussion group with an SKO social worker',
      km: 'ស្ត្រីក្នុងក្រុមពិភាក្សាយេនឌ័រសហគមន៍ ជាមួយបុគ្គលិកសង្គមកិច្ច SKO',
    }),
    slug: 'housing-and-living-conditions-hali',
    order: 1,
    title: {
      en: 'Housing and Living Condition Improvement (HALI)',
      km: 'ការកែលម្អលំនៅឋាន និងលក្ខខណ្ឌរស់នៅ (HALI)',
    },
    summary: {
      en: "HALI is SKO's programme to reduce gender-based violence and improve living conditions for families in Phnom Penh's urban poor areas. Using the Family Development Program (FDP) methodology, social workers provide family counselling, resilience-building, information and referrals to health, education, economic and administrative services, with a focus on women, children and youth.",
      km: 'ដើម្បីលើកម្ពស់គុណភាពជីវិតរបស់គ្រួសារ ជាពិសេសកុមារ យុវជន និងស្ត្រី ដែលរស់នៅក្នុងតំបន់ក្រីក្រទីក្រុង។ ដោយប្រើវិធីសាស្ត្រកម្មវិធីអភិវឌ្ឍន៍គ្រួសារ (FDP) SKO ផ្តល់ការប្រឹក្សាផ្លូវចិត្ត ការកសាងភាពធន់ ព័ត៌មាន និងការបញ្ជូនទៅសេវាសំខាន់ៗ។ គម្រោងក៏មានគោលបំណងកាត់បន្ថយអំពើហិង្សាក្នុងគ្រួសារ និងលើកកម្ពស់ការរស់នៅប្រកបដោយសុវត្ថិភាព។',
    },
    seo: {
      title: { en: 'Gender-Based Violence Prevention in Phnom Penh: HALI' },
      description: {
        en: "HALI reduces gender-based violence in Phnom Penh's urban poor areas through family counselling, GBV training and referrals. 94% now know where to seek help.",
      },
    },
    body: enOnly([
      '## What we do',
      'Home Counseling. Psychosocial support for families, particularly women experiencing domestic violence. Social workers help identify issues, strengths, and solutions, while connecting families with NGO partners for services.',
      'Community House Counseling. A safe, confidential space for beneficiaries, especially women, to discuss challenges and receive emotional support.',
      'Family Development Program Training. Capacity-building for local authorities (CCWCs) and Family Development Volunteers (FDVs) to strengthen support for vulnerable households and reduce domestic violence.',
      'Gender Group Discussions. Community dialogues to share experiences, promote behavioural change, and improve family relationships.',
      'Gender-Based Violence Training. Awareness and response training for local authorities and community leaders to strengthen referral systems and support victims.',
      '## Partner',
      'Planète Enfants & Développement (PE&D).',
      '## Impact and results: GBV prevention and family counselling',
      'Family counselling was provided to 200 households. SKO’s family counselling has proven instrumental in resolving intra-household conflicts and fostering healthier relationships, with a notable percentage of beneficiaries reporting a reduction in domestic violence and improved emotional well-being. 97% of beneficiaries surveyed who received assistance from social workers reported feeling more capable than before of dealing with problems, or knowing better where to get help. Of beneficiaries using referral services facilitated by a social worker, 95% report they will continue to use referral services in future and are satisfied with them.',
      "Gender awareness and empowerment through gender discussion groups reached 80% of all HALI beneficiaries, through SKO training (40 individuals) and CAFÉ training with PE&D (122 individuals). A large majority of beneficiaries consider gender-based violence a serious issue. 89% of beneficiaries report more equitable decision-making within households, and 75% of female respondents report that they make decisions on financial matters in the household — see our [women's empowerment results](/impact/). 94% of beneficiaries surveyed know where to seek assistance if they or someone they know experiences gender-based violence.",
      'Daily engagement by social workers in the community and within households over an extended period, giving households tools for problem-solving, intra-household communication and links to existing services, has proven crucial to these results within a relatively short period (1.5 years per target area), while also drawing the community into other project activities.',
      'Group discussions for men and women, including role-playing, have proven effective at engaging participants and helping them understand gender roles and coping mechanisms against stereotypes and domestic violence.',
    ]),
    impactStats: [
      {
        _id: 'hali-households',
        value: 200,
        displayValue: '200',
        label: { en: 'Households counselled', km: 'គ្រួសារទទួលការប្រឹក្សា' },
        countUp: true,
        order: 1,
      },
      {
        _id: 'hali-capable',
        value: 97,
        displayValue: '97%',
        label: {
          en: 'Feel more capable of dealing with problems',
          km: 'មានអារម្មណ៍ថាមានលទ្ធភាពដោះស្រាយបញ្ហាកាន់តែប្រសើរ',
        },
        countUp: true,
        order: 2,
      },
      {
        _id: 'hali-referral',
        value: 95,
        displayValue: '95%',
        label: {
          en: 'Continue to use referral services',
          km: 'បន្តប្រើសេវាបញ្ជូន',
        },
        countUp: true,
        order: 3,
      },
      {
        _id: 'hali-decisions',
        value: 89,
        displayValue: '89%',
        label: {
          en: 'More equitable household decision-making',
          km: 'ការសម្រេចចិត្តគ្រួសារប្រកបដោយសមភាពកាន់តែច្រើន',
        },
        countUp: true,
        order: 4,
      },
      {
        _id: 'hali-gbv-help',
        value: 94,
        displayValue: '94%',
        label: {
          en: 'Know where to seek help for gender-based violence',
          km: 'ដឹងកន្លែងស្វែងរកជំនួយអំពីអំពើហិង្សាយេនឌ័រ',
        },
        countUp: true,
        order: 5,
      },
    ],
  },
  {
    _id: 'program-tfcf1',
    image: localCmsImage('tfcf1-cover', {
      en: 'Children seated in a circle on a mat at a community session in an urban poor neighbourhood of Phnom Penh',
      km: 'កុមារអង្គុយជារង្វង់លើកន្ទេលនៅក្នុងវគ្គសហគមន៍មួយ ក្នុងសង្កាត់ក្រីក្រទីក្រុងនៃរាជធានីភ្នំពេញ',
    }),
    cardImage: localCmsImage('tfcf1-card', {
      en: "Children holding up their drawings at a Children's Club session with SKO staff",
      km: 'កុមារកំពុងលើកគំនូររបស់ខ្លួននៅវគ្គក្លឹបកុមារ ជាមួយបុគ្គលិក SKO',
    }),
    slug: 'childrens-active-citizenship',
    order: 2,
    title: { en: "Children's Active Citizenship", km: 'សកម្មភាពពលរដ្ឋកុមារ' },
    summary: {
      en: "Children's Active Citizenship is SKO's programme for the education, health and child protection of vulnerable children in three sangkats of Phnom Penh. Children learn their rights, child protection and online safety; schools, parents, Family Development Volunteers and local authorities work together to keep them in school and safe.",
      km: 'ដើម្បីលើកកម្ពស់ការយល់ដឹងអំពីការអប់រំមូលដ្ឋាន និងសុខភាពថែទាំបឋមក្នុងចំណោមសមាជិកសហគមន៍ អ្នកថែទាំ និងអាជ្ញាធរ សម្រាប់កុមារងាយរងគ្រោះ។',
    },
    seo: {
      title: { en: "Child Protection: Children's Active Citizenship" },
      description: {
        en: "Child protection for vulnerable children in Phnom Penh: Children's Active Citizenship teaches child rights and online safety and keeps children in school.",
      },
    },
    body: enOnly([
      '## Impact and results: child protection and education',
      'The project made meaningful progress in strengthening vulnerable families and improving the well-being, education, health, and protection of children across the three target Sangkats. Through close collaboration with local authorities, schools, health centers, Family Development Volunteers (FDVs), parents, and community stakeholders, the project reached children, families, and community members with practical and integrated support.',
      "Under education and child protection, children demonstrated increased awareness of their rights, child protection, online safety, and the risks of drug use. Mobile library activities strengthened children’s reading, listening, communication, and learning engagement, while also improving their knowledge of road safety. The distribution of school materials to 410 children reduced financial pressure on vulnerable families and helped children remain motivated and better equipped for school. School Support Committee meetings also strengthened cooperation among schools, parents, volunteers, and local authorities, enabling stakeholders to identify children at risk of dropping out and develop practical solutions to support their continued education. SKO's own [child safeguarding](/safeguarding/) policy applies to every activity.",
      'Under health, hygiene, and family well-being, the project improved access to basic healthcare for vulnerable families through 52 medical check-up sessions reaching 656 people within 2,624 indirect reaches, including children and elderly community members. Additional ear health services reached 159 people, particularly children, while health education promoted better sanitation, disease prevention, and awareness of available social protection and healthcare services. Environment Day activities engaged 289 direct reaches 1,156 indirect reaches and in practical hygiene and environmental actions, strengthening community responsibility for cleaner and healthier living environments.',
      'The project also provided important food and emergency assistance to vulnerable families. A total of 33,910 kg of rice was distributed to 313 families supporting 410 children, while an additional 1,900 kg of emergency rice supported 189 families. These interventions helped reduce immediate household financial pressure and food insecurity, allowing parents to better focus on supporting their children’s education and well-being. Community contributions in Sangkat Chbar Ampov further demonstrated local solidarity and strengthened community ownership.',
      'Under positive parenting and family development, community meetings strengthened parents’ knowledge and practices related to children’s education, health, stress management, legal documentation, communication, and positive parenting.',
      'Overall, the project contributed to a more supportive and protective environment for vulnerable children and families, strengthening local ownership alongside schools, volunteers, parents and authorities.',
      'This project shares its partner and highlight activities with its sister project, [Promoting Children’s Education and Health through FDP](/programs/childrens-education-and-health/). See that programme page for the full activity list.',
    ]),
    impactStats: [
      {
        _id: 'tfcf1-school-materials',
        value: 410,
        displayValue: '410',
        label: {
          en: 'Children received school materials',
          km: 'កុមារទទួលបានសម្ភារៈសិក្សា',
        },
        context: {
          en: '1,640 packages of school material',
          km: 'សម្ភារៈសិក្សាចំនួន ១,៦៤០ កញ្ចប់',
        },
        countUp: true,
        order: 1,
      },
      {
        _id: 'tfcf1-medical',
        value: 656,
        displayValue: '656',
        label: {
          en: 'Direct reaches, 2,624 indirect reaches',
          km: 'អ្នកទទួលផលផ្ទាល់ និង ២,៦២៤ នាក់ទទួលផលប្រយោល',
        },
        context: {
          en: 'Through medical check-ups and awareness raising on health issues',
          km: 'តាមរយៈការពិនិត្យសុខភាព និងការលើកកម្ពស់ការយល់ដឹងអំពីបញ្ហាសុខភាព',
        },
        countUp: true,
        order: 2,
      },
      {
        _id: 'tfcf1-rice',
        value: 33910,
        displayValue: '33,910 kg',
        label: {
          en: 'Rice distributed to 313 families',
          km: 'អង្ករចែកចាយដល់គ្រួសារ ៣១៣',
        },
        countUp: true,
        order: 3,
      },
      {
        _id: 'tfcf1-hygiene',
        value: 289,
        displayValue: '289',
        label: {
          en: 'Direct reaches, 1,156 indirect reaches',
          km: 'អ្នកទទួលផលផ្ទាល់ និង ១,១៥៦ នាក់ទទួលផលប្រយោល',
        },
        context: {
          en: 'Of hygiene and sanitation awareness',
          km: 'នៃការលើកកម្ពស់ការយល់ដឹងអំពីអនាម័យ និងអនាម័យបរិស្ថាន',
        },
        countUp: true,
        order: 4,
      },
      {
        _id: 'tfcf1-mobile-library',
        value: 298,
        displayValue: '298',
        label: {
          en: 'Children from the urban poor families reach Mobile Library',
          km: 'កុមារពីគ្រួសារក្រីក្រទីក្រុងបានចូលរួមបណ្ណាល័យចល័ត',
        },
        context: {
          en: 'By removing barriers to literacy and fostering a positive relationship with education',
          km: 'ដោយកាត់បន្ថយឧបសគ្គក្នុងការអាន និងជំរុញទំនាក់ទំនងវិជ្ជមានជាមួយការសិក្សា',
        },
        countUp: true,
        order: 5,
      },
    ],
  },
  {
    _id: 'program-tfcf2',
    image: localCmsImage('tfcf2-cover', {
      en: 'Children queue at a registration table during an SKO community session in Phnom Penh',
      km: 'កុមារតម្រង់ជួរនៅតុចុះឈ្មោះ ក្នុងវគ្គសហគមន៍របស់ SKO នៅរាជធានីភ្នំពេញ',
    }),
    cardImage: localCmsImage('tfcf2-card', {
      en: 'Parents and children at a community meeting with illustrated posters, Phnom Penh',
      km: 'ឪពុកម្តាយ និងកុមារនៅក្នុងកិច្ចប្រជុំសហគមន៍ដែលមានផ្ទាំងរូបភាពបង្ហាញ នៅរាជធានីភ្នំពេញ',
    }),
    slug: 'childrens-education-and-health',
    order: 3,
    title: {
      en: "Promoting Children's Education and Health through FDP",
      km: 'ការលើកកម្ពស់ការអប់រំ និងសុខភាពកុមារតាមរយៈ FDP',
    },
    summary: {
      en: "Promoting Children's Education and Health through FDP is SKO's family development programme in Khan Dangkor, Phnom Penh. Through the Family Development Program (FDP), social workers, Family Development Volunteers, schools and health centres support 390 vulnerable children and their families with education, health, protection and family strengthening.",
      km: 'ដើម្បីជំរុញការយល់ដឹងក្នុងចំណោមឪពុកម្តាយ អ្នកថែទាំ និងអាជ្ញាធរមូលដ្ឋាន អំពីសារៈសំខាន់នៃការអប់រំមូលដ្ឋាន និងសុខភាពថែទាំបឋមសម្រាប់កុមារងាយរងគ្រោះ។',
    },
    seo: {
      title: { en: "Family Development: Children's Education and Health" },
      description: {
        en: 'Family development through FDP in Khan Dangkor, Phnom Penh: SKO supports 390 vulnerable children and their families with education, health and case management.',
      },
    },
    body: enOnly([
      '## What we do',
      "Child Protection Training. Building children’s capacity to understand and respond to different forms of violence (emotional, sexual, physical, neglect, exploitation). Delivered together with our sister project [Children's Active Citizenship](/programs/childrens-active-citizenship/).",
      'Leadership and Management Training for youth and young people. Promotes knowledge, capacity and skill, and a positive, results-oriented attitude, so young people can lead and manage their daily work and living conditions, starting young and carrying into their careers.',
      'Mobile Library. Improving reading skills, promoting education, and teaching safety practices such as traffic awareness.',
      'Distribution of School Materials & Emergency Support. Providing essential supplies to vulnerable children, encouraging school attendance, and mobilizing resources from charities and NGOs.',
      'School Support Committee Meetings. Collaboration with CCWC, SSC, local authorities and teachers to monitor student progress and address challenges.',
      'Medical Checkups. Health services for vulnerable children and families in partnership with health centres.',
      'Environment & Hygiene Campaigns. Promoting sanitation, hygiene and community clean-up activities as role models for children and families.',
      'Community Meetings. Promoting positive parenting, child protection and child rights while encouraging parents to share practices and find solutions to education and health challenges, strengthening parents’ and caregivers’ capacity to manage stress and anger, and building more positive, peaceful, resilient thinking for the family, children and community.',
      '## Partner',
      'Family Fund for Children Organization.',
      '## Impact and results: family strengthening in Khan Dangkor',
      'The Community Development Project, implemented through SKO’s Family Development Approach, contributed to improving the education, health, protection, and overall well-being of 390 vulnerable children (204 girls and 186 boys) and their families in Sangkat Prey Veng, Prey Sar, and Dangkor of Khan Dangkor. The project combined direct support to children with family strengthening, community engagement, health services, and collaboration with local authorities, schools, health centers, and Family Development Volunteers (FDVs).',
      'Under Objective 1, the project strengthened children’s access to education, learning opportunities, and protection. Four Children’s Clubs provided safe and structured spaces for children to learn, interact, develop life skills, and participate in positive activities. Children’s Club meetings 237 direct reached children and 474 indirect reaches children, increasing their awareness of child rights, protection, online safety, and drug prevention. 40 mobile library sessions reached 182 children, promoting reading, creativity, peer learning, nutrition, hygiene, and road safety. School materials were provided to all 390 target children from 322 families, reducing financial pressure on vulnerable households and helping children remain prepared and engaged in school. Six School Support Committee meetings further strengthened collaboration among schools, parents, FDVs, and local authorities to address challenges such as absenteeism and e-cigarette use and to improve monitoring of children’s education.',
      'In addition, 24,700 kg of rice was distributed to 247 vulnerable families supporting 304 children, while emergency rice assistance supported another 150 families.',
      'Overall, the project strengthened the capacity of vulnerable families to better support their children’s education, health, protection, and development, with stronger collaboration among parents, schools, FDVs, health centers, and local authorities.',
    ]),
    impactStats: [
      {
        _id: 'tfcf2-children',
        value: 390,
        displayValue: '390',
        label: {
          en: 'Vulnerable children reached',
          km: 'កុមារងាយរងគ្រោះទទួលបានជំនួយ',
        },
        context: {
          en: '204 girls, 186 boys',
          km: '២០៤ ក្មេងស្រី ១៨៦ ក្មេងប្រុស',
        },
        countUp: true,
        order: 1,
      },
      {
        _id: 'tfcf2-families',
        value: 322,
        displayValue: '322',
        label: { en: 'Families reached', km: 'គ្រួសារទទួលបានជំនួយ' },
        countUp: true,
        order: 2,
      },
      {
        _id: 'tfcf2-clubs',
        value: 237,
        displayValue: '237',
        label: {
          en: 'Direct reaches, 474 indirect reaches',
          km: 'អ្នកទទួលផលផ្ទាល់ និង ៤៧៤ នាក់ទទួលផលប្រយោល',
        },
        context: {
          en: 'Children through Children’s Clubs',
          km: 'កុមារតាមរយៈក្លឹបកុមារ',
        },
        countUp: true,
        order: 3,
      },
      {
        _id: 'tfcf2-rice',
        value: 24700,
        displayValue: '24,700 kg',
        label: {
          en: 'Rice distributed to 247 families',
          km: 'អង្ករចែកចាយដល់គ្រួសារ ២៤៧',
        },
        countUp: true,
        order: 4,
      },
    ],
  },
  {
    _id: 'program-rcmd',
    image: localCmsImage('rcmd-cover', {
      en: 'An SKO staff member speaks with a microphone at a public forum on legal documents with residents of a Phnom Penh community',
      km: 'បុគ្គលិក SKO ម្នាក់និយាយតាមមីក្រូនៅក្នុងវេទិកាសាធារណៈស្តីពីឯកសារស្របច្បាប់ ជាមួយអ្នករស់នៅសហគមន៍មួយក្នុងរាជធានីភ្នំពេញ',
    }),
    cardImage: localCmsImage('rcmd-card', {
      en: "A woman holds the official documents obtained with SKO's support",
      km: 'ស្ត្រីម្នាក់កាន់ឯកសារផ្លូវការដែលទទួលបានដោយមានការគាំទ្រពី SKO',
    }),
    slug: 'resilient-city-and-migration',
    order: 4,
    title: {
      en: 'Resilient City and Migration Dynamics (RCMD)',
      km: 'ភាពធន់ទីក្រុង និងសក្ដានុពលចំណាកស្រុក (RCMD)',
    },
    summary: {
      en: "Resilient City and Migration Dynamics (RCMD) is SKO's migration and development project for migrants and vulnerable families in Phnom Penh: financial literacy, vocational training, legal documents and public services, education, health, gender equality and capacity-building for local authorities, with UNOPS (Cities Alliance) and funding from the Swiss Agency for Development and Cooperation.",
      km: 'ដើម្បីលើកកម្ពស់សុខុមាលភាពរបស់ជនចំណាកស្រុក និងគ្រួសារងាយរងគ្រោះ តាមរយៈចំណេះដឹងហិរញ្ញវត្ថុ ការបណ្តុះបណ្តាលវិជ្ជាជីវៈ សេវាផ្លូវច្បាប់ និងសាធារណៈ ការអប់រំ សុខភាព ការយល់ដឹងបរិស្ថាន សមភាពយេនឌ័រ និងការកសាងសមត្ថភាពអាជ្ញាធរមូលដ្ឋាន។ គម្រោងក៏ដោះស្រាយអំពើហិង្សាយេនឌ័រ និងលើកកម្ពស់ការចូលរួមសហគមន៍។',
    },
    seo: {
      title: { en: 'Migration and Development in Phnom Penh: RCMD Project' },
      description: {
        en: 'Migration and development in Phnom Penh: RCMD helps migrants and vulnerable families with financial literacy, legal documents and gender equality, with UNOPS.',
      },
    },
    body: enOnly([
      '## What we do',
      'Promote Safe Migration and Public Services. Builds understanding of safe migration among vulnerable families, youth and children in host communities, so they can live safely while receiving appropriate public services from relevant stakeholders and government.',
      'Public Forum. Builds knowledge of family residency, birth certificates, and Khmer national ID cards, the official documents that support the daily lives of the most vulnerable families, youth, children and migrants, through engagement with sub-national and local authorities.',
      'Counselling & Referral Services. Identifies the root causes of problems facing host and migrant communities, meets basic needs, strengthens capacity, and works towards sustainable solutions through [scheduled counselling from social workers and weekly family visits](/programs/childrens-education-and-health/).',
      "Gender-Based Violence (GBV) Training. Trains host community and migrant residents on gender concepts and the root causes and impact of GBV, building towards positive change for families and the wider community. SKO's GBV work began in [HALI](/programs/housing-and-living-conditions-hali/).",
      'Men and Women Group Discussion. Promotes understanding and positive practice between men and women, so their daily lives are safer and more supportive, and build a brighter future for children and young people.',
      'Economic Empowerment. Builds migrant and host community members’ capacity to manage household income and expenses through microfinance, without added stress. Results across programmes: [community economic development](/impact/).',
      '## Partner',
      'UNOPS (Cities Alliance), funded by the Swiss Agency for Development and Cooperation.',
      '## Impact and results',
      ...sokVannyStory,
      'Through SKO’s direct support, counselling, community engagement, and facilitation with relevant authorities, families like Sok Vanny are empowered to overcome these barriers and access the rights and services they need. This support is not only helping families obtain essential documentation but also strengthening their confidence, resilience, and ability to build a more secure future for themselves and their children. SKO’s contribution demonstrates that lasting change can begin with something as fundamental as an identity document, when families are empowered, supported, and connected to the services and opportunities available to them.',
      'Urban poor communities, especially in informal settlements, face limited access to basic services, adequate housing, and legal documentation such as birth certificates or ID Poor registration, Cambodia’s national programme that identifies poor households for social protection support. These gaps restrict opportunities for formal employment, healthcare, education and civic participation. That is now beginning to change. This year, Sok Vanny obtained Cambodian citizenship with the support of the Samatapheap Khnom Organization (SKO), a local non-profit and implementing partner in a project aimed at strengthening resilience and inclusion among Phnom Penh’s urban poor.',
    ]),
  },
];

const programRef = (slug: string) => {
  const program = programs.find((entry) => entry.slug === slug);
  return program ? { slug: program.slug, title: program.title ?? null } : null;
};

/* -------------------------------------------------------------------------
   Activities. SKO's content document has no news posts — these remain
   structural examples for staff to replace with real posts, repointed at the
   surviving programme slugs so no reference resolves to null.
   ------------------------------------------------------------------------- */
export const activities: Activity[] = [
  {
    _id: 'activity-1',
    slug: 'welcome-to-the-new-sko-website',
    publishedAt: '2026-08-02T09:00:00+07:00',
    category: 'announcement',
    author: 'SKO Communications',
    featured: true,
    title: {
      en: 'Our new website is live',
      km: 'គេហទំព័រថ្មីរបស់យើងបានដំណើរការហើយ',
    },
    excerpt: {
      en: 'A bilingual home for our work in family care, child protection and community development in Phnom Penh.',
      km: 'ផ្ទះពីរភាសាសម្រាប់ការងាររបស់យើងក្នុងវិស័យថែទាំគ្រួសារ ការពារកុមារ និងអភិវឌ្ឍន៍សហគមន៍នៅរាជធានីភ្នំពេញ។',
    },
    body: enOnly([
      '[NEEDS SKO] Replace this with your own first post. This one exists to show the layout.',
    ]),
  },
  {
    _id: 'activity-2',
    slug: 'example-community-training',
    publishedAt: '2026-07-18T09:00:00+07:00',
    category: 'event',
    author: 'SKO Communications',
    featured: true,
    program: programRef('housing-and-living-conditions-hali'),
    title: {
      en: '[EXAMPLE] Child protection training with local authorities',
      km: '[EXAMPLE] ការបណ្តុះបណ្តាលការពារកុមារជាមួយអាជ្ញាធរមូលដ្ឋាន',
    },
    excerpt: {
      en: '[EXAMPLE] A short summary written by staff. Two sentences is right. This is what appears on the listing page and in search results.',
      km: '[EXAMPLE] សេចក្តីសង្ខេបខ្លីសរសេរដោយបុគ្គលិក។ ពីរប្រយោគគឺល្មម។',
    },
    body: enOnly(['[EXAMPLE] The full article goes here.']),
  },
  {
    _id: 'activity-3',
    slug: 'example-family-story',
    publishedAt: '2026-06-20T09:00:00+07:00',
    category: 'story',
    author: 'SKO Communications',
    featured: true,
    program: programRef('childrens-education-and-health'),
    title: {
      en: '[EXAMPLE] One year after a case closed',
      km: '[EXAMPLE] មួយឆ្នាំក្រោយពីករណីត្រូវបានបិទ',
    },
    excerpt: {
      en: '[EXAMPLE] Stories about families use a pseudonym and never identify a child.',
      km: '[EXAMPLE] រឿងរ៉ាវអំពីគ្រួសារប្រើឈ្មោះក្លែងក្លាយ ហើយមិនបង្ហាញអត្តសញ្ញាណកុមារឡើយ។',
    },
    body: enOnly(['[EXAMPLE] The full story goes here.']),
  },
];

export const stories: Story[] = [
  {
    _id: 'story-1',
    quote: { en: sokVannyStory[2] },
    body: enOnly(sokVannyStory),
    personName: 'Sok Vanny',
    personRole: {
      en: 'Resilient City and Migration Dynamics project',
      km: 'គម្រោងភាពធន់ទីក្រុង និងសក្ដានុពលចំណាកស្រុក',
    },
    useSilhouette: true,
    program: programRef('resilient-city-and-migration'),
  },
];

export const partners: Partner[] = [
  {
    _id: 'partner-pead',
    name: 'Planète Enfants & Développement',
    logo: localCmsImage('logo-ped'),
    category: 'ingo',
    order: 1,
  },
  {
    _id: 'partner-tfcf',
    name: 'Family Fund for Children Organization',
    logo: localCmsImage('logo-tfcf'),
    category: 'foundation',
    order: 2,
  },
  {
    _id: 'partner-unops',
    name: 'UNOPS / Cities Alliance',
    logo: localCmsImage('logo-cities-alliance'),
    category: 'un-agency',
    order: 3,
  },
  {
    _id: 'partner-sdc',
    name: 'Swiss Agency for Development and Cooperation',
    logo: localCmsImage('logo-sdc'),
    category: 'government',
    order: 4,
  },
];

export const reports: Report[] = [
  {
    _id: 'report-annual',
    year: 2025,
    type: 'annual-report',
    title: {
      en: 'Annual reports and audit reports 2023–2025',
      km: 'របាយការណ៍ប្រចាំឆ្នាំ និងរបាយការណ៍សវនកម្ម ២០២៣–២០២៥',
    },
    summary: {
      en: 'Opens SKO’s reports folder (Google Drive) until the PDFs are uploaded here.',
      km: 'បើកថតឯកសាររបាយការណ៍របស់ SKO (Google Drive) រហូតដល់ឯកសារ PDF ត្រូវបានផ្ទុកឡើងទីនេះ។',
    },
    file: {
      url: 'https://example.org/reports/',
    },
  },
  {
    _id: 'report-policy',
    year: 2026,
    type: 'policy',
    title: {
      en: 'Safeguarding & Child Protection Policy',
      km: 'គោលការណ៍ការពារកុមារ',
    },
    summary: {
      en: 'Opens SKO’s reports folder (Google Drive) until the PDF is uploaded here. Read how it is applied on our [child safeguarding](/safeguarding/) page.',
      km: 'បើកថតឯកសាររបស់ SKO (Google Drive) រហូតដល់ឯកសារ PDF ត្រូវបានផ្ទុកឡើងទីនេះ។',
    },
    file: {
      url: 'https://example.org/reports/',
    },
  },
];

export const team: TeamMember[] = [
  {
    _id: 'team-ed',
    name: { en: 'Example Director' },
    role: { en: 'Executive Director', km: 'នាយកប្រតិបត្តិ' },
    group: 'leadership',
    order: 1,
  },
  {
    _id: 'team-2',
    name: { en: 'Staff member 2' },
    role: { en: 'Program Manager', km: 'ប្រធានកម្មវិធី' },
    group: 'leadership',
    reportsTo: 'team-ed',
    order: 2,
  },
  {
    _id: 'team-3',
    name: { en: 'Staff member 3' },
    role: { en: 'Project Manager', km: 'ប្រធានគម្រោង' },
    group: 'leadership',
    reportsTo: 'team-ed',
    order: 3,
  },
  {
    _id: 'team-4',
    name: { en: 'Staff member 4' },
    role: { en: 'Senior Team Leader', km: 'នាយកក្រុមជាន់ខ្ពស់' },
    group: 'leadership',
    reportsTo: 'team-ed',
    order: 4,
  },
  {
    _id: 'team-5',
    name: { en: 'Staff member 5' },
    role: {
      en: 'Finance & Admin Manager',
      km: 'ប្រធានផ្នែកហិរញ្ញវត្ថុ និងរដ្ឋបាល',
    },
    group: 'leadership',
    reportsTo: 'team-ed',
    order: 5,
  },
  {
    _id: 'team-6',
    name: { en: 'Staff member 6' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-2',
    order: 6,
  },
  {
    _id: 'team-7',
    name: { en: 'Staff member 7' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-2',
    order: 7,
  },
  {
    _id: 'team-8',
    name: { en: 'Staff member 8' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-2',
    order: 8,
  },
  {
    _id: 'team-9',
    name: { en: 'Staff member 9' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-2',
    order: 9,
  },
  {
    _id: 'team-10',
    name: { en: 'Staff member 10' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-3',
    order: 10,
  },
  {
    _id: 'team-11',
    name: { en: 'Staff member 11' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-3',
    order: 11,
  },
  {
    _id: 'team-vacancy-projects',
    name: { en: 'Volunteer / Internship', km: 'អ្នកស្ម័គ្រចិត្ត / កម្មសិក្សា' },
    group: 'staff',
    reportsTo: 'team-3',
    vacancy: true,
    order: 12,
  },
  {
    _id: 'team-12',
    name: { en: 'Staff member 12' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-4',
    order: 13,
  },
  {
    _id: 'team-13',
    name: { en: 'Staff member 13' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-4',
    order: 14,
  },
  {
    _id: 'team-14',
    name: { en: 'Staff member 14' },
    role: { en: 'Social Worker', km: 'បុគ្គលិកសង្គមកិច្ច' },
    group: 'staff',
    reportsTo: 'team-4',
    order: 15,
  },
  {
    _id: 'team-15',
    name: { en: 'Staff member 15' },
    role: {
      en: 'Finance & Admin Assistant',
      km: 'ជំនួយការហិរញ្ញវត្ថុ និងរដ្ឋបាល',
    },
    group: 'staff',
    reportsTo: 'team-5',
    order: 16,
  },
  {
    _id: 'team-vacancy-finance',
    name: { en: 'Volunteer / Internship', km: 'អ្នកស្ម័គ្រចិត្ត / កម្មសិក្សា' },
    group: 'staff',
    reportsTo: 'team-5',
    vacancy: true,
    order: 17,
  },
];

export const directorMessage: DirectorMessage = {
  name: { en: 'Example Director' },
  title: { en: 'Executive Director', km: 'នាយកប្រតិបត្តិ' },
  pullQuote: {
    en: 'Our key message is to continue putting families and children at the heart of everything we do.',
    km: 'សារសំខាន់របស់យើងគឺបន្តដាក់គ្រួសារ និងកុមារជាចំណុចស្នូលនៃអ្វីគ្រប់យ៉ាងដែលយើងធ្វើ។',
  },
  message: enOnly([
    'SKO is committed to empowering vulnerable families to become stronger, more resilient, and able to find sustainable solutions to their challenges. We will continue to strengthen our professional social work, work closely with communities and partners, and ensure that every child has the opportunity to grow up in a safe, caring, and supportive family environment.',
  ]),
};

export const orgChart: OrgChart = {
  caption: {
    en: '[NEEDS SKO] Samatapheap Khnom Organization structure',
    km: '[NEEDS SKO] រចនាសម្ព័ន្ធអង្គការសមត្ថភាពខ្ញុំ',
  },
  textVersion: enOnly([
    '[NEEDS SKO] Describe the structure as a nested list of who reports to whom. This is what makes the chart usable on a phone and for screen readers.',
  ]),
};

/* -------------------------------------------------------------------------
   Pages.
   ------------------------------------------------------------------------- */
export const pages: Page[] = [
  {
    _id: 'page-about',
    slug: 'about',
    title: { en: 'About SKO: family preservation in Phnom Penh', km: 'អំពីយើង' },
    intro: {
      en: "Samatapheap Khnom Organization (SKO) is a Cambodian local NGO whose work is family preservation: social work that keeps vulnerable families in Phnom Penh's urban poor and migrant communities together, so children grow up at home rather than in institutions.",
      km: 'អង្គការសមត្ថភាពខ្ញុំ (SKO) ជាអង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុករបស់កម្ពុជា ដែលធ្វើការគាំទ្រកុមារ គ្រួសារ និងសហគមន៍ងាយរងគ្រោះ ជាពិសេសនៅសហគមន៍ក្រីក្រទីក្រុង និងសហគមន៍ចំណាកស្រុក។',
    },
    seo: {
      title: { en: 'Family Preservation NGO in Phnom Penh: About Us' },
      description: {
        en: 'Samatapheap Khnom Organization (SKO) is a family preservation and social work NGO in Phnom Penh, registered since 2007, keeping vulnerable families together.',
      },
    },
    body: enOnly([
      'Samatapheap Khnom Organization (SKO) is a local, neutral, non-sectarian, non-political, non-racial and non-profit organization, registered with the Ministry of Interior under permit number 457 (សជណ) on 20 April 2007. SKO is recognised as Cambodia’s leading expert in family care and social work.',
      '## Our vision',
      'Vulnerable families, children, and young people live with dignity, quality of life, and prosperity.',
      '## Our mission',
      'We work in partnership and collaboration with key stakeholders to empower and enable the most vulnerable children, young people, and their families.',
      '## Our values',
      'Commitment. We work together effectively, in line with our strategic intent.',
      'Creativity. We accept the power to create and share ideas that enhance the lives of families.',
      'Hope. We inspire hope in each other, our partners, our donors and the families we work with.',
      'Integrity. We are honest and transparent in all our actions and decisions.',
      'Respect. We value the dignity, choices, potential and contribution of staff, families, partners and donors.',
      'Responsibility. We accept personal and collective responsibility for our learning and our performance, to increase our impact.',
      '## How we work: the Family Development Program (FDP)',
      '- Family-centred approach: Focuses on the overall well-being of vulnerable families, children and youth.',
      '- Strengths-based approach: Identifies family strengths, capacities, resources and resilience, alongside their needs and challenges.',
      '- Family assessment and case management: Conducts family assessments, identifies root causes and priorities, develops appropriate support and follows up on progress.',
      '- Counselling and psychosocial support: Provides counselling and emotional support to help families address personal, family and social challenges.',
      '- Referral and service linkage: Connects families with appropriate government, NGO, health, legal, education and other services.',
      '- Integrated support: Responds to different and interconnected needs, including child protection, education, health, legal documentation and economic support.',
      '- Family empowerment and participation: Encourages families to participate in identifying solutions and building their own capacity and resilience.',
      '- Partnership and community approach: Works closely with local authorities, communities, NGOs and other stakeholders to strengthen support for families.',
      '## Networking and partnership',
      'SKO recognizes that lasting change for children, families, and communities cannot be achieved by one organization alone. Networking and partnership are therefore an important part of SKO’s approach, enabling us to work together with government institutions, local authorities, NGOs, community groups, schools, service providers, development partners, and other stakeholders. See [the partners in our NGO work in Cambodia](/partners/).',
      'Through these relationships, SKO strengthens coordination, referrals, knowledge sharing, and joint problem-solving to better respond to the needs and challenges faced by vulnerable children and families. SKO values partnerships based on trust, mutual learning, shared responsibility, and a common commitment to sustainable solutions. By connecting people, services, and resources, SKO aims to strengthen [family and community resilience](/impact/) and contribute to safer, more protective, and supportive environments for children and families.',
      '## Where we work',
      '- Phnom Penh, across 14 khans within 105 Sangkat (urban poor communities are selected)',
      '- Some provinces will be selected for urban poor communities.',
      '- Four [family support programs](/programs/), all delivered through FDP',
    ]),
    faqs: [
      {
        question: {
          en: 'Is SKO a registered organisation?',
          km: 'តើ SKO ជាអង្គការដែលបានចុះបញ្ជីដែរឬទេ?',
        },
        answer: {
          en: 'Yes. Samatapheap Khnom Organization is registered with the Cambodian Ministry of Interior under permit number 457 (សជណ), issued on 20 April 2007. SKO is a local, non-political, non-profit organization.',
          km: 'បាទ/ចាស។ អង្គការសមត្ថភាពខ្ញុំ បានចុះបញ្ជីជាមួយក្រសួងមហាផ្ទៃ តាមលិខិតអនុញ្ញាតលេខ ៤៥៧ (សជណ) ចេញនៅថ្ងៃទី ២០ ខែមេសា ឆ្នាំ ២០០៧។',
        },
      },
      {
        question: {
          en: 'Where does SKO work?',
          km: 'តើ SKO ធ្វើការនៅកន្លែងណា?',
        },
        answer: {
          en: 'SKO works in the urban poor communities of Phnom Penh, Cambodia, across 14 khans and 105 sangkats.',
          km: 'SKO ធ្វើការនៅសហគមន៍ក្រីក្រតាមទីក្រុងក្នុងរាជធានីភ្នំពេញ គ្របដណ្តប់ ១៤ ខណ្ឌ និង ១០៥ សង្កាត់។',
        },
      },
      {
        question: {
          en: 'What does Samatapheap Khnom mean?',
          km: 'តើ «សមត្ថភាពខ្ញុំ» មានន័យដូចម្តេច?',
        },
        answer: {
          en: 'Samatapheap Khnom (សមត្ថភាពខ្ញុំ) is Khmer for “my capacity.” The name reflects the belief that families already hold the capability to change their own circumstances, and that our job is to support that capacity rather than replace it.',
          km: '«សមត្ថភាពខ្ញុំ» មានន័យថាសមត្ថភាពរបស់ខ្ញុំ។ វាឆ្លុះបញ្ចាំងពីជំនឿថាគ្រួសារមានលទ្ធភាពផ្លាស់ប្តូរស្ថានភាពរបស់ខ្លួនរួចទៅហើយ ហើយតួនាទីរបស់យើងគឺគាំទ្រសមត្ថភាពនោះ មិនមែនជំនួសវាទេ។',
        },
      },
    ],
  },
  {
    _id: 'page-faq',
    slug: 'faq',
    title: { en: 'Common questions about SKO, an NGO in Cambodia', km: 'សំណួរដែលសួរញឹកញាប់' },
    intro: {
      en: 'Common questions about SKO, a local NGO in Cambodia working with vulnerable families in Phnom Penh: what we do, who we help, how the Family Development Approach works, and how a Cambodian NGO, funder or company can partner with us.',
      km: 'ចម្លើយចំពោះសំណួរដែលយើងត្រូវបានសួរញឹកញាប់បំផុត ដោយម្ចាស់ជំនួយ ដៃគូ និងអ្នកដែលចង់យល់អំពីការងាររបស់យើង។',
    },
    seo: {
      title: { en: 'NGO in Cambodia: Common Questions About Our Work' },
      description: {
        en: 'Common questions about SKO, an NGO in Cambodia: what we do, who we help, whether we run an orphanage (we do not), how the Family Development Approach works.',
      },
    },
    body: enOnly(['If your question is not answered here, email info@example.org.']),
    faqs: [
      {
        question: {
          en: 'Does SKO run an orphanage or residential care centre?',
          km: 'តើ SKO មានមណ្ឌលកុមារកំព្រា ឬមណ្ឌលថែទាំកុមារដែរឬទេ?',
        },
        answer: {
          en: 'No. SKO does the opposite: our work is to [prevent children being separated from their families](/about/) in the first place. We provide counselling, case management and practical support so that families under pressure can stay together. Children do better in families than in institutions, and every part of the Family Development Program is built on that principle.',
          km: 'ទេ។ SKO ធ្វើផ្ទុយពីនេះ៖ ការងាររបស់យើងគឺទប់ស្កាត់កុំឱ្យកុមារត្រូវបែកចេញពីគ្រួសារតាំងពីដំបូង។ យើងផ្តល់ការប្រឹក្សា ការគ្រប់គ្រងករណី និងជំនួយជាក់ស្តែង ដើម្បីឱ្យគ្រួសារដែលកំពុងជួបការលំបាកអាចនៅជាមួយគ្នា។ កុមាររីកចម្រើនល្អជាងនៅក្នុងគ្រួសារ ជាងនៅក្នុងមណ្ឌល។',
        },
      },
      {
        question: {
          en: 'Is SKO a religious organisation?',
          km: 'តើ SKO ជាអង្គការសាសនាដែរឬទេ?',
        },
        answer: {
          en: 'No. SKO is a local, neutral, non-sectarian, non-political, non-racial and non-profit organisation, registered with the Cambodian Ministry of Interior. Support is offered to families on the basis of need alone, with no religious or political condition attached.',
          km: 'ទេ។ SKO ជាអង្គការមូលដ្ឋាន អព្យាក្រឹត មិនប្រកាន់សាសនា មិនប្រកាន់នយោបាយ មិនប្រកាន់ជាតិសាសន៍ និងមិនរកប្រាក់ចំណេញ។ ជំនួយត្រូវបានផ្តល់ជូនគ្រួសារដោយផ្អែកលើតម្រូវការតែប៉ុណ្ណោះ។',
        },
      },
      {
        question: { en: 'What does SKO do?', km: 'តើ SKO ធ្វើអ្វីខ្លះ?' },
        answer: {
          en: 'SKO works with [the most vulnerable families in Phnom Penh’s urban poor communities](/). Social workers visit families at home, help them identify their own needs and objectives, and connect them to health, education, administrative and economic services. The aim is for families to sustain the progress themselves after SKO withdraws. This runs through four [family support programs](/programs/), including [child protection](/programs/childrens-active-citizenship/) training.',
          km: 'SKO ធ្វើការជាមួយគ្រួសារងាយរងគ្រោះបំផុតនៅសហគមន៍ក្រីក្រក្នុងរាជធានីភ្នំពេញ។ បុគ្គលិកសង្គមកិច្ចទៅសួរសុខទុក្ខគ្រួសារនៅផ្ទះ ជួយពួកគេកំណត់តម្រូវការ និងគោលដៅរបស់ខ្លួន ហើយភ្ជាប់ពួកគេទៅសេវាសុខភាព អប់រំ រដ្ឋបាល និងសេដ្ឋកិច្ច។',
        },
      },
      {
        question: { en: 'Who does SKO help?', km: 'តើ SKO ជួយអ្នកណាខ្លះ?' },
        answer: {
          en: 'Families living in poverty in Phnom Penh’s urban poor communities, and the children and young people in them, including children at risk of separation from their families, children without birth certificates, children affected by [domestic violence](/programs/housing-and-living-conditions-hali/), children with disabilities, children affected by HIV/AIDS, and children whose parents have [migrated for work](/programs/resilient-city-and-migration/).',
          km: 'គ្រួសារដែលរស់នៅក្នុងភាពក្រីក្រនៅសហគមន៍ក្រីក្រក្នុងរាជធានីភ្នំពេញ និងកុមារ យុវជននៅក្នុងគ្រួសារទាំងនោះ រួមទាំងកុមារដែលប្រឈមនឹងការបែកចេញពីគ្រួសារ កុមារគ្មានសំបុត្រកំណើត កុមារដែលរងផលប៉ះពាល់ពីអំពើហិង្សាក្នុងគ្រួសារ កុមារពិការ និងកុមារដែលឪពុកម្តាយចំណាកស្រុក។',
        },
      },
      {
        question: {
          en: 'What is the Family Development Approach?',
          km: 'តើវិធីសាស្ត្រអភិវឌ្ឍន៍គ្រួសារជាអ្វី?',
        },
        answer: {
          en: 'A structured method for working with families in poverty, built on the premise that families are not short of capability but of support, information and access. Social workers visit families at home, assess the situation together, agree objectives the family sets for itself, and work through them over a series of visits. See [family development in practice](/programs/childrens-education-and-health/) in Khan Dangkor.',
          km: 'វិធីសាស្ត្រមានរចនាសម្ព័ន្ធសម្រាប់ធ្វើការជាមួយគ្រួសារក្រីក្រ ដោយផ្អែកលើគោលការណ៍ថាគ្រួសារមិនខ្វះសមត្ថភាពទេ ប៉ុន្តែខ្វះការគាំទ្រ ព័ត៌មាន និងលទ្ធភាពទទួលបានសេវា។',
        },
      },
      {
        question: {
          en: 'How long does SKO work with a family?',
          km: 'តើ SKO ធ្វើការជាមួយគ្រួសារមួយរយៈពេលប៉ុន្មាន?',
        },
        answer: {
          en: 'There is no fixed length. Work begins with an initial visit and a full family assessment, followed by home visits every week or twice a month. When the family’s objectives are met the case moves to phase-out. SKO returns six months later to re-assess.',
          km: 'គ្មានរយៈពេលកំណត់ទេ។ ការងារចាប់ផ្តើមដោយការទៅសួរសុខទុក្ខលើកដំបូង និងការវាយតម្លៃគ្រួសារពេញលេញ បន្តដោយការទៅផ្ទះរៀងរាល់សប្តាហ៍ ឬពីរដងក្នុងមួយខែ។ បន្ទាប់មក SKO ត្រឡប់មកវាយតម្លៃឡើងវិញនៅ ៦ ខែក្រោយ។',
        },
      },
      {
        question: {
          en: 'What happens after SKO stops working with a family?',
          km: 'តើមានអ្វីកើតឡើងបន្ទាប់ពី SKO ឈប់ធ្វើការជាមួយគ្រួសារ?',
        },
        answer: {
          en: 'SKO re-assesses every family six months after phase-out. That follow-up is the point: it is the difference between a case that was closed and a family whose situation actually held.',
          km: 'SKO វាយតម្លៃគ្រួសារនីមួយៗឡើងវិញ ៦ ខែបន្ទាប់ពីបញ្ចប់កម្មវិធី។ ការតាមដាននេះជាចំណុចសំខាន់៖ វាជាភាពខុសគ្នារវាងករណីដែលបានបិទ និងគ្រួសារដែលស្ថានភាពពិតជាបានប្រសើរឡើងជាប់លាប់។',
        },
      },
      {
        question: {
          en: 'Why does SKO work in people’s homes rather than at a centre?',
          km: 'ហេតុអ្វី SKO ធ្វើការនៅផ្ទះប្រជាជន ជាជាងនៅមណ្ឌល?',
        },
        answer: {
          en: 'Because the obstacles are in the home. Visiting families where they live means seeing the actual conditions, and it removes the cost and time of travelling to an office, which for a family already stretched is often the reason support never starts.',
          km: 'ព្រោះឧបសគ្គស្ថិតនៅក្នុងផ្ទះ។ ការទៅសួរសុខទុក្ខគ្រួសារនៅកន្លែងរស់នៅ មានន័យថាឃើញលក្ខខណ្ឌជាក់ស្តែង ហើយក៏លុបបំបាត់ការចំណាយ និងពេលវេលាធ្វើដំណើរទៅការិយាល័យផងដែរ។',
        },
      },
      {
        question: {
          en: 'How does SKO measure its results?',
          km: 'តើ SKO វាស់វែងលទ្ធផលរបស់ខ្លួនដោយរបៀបណា?',
        },
        answer: {
          en: 'Cases are managed in OSCaR, the sector-standard monitoring and evaluation system used across Cambodia’s social work sector, so programme outcomes are measured rather than asserted.',
          km: 'ករណីត្រូវបានគ្រប់គ្រងក្នុងប្រព័ន្ធ OSCaR ដែលជាប្រព័ន្ធត្រួតពិនិត្យ និងវាយតម្លៃស្តង់ដារនៃវិស័យសង្គមកិច្ចនៅកម្ពុជា ដូច្នេះលទ្ធផលកម្មវិធីត្រូវបានវាស់វែង មិនមែនគ្រាន់តែអះអាងទេ។',
        },
      },
      {
        question: {
          en: 'How can my organisation partner with SKO?',
          km: 'តើអង្គការរបស់ខ្ញុំអាចក្លាយជាដៃគូជាមួយ SKO ដោយរបៀបណា?',
        },
        answer: {
          en: 'SKO works in partnership with government ministries, NGOs and private-sector partners, and holds quarterly meetings with partners to work through shared challenges. Email info@example.org to start a conversation or [visit our office in Phnom Penh](/contact/).',
          km: 'SKO ធ្វើការជាដៃគូជាមួយក្រសួង អង្គការក្រៅរដ្ឋាភិបាល និងដៃគូវិស័យឯកជន ហើយរៀបចំកិច្ចប្រជុំប្រចាំត្រីមាសជាមួយដៃគូ។ សូមផ្ញើអ៊ីមែលទៅ info@example.org។',
        },
      },
    ],
  },
  {
    _id: 'page-safeguarding',
    slug: 'safeguarding',
    title: {
      en: 'Child safeguarding: our policy and how to report a concern',
      km: 'ការការពារកុមារ',
    },
    intro: {
      en: 'Child safeguarding at SKO means every person working with us, staff, volunteers and partners, is responsible for keeping children safe. It applies to all our work with [vulnerable families](/) and to the [child protection](/programs/childrens-active-citizenship/) training we deliver.',
      km: 'មនុស្សគ្រប់រូបដែលធ្វើការជាមួយ SKO បុគ្គលិក អ្នកស្ម័គ្រចិត្ត និងដៃគូ មានទំនួលខុសត្រូវរក្សាសុវត្ថិភាពកុមារ។',
    },
    seo: {
      title: { en: 'Child Safeguarding Policy and How to Report a Concern' },
      description: {
        en: "SKO's child safeguarding policy: every staff member, volunteer and partner is responsible for keeping children safe. How to report a concern, and the policy.",
      },
    },
    body: enOnly([
      '## Reporting a concern',
      'To report a safeguarding concern, please contact the Senior Team Leader directly at safeguarding@example.org or +855 00 000 000 rather than using the form below. Concerns are treated confidentially.',
      'The full policy is available under [Reports & policies](/reports/).',
    ]),
  },
  {
    _id: 'page-impact',
    slug: 'impact',
    title: {
      en: "Our impact on women's empowerment and family resilience",
      km: 'លទ្ធផល និងផលប្រយោជន៍',
    },
    intro: {
      en: "SKO measures its impact in women's empowerment, family resilience and child protection. In the HALI programme, 89% of households report more equitable decision-making, 75% of women surveyed make the household's financial decisions, and 94% know where to seek help for [gender-based violence](/programs/housing-and-living-conditions-hali/).",
      km: 'អ្វីដែលយើងបានធ្វើ របៀបដែលយើងរាប់ និងអ្វីដែលគ្រួសារដែលយើងធ្វើការជាមួយបាននិយាយ។',
    },
    seo: {
      title: { en: "Women's Empowerment & Family Resilience: Our Impact" },
      description: {
        en: "SKO's impact in Phnom Penh: women's empowerment and family resilience. 89% of households report fairer decisions and 94% know where to get help for GBV.",
      },
    },
    body: enOnly([
      'Through the Family Development Approach (FDA), SKO’s work goes beyond immediate support. It helps families, youth, and children recognize their own strengths, build confidence, and take an active role in identifying challenges and finding solutions. Through counselling, guidance, and regular engagement, families gradually become more capable of making informed decisions and managing difficulties with greater confidence and resilience.',
      '## Children and youth',
      "For children and youth, empowerment means giving them opportunities to be heard, express their needs, develop life skills, and participate in decisions that affect their lives. This helps them build confidence, responsibility, and hope for their future rather than depending only on external support. Child protection training is delivered through [Children's Active Citizenship](/programs/childrens-active-citizenship/).",
      '## Families, communities and economic resilience',
      'At the family and community level, empowerment strengthens relationships, communication, mutual support, and community participation. Families become more connected to available services and resources, while communities become better able to support vulnerable children and families through the [Family Development Program](/programs/childrens-education-and-health/) delivered in Khan Dangkor.',
      'The lasting impact of SKO’s work is therefore not only the support provided today, but the strength, knowledge, confidence, and resilience that people can carry forward and use to create positive change in their own lives and communities.',
      '## Results by project',
      'The results for each of SKO’s four projects are on their own programme pages. Month-by-month updates are under [activities from our family strengthening programs](/activities/).',
    ]),
  },
  {
    _id: 'page-privacy',
    slug: 'privacy',
    title: { en: 'Privacy', km: 'ឯកជនភាព' },
    intro: {
      en: 'What this website collects, which is almost nothing.',
      km: 'អ្វីដែលគេហទំព័រនេះប្រមូល ដែលស្ទើរតែគ្មានអ្វីទាំងអស់។',
    },
    body: blocks(
      [
        'This website sets no cookies. Analytics is provided by Cloudflare Web Analytics, which is cookieless and does not track individuals across sites. There is no advertising or tracking of any kind.',
        'When you send a message through a form on this site, the details you type are emailed to SKO and are not stored on the website or in any database. A Cloudflare Turnstile check runs to block automated spam. Your IP address is not stored; a hashed value is used briefly to limit repeated submissions.',
        '[NEEDS SKO] Add how long SKO keeps emailed enquiries, and who to contact about personal data.',
      ],
      [
        'គេហទំព័រនេះមិនប្រើខូគីទេ។ ការវិភាគស្ថិតិផ្តល់ដោយ Cloudflare Web Analytics ដែលមិនប្រើខូគី និងមិនតាមដានបុគ្គលឆ្លងកាត់គេហទំព័រផ្សេងៗ។ គ្មានការផ្សាយពាណិជ្ជកម្ម ឬការតាមដានណាមួយឡើយ។',
        'នៅពេលអ្នកផ្ញើសារតាមទម្រង់នៅលើគេហទំព័រនេះ ព័ត៌មានដែលអ្នកវាយបញ្ចូលត្រូវបានផ្ញើទៅ SKO តាមអ៊ីមែល ហើយមិនត្រូវបានរក្សាទុកនៅលើគេហទំព័រទេ។',
      ],
    ),
  },
];
