import { describe, it, expect } from 'vitest';
import { canonical, alternates } from '@lib/seo';

const SITE = 'https://aselovers.example';

describe('seo', () => {
  it('builds an absolute canonical url', () => {
    expect(canonical(SITE, 'tr', 'urunler')).toBe('https://aselovers.example/tr/urunler');
    expect(canonical(SITE, 'en', '')).toBe('https://aselovers.example/en');
  });
  it('emits tr, en and x-default alternates', () => {
    const alt = alternates(SITE, { tr: 'urunler', en: 'products' });
    expect(alt).toEqual([
      { hreflang: 'tr', href: 'https://aselovers.example/tr/urunler' },
      { hreflang: 'en', href: 'https://aselovers.example/en/products' },
      { hreflang: 'x-default', href: 'https://aselovers.example/en/products' },
    ]);
  });
});
