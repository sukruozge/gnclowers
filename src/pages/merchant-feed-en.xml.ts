import type { APIRoute } from 'astro';
import { buildMerchantFeed } from '@lib/merchant-feed';
import settings from '../data/settings.json';

// USD product feed for Google Merchant Center (US/Canada targeting). Prices are
// converted from the TRY base with the settings rate; links point to /en pages.
export const GET: APIRoute = ({ site }) => {
  const usdRate = Number((settings as any).rates?.usd) || 47.03;
  const xml = buildMerchantFeed(site!.toString().replace(/\/+$/, ''), { locale: 'en', usdRate });
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
