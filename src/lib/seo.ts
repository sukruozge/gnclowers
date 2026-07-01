import type { Locale } from './i18n';

export function canonical(site: string, locale: Locale, path: string): string {
  const base = site.replace(/\/+$/, '');
  const clean = path.replace(/^\/+/, '');
  return clean ? `${base}/${locale}/${clean}` : `${base}/${locale}`;
}

export function alternates(
  site: string,
  paths: Record<Locale, string>,
): Array<{ hreflang: string; href: string }> {
  return [
    { hreflang: 'tr', href: canonical(site, 'tr', paths.tr) },
    { hreflang: 'en', href: canonical(site, 'en', paths.en) },
    { hreflang: 'x-default', href: canonical(site, 'en', paths.en) },
  ];
}
