/**
 * Donation details for /donate. Kept in the repository rather than Sanity so a
 * change to where money goes is reviewed in git like code.
 *
 * `placeholder: true` marks every value below as a non-payable sample. While it
 * is set, production builds leave /donate out entirely and Donate buttons fall
 * back to the contact form, so the sample can never reach the live site.
 */

export interface DonationAccount {
  currency: 'USD' | 'KHR';
  bankName: string;
  accountName: string;
  accountNumber: string;
  /** Path under /public to SKO's bank-issued KHQR image; null shows the sample tile. */
  qrImage: string | null;
}

export const donation = {
  placeholder: true,
  accounts: [
    {
      currency: 'USD',
      bankName: 'Bank name',
      accountName: 'Account name',
      accountNumber: '000 000 000',
      qrImage: null,
    },
    {
      currency: 'KHR',
      bankName: 'Bank name',
      accountName: 'Account name',
      accountNumber: '000 000 000',
      qrImage: null,
    },
  ] satisfies DonationAccount[],
};

export const donatePageLive = !(donation.placeholder && import.meta.env.PROD);
