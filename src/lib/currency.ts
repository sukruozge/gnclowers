// Multi-currency helpers. TRY is the base (all product prices are stored in TRY);
// the EN site shows USD, the TR site shows TRY. Rates are TRY per 1 unit and live
// in settings.json (refreshed by the Etsy sync). Client- and server-safe: no JSON
// import here so it can be used in browser scripts without bundling the catalog.

export type Currency = 'TRY' | 'USD' | 'EUR';
export interface Rates { usd: number; eur: number }

export const FALLBACK_RATES: Rates = { usd: 47.03, eur: 53.65 };

export function localeCurrency(locale: 'tr' | 'en'): Currency {
  return locale === 'tr' ? 'TRY' : 'USD';
}

// Convert a TRY amount into the target currency.
export function toCurrency(tryAmount: number, cur: Currency, rates: Rates): number {
  if (cur === 'USD') return tryAmount / (rates.usd || FALLBACK_RATES.usd);
  if (cur === 'EUR') return tryAmount / (rates.eur || FALLBACK_RATES.eur);
  return tryAmount;
}

export function fmtMoney(amount: number, cur: Currency, locale: 'tr' | 'en' = 'en'): string {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency: cur,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

// One-shot: TRY base amount → formatted string in the locale's currency.
export function displayPrice(tryAmount: number, locale: 'tr' | 'en', rates: Rates): string {
  const cur = localeCurrency(locale);
  return fmtMoney(toCurrency(tryAmount, cur, rates), cur, locale);
}
