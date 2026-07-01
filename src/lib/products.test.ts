import { describe, it, expect } from 'vitest';
import { loadProducts, localizedTitle, productSlug, activeOnly } from '@lib/products';

describe('products', () => {
  const all = loadProducts();

  it('loads at least one active product', () => {
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((p) => p.isActive)).toBe(true);
  });
  it('activeOnly excludes inactive products', () => {
    const mock = [
      { ...all[0], id: 'x-active', isActive: true },
      { ...all[0], id: 'x-inactive', isActive: false },
    ];
    const result = activeOnly(mock);
    expect(result.map((p) => p.id)).toEqual(['x-active']);
  });
  it('localizes title by locale', () => {
    const p = all[0];
    expect(localizedTitle(p, 'tr')).toBe(p.title_tr);
    expect(localizedTitle(p, 'en')).toBe(p.title_en);
  });
  it('produces a slug ending in the product id', () => {
    const p = all[0];
    expect(productSlug(p, 'en').endsWith(p.id)).toBe(true);
  });
});
