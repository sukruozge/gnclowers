import { describe, it, expect } from 'vitest';
import { variantKey, resolveVariantPrice } from './variants';
import { mapInventory } from './etsy';

describe('variantKey', () => {
  it('is order-independent', () => {
    expect(variantKey({ Color: 'Red', Model: 'Lion' })).toBe(variantKey({ Model: 'Lion', Color: 'Red' }));
  });
});

describe('resolveVariantPrice', () => {
  const p = {
    price: 10,
    variants: [
      { values: { Model: 'Lion' }, price: 25 },
      { values: { Model: 'Giraffe' }, price: 30 },
    ],
  };
  it('returns the matching variant price', () => {
    expect(resolveVariantPrice(p, { Model: 'Lion' })).toBe(25);
    expect(resolveVariantPrice(p, { Model: 'Giraffe' })).toBe(30);
  });
  it('falls back to base price for unknown/empty selection', () => {
    expect(resolveVariantPrice(p, { Model: 'Unicorn' })).toBe(10);
    expect(resolveVariantPrice(p, undefined)).toBe(10);
    expect(resolveVariantPrice({ price: 5 }, { Model: 'Lion' })).toBe(5);
  });
});

describe('mapInventory', () => {
  it('extracts option groups and priced variants', () => {
    const inv = {
      products: [
        { property_values: [{ property_name: 'Model', values: ['Lion'] }], offerings: [{ price: { amount: 2500, divisor: 100 }, is_enabled: true }] },
        { property_values: [{ property_name: 'Model', values: ['Giraffe'] }], offerings: [{ price: { amount: 3000, divisor: 100 }, is_enabled: true }] },
      ],
    };
    const { options, variants } = mapInventory(inv);
    expect(options).toEqual([{ name: 'Model', values: ['Lion', 'Giraffe'] }]);
    expect(variants).toEqual([
      { values: { Model: 'Lion' }, price: 25 },
      { values: { Model: 'Giraffe' }, price: 30 },
    ]);
  });
  it('ignores a plain listing with no property values', () => {
    const { options, variants } = mapInventory({ products: [{ property_values: [], offerings: [{ price: { amount: 1000, divisor: 100 } }] }] });
    expect(options).toEqual([]);
    expect(variants).toEqual([]);
  });
});
