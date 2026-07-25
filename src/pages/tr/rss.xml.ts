import type { APIRoute } from 'astro';
import { buildRss } from '@lib/rss';

export const GET: APIRoute = ({ site }) => {
  const xml = buildRss(site!.toString().replace(/\/+$/, ''), 'tr');
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
