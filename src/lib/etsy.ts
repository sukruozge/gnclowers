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
