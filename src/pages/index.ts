import type { APIRoute } from 'astro';
import { pickLocale } from '@lib/locale';

// Rendered on-demand at the edge (not prerendered) so it can read the
// visitor's country from Cloudflare's CF-IPCountry header and redirect.
export const prerender = false;

export const GET: APIRoute = ({ request, redirect }) => {
  const country = request.headers.get('CF-IPCountry');
  return redirect(`/${pickLocale(country)}`, 302);
};
