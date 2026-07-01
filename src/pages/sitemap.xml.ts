import type { APIRoute } from 'astro';
import { buildSitemap } from '@lib/sitemap';

export const GET: APIRoute = ({ site }) => {
  const xml = buildSitemap(site!.toString().replace(/\/+$/, ''));
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
