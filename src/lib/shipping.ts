// Region-based shipping. Rates live in settings.json (admin-editable) so no code
// change is needed to adjust them. Defaults are 0 (no surprise charges).
//
// Domestic (TR) fees are stored in TRY. International fees are stored in their
// native currency (USD) per destination country; the first item pays the country
// base and each additional item adds `extraItemPct`% of that base. Everything is
// finally expressed in TRY (see `shippingFeeTry`) so it converts to the order
// currency exactly like item prices do — the server never trusts client amounts.
export interface IntlShipping {
  currency?: string;                    // native currency of the amounts below (e.g. 'USD')
  default?: number;                     // fallback base fee for any country not listed
  extraItemPct?: number;                // % of the base added per ADDITIONAL item
  byCountry?: Record<string, number>;   // ISO-3166 alpha-2 → base fee
}
export interface ShippingConfig {
  tr?: { fee?: number; freeOver?: number };
  intl?: IntlShipping;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * International shipping fee in its NATIVE currency (USD), for a destination and
 * the total number of items in the cart. First item = country base; each extra
 * item adds `extraItemPct`% of the base. Returns 0 for TR / unknown-with-no-default.
 */
export function intlFeeNative(cfg: ShippingConfig | undefined, country: string, itemCount = 1): number {
  const intl = cfg?.intl ?? {};
  const cc = String(country || '').toUpperCase();
  if (cc === 'TR') return 0;
  const base = Number(intl.byCountry?.[cc] ?? intl.default ?? 0) || 0;
  if (base <= 0) return 0;
  const n = Math.max(1, Math.floor(Number(itemCount) || 1));
  const pct = Number(intl.extraItemPct ?? 0) || 0;
  return round2(base * (1 + (pct / 100) * (n - 1)));
}

/**
 * Server-authoritative shipping fee, expressed in TRY so it converts to the order
 * currency the same way item prices do. TR = domestic TRY fee (free over threshold);
 * international = native (USD) fee × usdRate.
 */
export function shippingFeeTry(
  cfg: ShippingConfig | undefined,
  country: string,
  opts: { subtotalTry?: number; itemCount?: number; usdRate?: number } = {}
): number {
  const isTr = String(country || 'TR').toUpperCase() === 'TR';
  if (isTr) {
    const fee = Number(cfg?.tr?.fee ?? 0) || 0;
    const freeOver = Number(cfg?.tr?.freeOver ?? 0) || 0;
    if (freeOver > 0 && Number(opts.subtotalTry ?? 0) >= freeOver) return 0;
    return fee;
  }
  const usd = intlFeeNative(cfg, country, opts.itemCount ?? 1);
  return round2(usd * (Number(opts.usdRate) || 0));
}
