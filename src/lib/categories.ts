import settings from '../data/settings.json';
import type { Locale } from './i18n';

// Fallback bilingual labels for the category keys stored on each product.
// The editable source of truth is settings.categoryNames (admin-managed);
// this map only fills gaps for categories that were never customized.
export const CATEGORY_LABELS: Record<string, Record<Locale, string>> = {
  'Crochet Bags': { tr: 'Örgü Çantalar', en: 'Crochet Bags' },
  'Safari Animals': { tr: 'Safari Hayvanları', en: 'Safari Animals' },
  'Curtain Tiebacks': { tr: 'Perde Tutacakları', en: 'Curtain Tiebacks' },
  'Amigurumi Toys': { tr: 'Amigurumi Oyuncaklar', en: 'Amigurumi Toys' },
  'Baby Gift Sets': { tr: 'Bebek Hediye Setleri', en: 'Baby Gift Sets' },
  'Stuffed Animals': { tr: 'Peluş Oyuncaklar', en: 'Stuffed Animals' },
  'Crochet Dolls': { tr: 'Örgü Bebekler', en: 'Crochet Dolls' },
  'Bunny Rabbits Toys': { tr: 'Örgü Tavşanlar', en: 'Bunny Rabbits Toys' },
  'Baby Shower': { tr: 'Bebek Partisi', en: 'Baby Shower' },
  'Crochet Hair Clips': { tr: 'Örgü Saç Tokaları', en: 'Crochet Hair Clips' },
  'Wedding Dolls': { tr: 'Düğün Bebekleri', en: 'Wedding Dolls' }
};

type CategoryNames = Record<string, Partial<Record<Locale, string>>>;

/**
 * Localized display name for a category key.
 * Priority: admin-edited settings.categoryNames → hardcoded fallback → raw key.
 */
export function categoryLabel(category: string, locale: Locale): string {
  const custom = (settings as { categoryNames?: CategoryNames }).categoryNames?.[category];
  const edited = custom?.[locale];
  if (typeof edited === 'string' && edited.trim()) return edited.trim();
  return CATEGORY_LABELS[category]?.[locale] ?? category;
}
