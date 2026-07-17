import { describe, it, expect } from 'vitest';
import { productJsonLd } from '@lib/jsonld';
import type { Product } from '@lib/products';

const p: Product = {
  id: '9', title_en: 'Bunny', title_tr: 'Tavşan', description_en: 'A bunny', description_tr: 'Bir tavşan',
  price: 1912.5, currency: 'TRY', image: 'https://img/x.jpg', images: ['https://img/x.jpg'], url: 'https://etsy/9', category: 'amigurumi', tags: [], isNew: true, isActive: true,
};

describe('productJsonLd', () => {
  const obj = JSON.parse(productJsonLd(p, 'en', 'https://aseloves.com/en/product/bunny-9'));
  it('is a schema.org Product', () => {
    expect(obj['@context']).toBe('https://schema.org');
    expect(obj['@type']).toBe('Product');
    expect(obj.name).toBe('Bunny');
  });
  it('has a correct TRY offer on the /tr page', () => {
    const trObj = JSON.parse(productJsonLd(p, 'tr', 'https://aseloves.com/tr/urun/tavsan-9'));
    expect(trObj.offers['@type']).toBe('Offer');
    expect(trObj.offers.price).toBe('1912.50');
    expect(trObj.offers.priceCurrency).toBe('TRY');
    expect(trObj.offers.availability).toBe('https://schema.org/InStock');
    // Offer URL points to the on-site canonical product page (not an external marketplace).
    expect(trObj.offers.url).toBe('https://aseloves.com/tr/urun/tavsan-9');
  });
  it('converts the offer to USD on the /en page so currency matches the shown price', () => {
    // EN storefront charges USD; declaring TRY here would be a Google Merchant mismatch.
    expect(obj.offers['@type']).toBe('Offer');
    expect(obj.offers.priceCurrency).toBe('USD');
    expect(Number(obj.offers.price)).toBeGreaterThan(0);
    expect(Number(obj.offers.price)).toBeLessThan(p.price);
    expect(obj.offers.url).toBe('https://aseloves.com/en/product/bunny-9');
  });
  it('omits image when the product has no image', () => {
    const noImg = { ...p, image: null, images: [] };
    const obj2 = JSON.parse(productJsonLd(noImg, 'en', 'https://x/y'));
    expect('image' in obj2).toBe(false);
  });
  it('escapes < to prevent script-tag breakout', () => {
    const evil = { ...p, description_en: 'safe </script> text' };
    expect(productJsonLd(evil, 'en', 'https://x/y')).not.toContain('</script>');
  });
});
