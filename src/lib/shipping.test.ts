import { describe, it, expect } from 'vitest';
import { intlFeeNative, shippingFeeTry, type ShippingConfig } from './shipping';

const cfg: ShippingConfig = {
  tr: { fee: 0, freeOver: 0 },
  intl: {
    currency: 'USD',
    default: 40,
    extraItemPct: 25,
    byCountry: { US: 28, CA: 32, AU: 36, DE: 32, CH: 36 },
  },
};

describe('intlFeeNative', () => {
  it('charges the country base for a single item', () => {
    expect(intlFeeNative(cfg, 'US', 1)).toBe(28);
    expect(intlFeeNative(cfg, 'CA', 1)).toBe(32);
    expect(intlFeeNative(cfg, 'CH', 1)).toBe(36);
  });

  it('adds 25% of the base per additional item', () => {
    expect(intlFeeNative(cfg, 'US', 2)).toBe(35); // 28 + 7
    expect(intlFeeNative(cfg, 'US', 3)).toBe(42); // 28 + 7 + 7
    expect(intlFeeNative(cfg, 'DE', 2)).toBe(40); // 32 + 8
  });

  it('falls back to the default for unlisted countries', () => {
    expect(intlFeeNative(cfg, 'JP', 1)).toBe(40);
    expect(intlFeeNative(cfg, 'INTL', 2)).toBe(50); // 40 + 10
  });

  it('is free for Türkiye and treats bad item counts as 1', () => {
    expect(intlFeeNative(cfg, 'TR', 5)).toBe(0);
    expect(intlFeeNative(cfg, 'US', 0)).toBe(28);
    expect(intlFeeNative(cfg, 'US', -3)).toBe(28);
  });
});

describe('shippingFeeTry', () => {
  it('converts the international USD fee to TRY via usdRate', () => {
    expect(shippingFeeTry(cfg, 'US', { itemCount: 2, usdRate: 47 })).toBe(1645); // 35 * 47
    expect(shippingFeeTry(cfg, 'JP', { itemCount: 1, usdRate: 47 })).toBe(1880); // 40 * 47
  });

  it('uses the domestic TRY fee for Türkiye', () => {
    const trCfg: ShippingConfig = { tr: { fee: 60, freeOver: 1000 }, intl: cfg.intl };
    expect(shippingFeeTry(trCfg, 'TR', { subtotalTry: 500 })).toBe(60);
    expect(shippingFeeTry(trCfg, 'TR', { subtotalTry: 1500 })).toBe(0); // free over threshold
  });
});
