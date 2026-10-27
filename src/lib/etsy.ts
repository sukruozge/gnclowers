import type { Product, ProductOptionGroup, ProductVariant } from './products';

export interface EtsyImage { url_570xN?: string; url_fullxfull?: string; }
export interface EtsyTranslation { language: string; title?: string; description?: string; }
export interface EtsyPropertyValue { property_id?: number; property_name?: string; values?: string[]; }
export interface EtsyOffering { price?: { amount?: number; divisor?: number }; quantity?: number; is_enabled?: boolean; }
export interface EtsyInventoryProduct { property_values?: EtsyPropertyValue[]; offerings?: EtsyOffering[]; }
export interface EtsyInventory { products?: EtsyInventoryProduct[]; price_on_property?: number[]; }
export interface EtsyListing {
  listing_id: number | string;
  title?: string;
  description?: string;
  price?: { amount?: number; divisor?: number; currency_code?: string };
  url?: string;
  tags?: string[];
  state?: string;
  creation_timestamp?: number;
  shop_section_id?: number | null;
  images?: EtsyImage[];
  translations?: EtsyTranslation[];
  inventory?: EtsyInventory;
}

// Turn Etsy's inventory payload into our option groups + priced variants.
// Only real variations (an actual property with values) produce output; a plain
// listing returns a single product with no property_values and is ignored.
export function mapInventory(inv: EtsyInventory | undefined): { options: ProductOptionGroup[]; variants: ProductVariant[] } {
  const products = inv?.products ?? [];
  const groups = new Map<string, string[]>();
  const variants: ProductVariant[] = [];
  for (const p of products) {
    const values: Record<string, string> = {};
    for (const pv of p.property_values ?? []) {
      const name = (pv.property_name ?? '').trim();
      const val = (pv.values ?? [])[0];
      if (name && val) {
        values[name] = val;
        const list = groups.get(name) ?? [];
        if (!list.includes(val)) list.push(val);
        groups.set(name, list);
      }
    }
    if (!Object.keys(values).length) continue;
    const off = (p.offerings ?? []).find((o) => o.is_enabled) ?? (p.offerings ?? [])[0];
    const price = off?.price ? Number(off.price.amount ?? 0) / (off.price.divisor ?? 100) : NaN;
    variants.push({ values, price: Number.isFinite(price) ? price : 0 });
  }
  const options: ProductOptionGroup[] = [...groups.entries()].map(([name, values]) => ({ name, values }));
  return { options, variants };
}

/**
 * Keyword fallback for listings that have no Etsy shop section. Every value is a REAL Etsy
 * section title so the site's categories always equal the shop's sections (no private keys
 * like "amigurumi"/"bag" leaking into the catalogue). Order matters: first match wins, so the
 * more specific seasonal/product-type keywords come before the generic ones.
 */
const DEFAULT_CATEGORY = 'Amigurumi Toys';
const CATEGORY_MAP: Record<string, string> = {
  advent: 'Christmas Crochet', christmas: 'Christmas Crochet', santa: 'Christmas Crochet', noel: 'Christmas Crochet',
  halloween: 'Halloween Crochet', pumpkin: 'Halloween Crochet', witch: 'Halloween Crochet', ghost: 'Halloween Crochet',
  tieback: 'Curtain Tiebacks', curtain: 'Curtain Tiebacks',
  mobile: 'Baby Mobile',
  keychain: 'Crochet Keychains', 'bag charm': 'Crochet Keychains',
  'gift set': 'Baby Gift Sets', 'gift box': 'Baby Gift Sets',
  'hair clip': 'Crochet Hair Clips', barrette: 'Crochet Hair Clips',
  bag: 'Crochet Bags', tote: 'Crochet Bags', purse: 'Crochet Bags',
  lovey: 'Crochet Loveys', 'security blanket': 'Crochet Loveys',
  bunny: 'Bunny Rabbits Toys', rabbit: 'Bunny Rabbits Toys',
  wedding: 'Wedding Dolls', bride: 'Wedding Dolls',
  safari: 'Safari Animals', giraffe: 'Safari Animals', lion: 'Safari Animals', elephant: 'Safari Animals', zebra: 'Safari Animals',
  doll: 'Crochet Dolls',
  stuffed: 'Stuffed Animals', plush: 'Stuffed Animals', 'sleep buddy': 'Stuffed Animals', 'uyku arkadaşı': 'Stuffed Animals',
};

export function detectCategory(listing: EtsyListing): string {
  const text = `${listing.title ?? ''} ${listing.description ?? ''} ${(listing.tags ?? []).join(' ')}`.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) return cat;
  }
  return DEFAULT_CATEGORY;
}

export function isNewListing(listing: EtsyListing, now: number = Date.now()): boolean {
  if (!listing.creation_timestamp) return false;
  const createdMs = listing.creation_timestamp * 1000;
  return createdMs > now - 30 * 24 * 60 * 60 * 1000;
}

// `sections` maps a shop_section_id (as string) to the seller-defined section
// title from Etsy's getShopSections. When a listing has a matching section we
// use its title as the category; otherwise we fall back to keyword detection.
export function mapListing(
  listing: EtsyListing,
  now: number = Date.now(),
  sections: Record<string, string> = {},
): Product {
  const imageUrls = (listing.images ?? [])
    .map((im) => im.url_570xN ?? im.url_fullxfull)
    .filter((u): u is string => Boolean(u));
  const image = imageUrls[0] ?? null;
  const tr = listing.translations?.find((t) => t.language === 'tr') ?? null;
  const title_en = listing.title ?? '';
  const title_tr = tr?.title ?? title_en;
  const desc_en = (listing.description ?? '').trim();
  const desc_tr = tr ? (tr.description ?? '').trim() : desc_en;
  const sectionTitle = listing.shop_section_id != null
    ? sections[String(listing.shop_section_id)]
    : undefined;
  const { options, variants } = mapInventory(listing.inventory);
  const hasVars = options.length > 0 && options.some((o) => o.values.length > 1);
  return {
    id: String(listing.listing_id),
    title_en,
    title_tr,
    description_en: desc_en,
    description_tr: desc_tr,
    price: parseFloat(String(listing.price?.amount ?? 0)) / (listing.price?.divisor ?? 100),
    currency: listing.price?.currency_code ?? 'TRY',
    image,
    images: imageUrls,
    url: listing.url ?? `https://www.etsy.com/listing/${listing.listing_id}/`,
    category: sectionTitle ?? detectCategory(listing),
    tags: listing.tags ?? [],
    isNew: isNewListing(listing, now),
    isActive: listing.state === 'active',
    ...(hasVars ? { options, variants } : {}),
  };
}
