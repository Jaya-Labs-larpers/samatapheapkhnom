/**
 * Draft questions for the "Families, not orphanages" quiz. Every claim carries
 * its source; none of this is SKO-approved copy yet.
 * TODO(content): SKO to check each fact and wording before it leaves /lab/.
 * TODO(km): Khmer version.
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: Array<{ text: string; correct?: boolean }>;
  explanation: string;
  source: { label: string; href: string };
}

export const quiz: QuizQuestion[] = [
  {
    id: 'q-parents',
    question: 'Most children living in Cambodia’s orphanages have no parents.',
    options: [{ text: 'True' }, { text: 'False', correct: true }],
    explanation:
      'Studies have found that around three in four children in Cambodian residential care have at least one living parent.',
    source: {
      label: 'Better Care Network',
      href: 'https://bettercarenetwork.org/sites/default/files/Residential%20Care%20Center%20Perspectives%20on%20Orphanage%20Tourism%20in%20Cambodia.pdf',
    },
  },
  {
    id: 'q-why',
    question: 'Why are most children placed in residential care?',
    options: [
      { text: 'They have no family left' },
      { text: 'Poverty: parents hope the centre can pay for food and school', correct: true },
      { text: 'A court orders it' },
    ],
    explanation:
      'Most placements come from poverty and the hope of an education, not from a child having no family.',
    source: {
      label: 'Better Care Network',
      href: 'https://bettercarenetwork.org/regions-countries/asia/southeastern-asia/cambodia',
    },
  },
  {
    id: 'q-visit',
    question: 'Visiting an orphanage as a tourist helps the children who live there.',
    options: [{ text: 'True' }, { text: 'False', correct: true }],
    explanation:
      'Child-protection campaigns in Cambodia ask visitors not to: orphanage tourism has fuelled an industry that keeps children apart from their families.',
    source: { label: 'ThinkChildSafe', href: 'https://www.thinkchildsafe.org/thinkbeforevisiting' },
  },
  {
    id: 'q-kin',
    question:
      'Of Cambodian children who live apart from their parents, how many live with relatives?',
    options: [{ text: 'About 1 in 4' }, { text: 'About half' }, { text: 'Almost all', correct: true }],
    explanation: 'Almost all of them: 97% live in kinship care, looked after by relatives.',
    source: {
      label: 'Better Care Network (DHS 2021–22)',
      href: 'https://bettercarenetwork.org/regions-countries/asia/southeastern-asia/cambodia',
    },
  },
  {
    id: 'q-help',
    question: 'What helps a child grow up safely at home?',
    options: [
      { text: 'A place in an orphanage' },
      { text: 'Social work that supports the whole family', correct: true },
      { text: 'Nothing can be done' },
    ],
    explanation:
      'That is SKO’s work: counselling, referrals and support that keep families together, through the Family Development Program.',
    source: { label: 'About SKO', href: '/about/' },
  },
];
