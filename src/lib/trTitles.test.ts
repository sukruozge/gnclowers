import { describe, it, expect } from 'vitest';
import { loadProducts, type Product } from '@lib/products';
import { categoryLabel } from '@lib/categories';
import { foldSearch } from '@lib/search';

/**
 * Guard rail for Turkish product naming.
 *
 * Every new Etsy listing arrives through the nightly sync with a machine
 * translation ("Tığ İşi ..." comma salad, leftover English words). Those titles
 * read as translated, not as something a Turkish shopper would ever type into
 * a search box. This suite fails the build when such a title lands, so the next
 * bad sync is caught in CI instead of on the storefront.
 *
 * Rules come from the approved title grammar in
 * docs/seo/tr-baslik-taslagi-2026-07-20.md (built on Google Trends TR data).
 */

const products = loadProducts();
const label = (p: Product) => `${p.id} "${p.title_tr}"`;

// Matching is done on the folded form: JS lowercases "İ" to an i plus a
// combining dot, so a naive /tığ işi/i never matches the real title.
const forbidden = (title: string) => foldSearch(title).includes('tig isi');

/** Foreign words a Turkish shopper would not search for. */
const FOREIGN_WORDS = [
  'baby shower', 'lovey', 'loveys', 'plush', 'crochet', 'handmade', 'nursery',
  'jack-o', 'jack o lantern', 'bumblebee', 'cottagecore', 'keepsake', 'stuffed',
  'newborn', 'toy', 'gift', 'doll', 'bunny', 'teddy', 'inch',
];

/** Buyers search "amigurumi" or "örgü"; a title without either is invisible. */
const REQUIRED_KEYWORD = /amigurumi|örgü/i;

const MAX_LENGTH = 60;

describe('Turkish product titles', () => {
  it('has products to check', () => {
    expect(products.length).toBeGreaterThan(0);
  });

  it('never uses "tığ işi" (hobby intent, not buyer intent)', () => {
    const bad = products.filter((p) => forbidden(p.title_tr)).map(label);
    expect(bad).toEqual([]);
  });

  it('contains no foreign words', () => {
    const bad = products
      .map((p) => {
        const t = p.title_tr.toLowerCase();
        const hits = FOREIGN_WORDS.filter((w) => t.includes(w));
        return hits.length ? `${label(p)} → ${hits.join(', ')}` : null;
      })
      .filter(Boolean);
    expect(bad).toEqual([]);
  });

  it(`is at most ${MAX_LENGTH} characters`, () => {
    const bad = products
      .filter((p) => p.title_tr.length > MAX_LENGTH)
      .map((p) => `${label(p)} (${p.title_tr.length})`);
    expect(bad).toEqual([]);
  });

  it('leads with a keyword buyers actually search', () => {
    const bad = products.filter((p) => !REQUIRED_KEYWORD.test(p.title_tr)).map(label);
    expect(bad).toEqual([]);
  });

  it('is unique across the catalogue', () => {
    const seen = new Map<string, string[]>();
    for (const p of products) {
      const key = p.title_tr.trim().toLowerCase();
      seen.set(key, [...(seen.get(key) ?? []), p.id]);
    }
    const dupes = [...seen.entries()].filter(([, ids]) => ids.length > 1).map(([t, ids]) => `${ids.join(',')} → ${t}`);
    expect(dupes).toEqual([]);
  });

  it('is never just the English title copied over', () => {
    const bad = products.filter((p) => p.title_tr.trim() === p.title_en.trim()).map(label);
    expect(bad).toEqual([]);
  });

  it('uses an en dash, never a pipe (pipes are not a Turkish e-commerce convention)', () => {
    const bad = products.filter((p) => p.title_tr.includes('|')).map(label);
    expect(bad).toEqual([]);
  });
});

describe('category names', () => {
  it('has a Turkish label for every category in use', () => {
    const cats = [...new Set(products.map((p) => p.category))];
    // Falling back to the raw key means no Turkish name was ever set, so the
    // English key leaks into the catalogue filter and the search page chips.
    const missing = cats.filter((c) => categoryLabel(c, 'tr') === c);
    expect(missing).toEqual([]);
  });
});
