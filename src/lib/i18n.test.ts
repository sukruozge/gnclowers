import { describe, it, expect } from 'vitest';
import { t, LOCALES } from '@lib/i18n';

describe('i18n', () => {
  it('exposes exactly tr and en', () => {
    expect(LOCALES).toEqual(['tr', 'en']);
  });
  it('returns the localized string', () => {
    expect(t('nav.products', 'tr')).toBe('Ürünler');
    expect(t('nav.products', 'en')).toBe('Products');
  });
  it('falls back to the key when missing', () => {
    expect(t('does.not.exist', 'en')).toBe('does.not.exist');
  });
  it('has redesign nav/footer strings', () => {
    expect(t('footer.tagline', 'tr')).toBe('Sevgiyle örülmüş el yapımı amigurumi.');
    expect(t('footer.tagline', 'en')).toBe('Handmade amigurumi, crocheted with love.');
    expect(t('footer.shop', 'en')).toBe('Shop');
  });
});
