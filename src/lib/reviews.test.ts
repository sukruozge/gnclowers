import { describe, it, expect } from 'vitest';
import { pickReviews, formatRating, type Review } from '@lib/reviews';

const mk = (rating: number, text: string, language: string, date: string): Review => ({ rating, text, language, date });
const all: Review[] = [
  mk(5, 'Harika, çok beğendim', 'tr', '2026-05-01'),
  mk(5, 'Absolutely lovely', 'en', '2026-06-01'),
  mk(4, 'Good but small', 'en', '2026-06-10'),
  mk(5, '', 'en', '2026-06-20'),
  mk(5, 'Beautiful craftsmanship', 'en', '2026-04-01'),
];

describe('pickReviews', () => {
  it('keeps only 5-star reviews that have text', () => {
    const r = pickReviews(all, 'en', 10);
    expect(r.every((x) => x.rating === 5 && x.text.trim().length > 0)).toBe(true);
    expect(r).toHaveLength(3);
  });
  it('orders locale-matching reviews first, then newest', () => {
    const r = pickReviews(all, 'tr', 10);
    expect(r[0].language).toBe('tr');
  });
  it('for en, newest English first', () => {
    const r = pickReviews(all, 'en', 10);
    expect(r[0].text).toBe('Absolutely lovely'); // 2026-06-01 newest with text among en
  });
  it('respects the count limit', () => {
    expect(pickReviews(all, 'en', 2)).toHaveLength(2);
  });
});

describe('formatRating', () => {
  it('formats a number to one decimal', () => expect(formatRating(4.87)).toBe('4.9'));
  it('returns empty string for null', () => expect(formatRating(null)).toBe(''));
});
