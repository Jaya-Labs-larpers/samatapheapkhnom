import { donation } from '~/config/donation';
import { isProductionDeployment } from './config';
import { validateKhqr, type Currency } from './khqr';

export interface DonationAccount {
  currency: Currency;
  /** Display format; spaces are stripped when a donor copies it. */
  accountNumber: string;
  /** Decoded static KHQR payload, starting "000201". */
  khqr: string;
  /** ABA QR share link. */
  abaLink?: string;
}

export interface DonationConfig {
  /** Legal account name, shown to donors. */
  accountName: string;
  /** Field 59 exactly as encoded in the QR (ABA caps it at 25 characters). */
  khqrName: string;
  accounts: DonationAccount[];
  bank: { name: string; swift: string; address: string };
}

export interface Donation extends DonationConfig {
  /** Stand-in details for local review; the QRs encode plain text and cannot be paid. */
  isPlaceholder: boolean;
}

const PLACEHOLDER_QR = 'SKO PLACEHOLDER - NOT FOR PAYMENT';

const placeholder: DonationConfig = {
  accountName: 'Samatapheap Khnom Organization',
  khqrName: 'PLACEHOLDER',
  accounts: [
    { currency: 'USD', accountNumber: '000 000 000', khqr: PLACEHOLDER_QR },
    { currency: 'KHR', accountNumber: '000 000 000', khqr: PLACEHOLDER_QR },
  ],
  bank: { name: 'Bank name', swift: 'XXXXXXXX', address: 'Bank address' },
};

function resolve(config: DonationConfig | null): Donation {
  if (!config) {
    if (isProductionDeployment)
      throw new Error(
        "[donate] src/config/donation.ts is empty. Add SKO's decoded KHQR payloads and bank details before a production build.",
      );
    return { ...placeholder, isPlaceholder: true };
  }

  const errors = config.accounts.flatMap((account) => validateKhqr(account, config.khqrName));
  if (config.accounts.length === 0) errors.push('no accounts are configured');
  const currencies = config.accounts.map((account) => account.currency);
  if (new Set(currencies).size !== currencies.length) errors.push('two accounts share a currency');
  if (errors.length > 0)
    throw new Error(`[donate] src/config/donation.ts failed validation:\n${errors.join('\n')}`);

  return { ...config, isPlaceholder: false };
}

export const donationDetails = resolve(donation);
