import { describe, it, expect } from 'vitest';
import { t, LOCALES, strings } from '@lib/i18n';

describe('i18n', () => {
  it('uses curly apostrophes/quotes in Turkish strings, never straight ASCII', () => {
    const offenders = Object.entries(strings.tr)
      .filter(([, value]) => /[a-zçğıöşüA-ZÇĞİÖŞÜ]'[a-zçğıöşü]/.test(value) || value.includes('"'))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });
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
  it('has home strings', () => {
    expect(t('home.heroTitle', 'en')).toBe('Handmade amigurumi, made to be loved');
    expect(t('home.featured', 'tr')).toBe('Öne Çıkanlar');
    expect(t('home.newsletterCta', 'en')).toBe('Join the list');
  });
  it('has enhancement strings', () => {
    expect(t('trust.handmade', 'tr')).toBe('El yapımı, siparişe özel');
    expect(t('reviews.title', 'en')).toBe('What buyers say');
    expect(t('faq.title', 'tr')).toBe('Sıkça Sorulan Sorular');
    expect(t('process.step1Title', 'en')).toBe('Designed');
    expect(t('nav.shopAll', 'tr')).toBe('Tüm Ürünler');
  });
  it('has brand/polish strings', () => {
    expect(t('nav.home', 'tr')).toBe('Anasayfa');
    expect(t('nav.home', 'en')).toBe('Home');
    expect(t('wa.msg', 'en')).toBe("Hi! I'd like to ask about your products.");
    expect(t('blog.readMore', 'tr')).toBe('Devamını oku');
    expect(t('contact.title', 'en')).toBe('Get in touch');
  });
});
