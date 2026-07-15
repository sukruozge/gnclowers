import type { APIRoute } from 'astro';
import { buildMerchantFeed } from '@lib/merchant-feed';

export const GET: APIRoute = ({ site }) => {
  const xml = buildMerchantFeed(site!.toString().replace(/\/+$/, ''));
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
