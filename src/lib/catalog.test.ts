import { describe, it, expect } from 'vitest';
import { filterByCategory } from '@lib/catalog';
import type { Product } from '@lib/products';

const mk = (id: string, category: string): Product => ({
  id, title_en: id, title_tr: id, description_en: '', description_tr: '',
  price: 1, currency: 'TRY', image: null, url: '', category, tags: [], isNew: false, isActive: true,
});
const list = [mk('1', 'amigurumi'), mk('2', 'bag'), mk('3', 'amigurumi')];

describe('filterByCategory', () => {
  it('returns all when cat is null', () => expect(filterByCategory(list, null)).toHaveLength(3));
  it('returns all when cat is "all"', () => expect(filterByCategory(list, 'all')).toHaveLength(3));
  it('filters by category', () => {
    const r = filterByCategory(list, 'amigurumi');
    expect(r.map((p) => p.id)).toEqual(['1', '3']);
  });
});
