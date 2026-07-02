import raw from '../data/reviews.json';
import type { Locale } from './i18n';

export interface Review { rating: number; text: string; language: string; date: string; }
export interface ShopRating { rating: number | null; count: number; }
export interface ReviewsData { shop: ShopRating; reviews: Review[]; }

export function loadReviews(): ReviewsData {
  const d = raw as ReviewsData;
  return { shop: d.shop ?? { rating: null, count: 0 }, reviews: d.reviews ?? [] };
}

export function formatRating(avg: number | null): string {
  return avg == null ? '' : avg.toFixed(1);
}

export function pickReviews(all: Review[], locale: Locale, count: number): Review[] {
  const withText = all.filter((r) => r.rating >= 5 && r.text.trim().length > 0);
  const sorted = [...withText].sort((a, b) => {
    const la = a.language === locale ? 0 : 1;
    const lb = b.language === locale ? 0 : 1;
    if (la !== lb) return la - lb;
    return b.date.localeCompare(a.date);
  });
  return sorted.slice(0, count);
}
