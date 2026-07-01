// Cloudflare Pages Function: redirect "/" by visitor country.
export const onRequestGet = (context) => {
  const country = context.request.cf?.country ?? null;
  const locale = country === 'TR' ? 'tr' : 'en';
  return Response.redirect(new URL(`/${locale}`, context.request.url).toString(), 302);
};
