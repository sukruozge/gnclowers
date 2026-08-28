import { describe, it, expect } from 'vitest';
import { foldSearch, buildHaystack, scoreHaystack, searchProducts } from '@lib/search';
import type { Product } from '@lib/products';

const mk = (over: Partial<Product> & { id: string }): Product => ({
  title_en: '', title_tr: '', description_en: '', description_tr: '',
  price: 100, currency: 'TRY', image: null, images: [], url: '',
  category: 'Amigurumi Toys', tags: [], isNew: false, isActive: true,
  ...over,
});

describe('foldSearch', () => {
  it('lowercases and strips Turkish diacritics', () => {
    expect(foldSearch('Örgü Tavşan')).toBe('orgu tavsan');
  });

  // The whole point of a Turkish-aware fold: dotted/dotless I must collapse
  // together, so "ISIK", "ışık" and "isik" are one and the same query.
  it('collapses dotted and dotless I to a single letter', () => {
    expect(foldSearch('IŞIK')).toBe(foldSearch('ışık'));
    expect(foldSearch('İnek')).toBe('inek');
  });

  it('collapses runs of whitespace and trims', () => {
    expect(foldSearch('  örgü   \n bebek ')).toBe('orgu bebek');
  });

  it('returns empty string for nullish input', () => {
    expect(foldSearch(undefined)).toBe('');
    expect(foldSearch(null)).toBe('');
  });
});

describe('buildHaystack', () => {
  it('includes both locales titles, category label and tags', () => {
    const h = buildHaystack(mk({
      id: '1', title_tr: 'Örgü Tavşan', title_en: 'Crochet Bunny',
      category: 'Bunny Rabbits Toys', tags: ['bebek hediyesi', 'amigurumi'],
    }));
    expect(h).toContain('orgu tavsan');
    expect(h).toContain('crochet bunny');
    expect(h).toContain('tavsanlar');        // TR category label
    expect(h).toContain('bunny rabbits');    // EN category label
    expect(h).toContain('bebek hediyesi');
  });

  it('includes the product id so an Etsy listing number finds it', () => {
    expect(buildHaystack(mk({ id: '4503015434', title_tr: 'Bebek' }))).toContain('4503015434');
  });

  it('does not include descriptions (they drown the signal)', () => {
    const h = buildHaystack(mk({ id: '1', title_tr: 'Fil', description_tr: 'zurafa' }));
    expect(h).not.toContain('zurafa');
  });
});

describe('scoreHaystack', () => {
  const bunny = buildHaystack(mk({ id: '1', title_tr: 'Örgü Tavşan', title_en: 'Crochet Bunny' }));

  it('returns 0 when a query term is missing', () => {
    expect(scoreHaystack(bunny, ['zurafa'])).toBe(0);
  });

  it('returns a positive score when every term matches', () => {
    expect(scoreHaystack(bunny, ['orgu', 'tavsan'])).toBeGreaterThan(0);
  });

  it('requires ALL terms to match, not just one', () => {
    expect(scoreHaystack(bunny, ['orgu', 'zurafa'])).toBe(0);
  });

  it('scores a title-start match higher than a mid-title match', () => {
    const startsWith = buildHaystack(mk({ id: '1', title_tr: 'Tavşan Oyuncak' }));
    const midTitle = buildHaystack(mk({ id: '2', title_tr: 'Örgü Sevimli Tavşan' }));
    expect(scoreHaystack(startsWith, ['tavsan'])).toBeGreaterThan(scoreHaystack(midTitle, ['tavsan']));
  });

  it('scores a whole-word match higher than a match inside a longer word', () => {
    const word = buildHaystack(mk({ id: '1', title_tr: 'Örgü Fil Oyuncak' }));
    const inside = buildHaystack(mk({ id: '2', title_tr: 'Örgü Filiz Bebek' }));
    expect(scoreHaystack(word, ['fil'])).toBeGreaterThan(scoreHaystack(inside, ['fil']));
  });

  it('returns 0 for an empty term list', () => {
    expect(scoreHaystack(bunny, [])).toBe(0);
  });
});

describe('searchProducts', () => {
  const products = [
    mk({ id: '1', title_tr: 'Örgü Tavşan Oyuncak', title_en: 'Crochet Bunny Toy', category: 'Bunny Rabbits Toys' }),
    mk({ id: '2', title_tr: 'Amigurumi Fil Oyuncak', title_en: 'Amigurumi Elephant Toy', tags: ['safari'] }),
    mk({ id: '3', title_tr: 'Örgü Zürafa', title_en: 'Crochet Giraffe', category: 'Safari Animals' }),
  ];

  it('returns an empty list for a blank query', () => {
    expect(searchProducts(products, '')).toEqual([]);
    expect(searchProducts(products, '   ')).toEqual([]);
  });

  it('finds a product by its Turkish title regardless of diacritics', () => {
    expect(searchProducts(products, 'zurafa').map((p) => p.id)).toEqual(['3']);
    expect(searchProducts(products, 'ZÜRAFA').map((p) => p.id)).toEqual(['3']);
  });

  // A Turkish visitor typing an English word (or vice versa) must still land on
  // the product — both localized titles live in the haystack.
  it('finds a product by the other locale title', () => {
    expect(searchProducts(products, 'giraffe').map((p) => p.id)).toEqual(['3']);
  });

  it('finds products by category name', () => {
    expect(searchProducts(products, 'safari').map((p) => p.id).sort()).toEqual(['2', '3']);
  });

  it('matches all terms across different fields', () => {
    expect(searchProducts(products, 'orgu tavsan').map((p) => p.id)).toEqual(['1']);
  });

  it('returns nothing when no product matches', () => {
    expect(searchProducts(products, 'traktör')).toEqual([]);
  });

  it('orders better matches first', () => {
    const list = [
      mk({ id: 'mid', title_tr: 'Örgü Sevimli Tavşan' }),
      mk({ id: 'start', title_tr: 'Tavşan Oyuncak' }),
    ];
    expect(searchProducts(list, 'tavsan').map((p) => p.id)).toEqual(['start', 'mid']);
  });

  it('caps the result list at the given limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => mk({ id: String(i), title_tr: 'Örgü Tavşan' }));
    expect(searchProducts(many, 'tavsan', 10)).toHaveLength(10);
  });
});
