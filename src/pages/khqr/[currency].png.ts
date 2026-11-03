import type { APIRoute, GetStaticPaths } from 'astro';
import { donationDetails } from '~/lib/donation';
import { encodeQr } from '~/lib/qr';
import { qrPng } from '~/lib/qr-png';

export const getStaticPaths = (() =>
  donationDetails.accounts.map((account) => ({
    params: { currency: account.currency.toLowerCase() },
    props: { khqr: account.khqr },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(new Uint8Array(qrPng(encodeQr(props.khqr as string))), {
    headers: { 'Content-Type': 'image/png' },
  });
