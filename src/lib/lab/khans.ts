/**
 * Phnom Penh's 14 khans on a schematic tile grid: rows run north to south and
 * columns west to east, so neighbours sit roughly where they are on the ground.
 * The patterns match the romanisations that turn up in SKO's own copy.
 */
export interface Khan {
  id: string;
  name: string;
  pattern: RegExp;
  row: number;
  col: number;
}

export const khans: Khan[] = [
  { id: 'prek-pnov', name: 'Prek Pnov', pattern: /pr(a)?ek\s*pnov/i, row: 1, col: 2 },
  { id: 'russey-keo', name: 'Russey Keo', pattern: /russe[iy]\s*keo/i, row: 1, col: 4 },
  { id: 'chroy-changvar', name: 'Chroy Changvar', pattern: /chro?u?y\s*changvar/i, row: 1, col: 5 },
  { id: 'sen-sok', name: 'Sen Sok', pattern: /sen\s*sok|saensokh/i, row: 2, col: 2 },
  { id: 'tuol-kouk', name: 'Tuol Kouk', pattern: /t[uo]{1,2}l\s*k[oa]u?r?k/i, row: 2, col: 3 },
  { id: 'daun-penh', name: 'Daun Penh', pattern: /d[ao]un\s*penh/i, row: 2, col: 4 },
  { id: 'kamboul', name: 'Kamboul', pattern: /kambo?ul/i, row: 3, col: 1 },
  { id: 'pou-senchey', name: 'Pou Senchey', pattern: /p(ou|or|o)\s*sen\s*chey/i, row: 3, col: 2 },
  { id: '7-makara', name: '7 Makara', pattern: /(7|prampir)\s*makara/i, row: 3, col: 3 },
  { id: 'boeng-keng-kang', name: 'Boeng Keng Kang', pattern: /b(oe|eu)ng\s*keng\s*kang/i, row: 3, col: 4 },
  { id: 'chbar-ampov', name: 'Chbar Ampov', pattern: /chbar\s*amp(ov|eou)/i, row: 3, col: 5 },
  { id: 'dangkao', name: 'Dangkao', pattern: /dangk(ao|or)/i, row: 4, col: 2 },
  { id: 'mean-chey', name: 'Mean Chey', pattern: /mean\s*chey/i, row: 4, col: 3 },
  { id: 'chamkar-mon', name: 'Chamkar Mon', pattern: /chamkar\s*mon/i, row: 4, col: 4 },
];
