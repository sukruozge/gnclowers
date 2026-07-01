import type { Locale } from './i18n';

export function pickLocale(country: string | null): Locale {
  return country === 'TR' ? 'tr' : 'en';
}
