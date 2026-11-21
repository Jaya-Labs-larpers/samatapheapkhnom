export const CONSENT_KEY = 'sko-analytics-choice';

export type Choice = 'accepted' | 'declined';

export function readChoice(storage: Pick<Storage, 'getItem'> | null | undefined): Choice | null {
  try {
    const value = storage?.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function saveChoice(storage: Pick<Storage, 'setItem'> | null | undefined, choice: Choice): void {
  try {
    storage?.setItem(CONSENT_KEY, choice);
  } catch {}
}

export function analyticsCookieNames(cookieHeader: string): string[] {
  return cookieHeader
    .split(';')
    .map(pair => (pair.split('=')[0] ?? '').trim())
    .filter(name => /^_ga(_|$)/.test(name));
}

/** Google Analytics writes its cookies on the widest domain it can, so expire each one on every parent domain too. */
export function clearAnalyticsCookies(doc: { cookie: string }, hostname: string): void {
  const labels = hostname.split('.');
  const domains: string[] = [];
  for (let i = 0; labels.length - i >= 2; i++) domains.push(labels.slice(i).join('.'));
  for (const name of analyticsCookieNames(doc.cookie)) {
    const base = `${name}=; Max-Age=0; path=/`;
    doc.cookie = base;
    for (const domain of domains) doc.cookie = `${base}; domain=${domain}`;
  }
}
