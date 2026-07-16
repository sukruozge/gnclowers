import { describe, it, expect } from 'vitest';
import { effectiveUsdRate, productRates, displayPrice, type Rates } from './currency';

const rates: Rates = { usd: 47, eur: 53 };

describe('effectiveUsdRate', () => {
  it('derives a per-product rate from a custom USD price', () => {
    expect(effectiveUsdRate(2350, 59, 47)).toBeCloseTo(2350 / 59, 6);
  });
  it('falls back to the global rate without a custom price', () => {
    expect(effectiveUsdRate(2350, undefined, 47)).toBe(47);
    expect(effectiveUsdRate(2350, 0, 47)).toBe(47);
  });
});

describe('productRates + displayPrice (EN)', () => {
  it('shows the exact custom USD price for the base amount', () => {
    expect(displayPrice(2350, 'en', productRates(2350, 59, rates))).toBe('$59.00');
  });
  it('scales a variant price proportionally to the custom base', () => {
    // variant TRY 2820 with base 2350 → 59 * 2820/2350 = 70.80
    expect(displayPrice(2820, 'en', productRates(2350, 59, rates))).toBe('$70.80');
  });
  it('auto-converts when no custom price is set', () => {
    expect(displayPrice(2350, 'en', productRates(2350, undefined, rates))).toBe('$50.00');
  });
  it('leaves the TR price untouched', () => {
    expect(displayPrice(2350, 'tr', productRates(2350, 59, rates))).toContain('2.350,00');
  });
});
