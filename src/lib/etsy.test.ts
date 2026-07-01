import { describe, it, expect } from 'vitest';
import { mapListing, detectCategory, type EtsyListing } from '@lib/etsy';

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
    expect(p.description_en).toBe('Removable dress rabbit.');
    expect(p.description_tr).toBe('Çıkarılabilir elbise.');
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
});
