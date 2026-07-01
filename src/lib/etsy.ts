import type { Product } from './products';

export interface EtsyImage { url_570xN?: string; url_fullxfull?: string; }
export interface EtsyTranslation { language: string; title?: string; description?: string; }
export interface EtsyListing {
  listing_id: number | string;
  title?: string;
  description?: string;
  price?: { amount?: number; divisor?: number; currency_code?: string };
  url?: string;
  tags?: string[];
  state?: string;
  creation_timestamp?: number;
  images?: EtsyImage[];
  translations?: EtsyTranslation[];
}

const CATEGORY_MAP: Record<string, string> = {
  amigurumi: 'amigurumi', toy: 'amigurumi', plush: 'amigurumi', doll: 'amigurumi',
  stuffed: 'amigurumi', bunny: 'amigurumi', bear: 'amigurumi', giraffe: 'amigurumi',
  duck: 'amigurumi', flamingo: 'amigurumi',
  bag: 'bag', tote: 'bag', purse: 'bag',
  tieback: 'decor', curtain: 'decor', nursery: 'decor',
  clip: 'accessory', hair: 'accessory', brooch: 'accessory', accessory: 'accessory',
};

export function detectCategory(listing: EtsyListing): string {
  const text = `${listing.title ?? ''} ${listing.description ?? ''} ${(listing.tags ?? []).join(' ')}`.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) return cat;
  }
  return 'amigurumi';
}

export function isNewListing(listing: EtsyListing, now: number = Date.now()): boolean {
  if (!listing.creation_timestamp) return false;
  const createdMs = listing.creation_timestamp * 1000;
  return createdMs > now - 30 * 24 * 60 * 60 * 1000;
}

export function mapListing(listing: EtsyListing, now: number = Date.now()): Product {
  const image = listing.images && listing.images.length > 0
    ? (listing.images[0].url_570xN ?? listing.images[0].url_fullxfull ?? null)
    : null;
  const tr = listing.translations?.find((t) => t.language === 'tr') ?? null;
  const title_en = listing.title ?? '';
  const title_tr = tr?.title ?? title_en;
  const desc_en = (listing.description ?? '').split('\n')[0].substring(0, 200);
  const desc_tr = tr ? (tr.description ?? '').split('\n')[0].substring(0, 200) : desc_en;
  return {
    id: String(listing.listing_id),
    title_en,
    title_tr,
    description_en: desc_en,
    description_tr: desc_tr,
    price: parseFloat(String(listing.price?.amount ?? 0)) / (listing.price?.divisor ?? 100),
    currency: listing.price?.currency_code ?? 'TRY',
    image,
    url: listing.url ?? `https://www.etsy.com/listing/${listing.listing_id}/`,
    category: detectCategory(listing),
    tags: listing.tags ?? [],
    isNew: isNewListing(listing, now),
    isActive: listing.state === 'active',
  };
}
