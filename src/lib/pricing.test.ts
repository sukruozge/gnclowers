import { describe, it, expect } from 'vitest';
import { pricesHidden, priceLabel, instagramUrl, whatsappUrl } from '@lib/pricing';

describe('pricesHidden', () => {
  it('reads the settings flag', () => {
    // Single switch for the whole storefront: flip settings.hidePrices to bring
    // prices (and the whole buy flow) back.
    expect(typeof pricesHidden()).toBe('boolean');
  });
});

describe('priceLabel', () => {
  it('tells Turkish visitors to ask for the price', () => {
    expect(priceLabel('tr')).toBe('Fiyat için DM');
  });

  it('tells English visitors to ask for the price', () => {
    expect(priceLabel('en')).toBe('DM for price');
  });
});

describe('instagramUrl', () => {
  it('points at the shop profile', () => {
    expect(instagramUrl()).toMatch(/^https:\/\/(www\.)?instagram\.com\/aselovers/);
  });
});

describe('whatsappUrl', () => {
  const url = whatsappUrl('Örgü Tavşan', 'https://aseloves.com/tr/urun/orgu-tavsan-1', 'tr');

  it('uses a wa.me link with a digits-only number', () => {
    expect(url).toMatch(/^https:\/\/wa\.me\/905067927685\?/);
  });

  it('prefills a message naming the product', () => {
    expect(decodeURIComponent(url)).toContain('Örgü Tavşan');
  });

  it('includes the product link so we know what they mean', () => {
    expect(decodeURIComponent(url)).toContain('https://aseloves.com/tr/urun/orgu-tavsan-1');
  });

  it('asks for the price in the visitor language', () => {
    expect(decodeURIComponent(url)).toContain('fiyat');
    expect(decodeURIComponent(whatsappUrl('Bunny', 'https://x/y', 'en'))).toContain('price');
  });

  it('carries the shopper note when they wrote one', () => {
    const withNote = whatsappUrl('Örgü Tavşan', 'https://x/y', 'tr', 'Kırmızı olsun');
    expect(decodeURIComponent(withNote)).toContain('Kırmızı olsun');
  });

  it('percent-encodes the message so the link stays valid', () => {
    expect(url).not.toContain(' ');
    expect(url).not.toContain('\n');
  });
});
