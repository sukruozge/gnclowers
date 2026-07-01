import { describe, it, expect } from 'vitest';
import { mapListing, detectCategory, isNewListing, type EtsyListing } from '@lib/etsy';

const base: EtsyListing = {
  listing_id: 4511067258,
  title: 'Personalized Crochet Bunny Plush Doll',
  description: 'Removable dress rabbit.\nSecond line.',
  price: { amount: 191250, divisor: 100, currency_code: 'TRY' },
  url: 'https://www.etsy.com/listing/4511067258/',
  tags: ['bunny', 'amigurumi'],
  state: 'active',
  creation_timestamp: 1000,
  images: [{ url_570xN: 'https://img/570.jpg', url_fullxfull: 'https://img/full.jpg' }],
  translations: [{ language: 'tr', title: 'Örgü Tavşan Bebek', description: 'Çıkarılabilir elbise.\nİkinci.' }],
};

describe('detectCategory', () => {
  it('maps a bunny/plush listing to amigurumi', () => expect(detectCategory(base)).toBe('amigurumi'));
  it('maps a tote bag to bag', () =>
    expect(detectCategory({ ...base, title: 'Handmade tote bag', tags: [], description: '' })).toBe('bag'));
  it('defaults to amigurumi when nothing matches', () =>
    expect(detectCategory({ ...base, title: 'zzz', tags: [], description: '' })).toBe('amigurumi'));
});

describe('mapListing', () => {
  const p = mapListing(base, Date.UTC(2020, 0, 1));
  it('produces the Product shape with a string id', () => {
    expect(p.id).toBe('4511067258');
    expect(typeof p.id).toBe('string');
  });
  it('uses the Turkish translation for tr fields, English for en', () => {
    expect(p.title_tr).toBe('Örgü Tavşan Bebek');
    expect(p.title_en).toBe('Personalized Crochet Bunny Plush Doll');
    expect(p.description_en).toBe('Removable dress rabbit.\nSecond line.');
    expect(p.description_tr).toBe('Çıkarılabilir elbise.\nİkinci.');
  });
  it('keeps the full (multi-line) description, not just the first line', () => {
    const q = mapListing({ ...base, description: 'Line one.\nLine two.\nLine three.', translations: [] });
    expect(q.description_en).toBe('Line one.\nLine two.\nLine three.');
  });
  it('uses the Etsy shop section title as the category when available', () => {
    const q = mapListing({ ...base, shop_section_id: 54321 }, Date.UTC(2020, 0, 1), { '54321': 'Bags' });
    expect(q.category).toBe('Bags');
  });
  it('falls back to keyword detection when the section id is unknown or missing', () => {
    const unknown = mapListing({ ...base, shop_section_id: 999 }, Date.UTC(2020, 0, 1), { '54321': 'Bags' });
    expect(unknown.category).toBe('amigurumi');
    const none = mapListing(base, Date.UTC(2020, 0, 1));
    expect(none.category).toBe('amigurumi');
  });
  it('computes price from amount/divisor and reads currency', () => {
    expect(p.price).toBe(1912.5);
    expect(p.currency).toBe('TRY');
  });
  it('prefers url_570xN for the image and marks active', () => {
    expect(p.image).toBe('https://img/570.jpg');
    expect(p.isActive).toBe(true);
  });
  it('falls back to English when there is no tr translation', () => {
    const q = mapListing({ ...base, translations: [] }, Date.UTC(2020, 0, 1));
    expect(q.title_tr).toBe(q.title_en);
    expect(q.description_tr).toBe(q.description_en);
  });
  it('marks isActive false for non-active state', () => {
    expect(mapListing({ ...base, state: 'inactive' }).isActive).toBe(false);
  });
  it('falls back to url_fullxfull when url_570xN is absent', () => {
    const q = mapListing({ ...base, images: [{ url_fullxfull: 'https://img/full.jpg' }] });
    expect(q.image).toBe('https://img/full.jpg');
  });
  it('sets image to null when there are no images', () => {
    const q = mapListing({ ...base, images: [] });
    expect(q.image).toBe(null);
  });
  it('collects every image url into the images array (first stays as image)', () => {
    const q = mapListing({ ...base, images: [
      { url_570xN: 'https://img/a.jpg' },
      { url_570xN: 'https://img/b.jpg' },
      { url_fullxfull: 'https://img/c.jpg' },
    ] });
    expect(q.images).toEqual(['https://img/a.jpg', 'https://img/b.jpg', 'https://img/c.jpg']);
    expect(q.image).toBe('https://img/a.jpg');
  });
  it('sets images to [] when there are no images', () => {
    expect(mapListing({ ...base, images: [] }).images).toEqual([]);
  });
});

describe('isNewListing', () => {
  const now = Date.UTC(2024, 5, 1);
  const daysAgo = (d: number) => ({ ...base, creation_timestamp: Math.floor((now - d * 86400000) / 1000) });
  it('is new when created 29 days ago', () => expect(isNewListing(daysAgo(29), now)).toBe(true));
  it('is not new when created 31 days ago', () => expect(isNewListing(daysAgo(31), now)).toBe(false));
  it('is not new when creation_timestamp is missing', () =>
    expect(isNewListing({ ...base, creation_timestamp: undefined }, now)).toBe(false));
});
