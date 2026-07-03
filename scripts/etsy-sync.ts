import { readFileSync, writeFileSync } from 'node:fs';
import { mapListing, type EtsyImage, type EtsyListing } from '../src/lib/etsy';
import type { Product } from '../src/lib/products';
import { cachedTranslation } from '../src/lib/translate';

const API_KEY = process.env.ETSY_API_KEY ?? '';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY ?? '';
const SHOP = process.env.ETSY_SHOP ?? 'aselovers';
const OUT = new URL('../src/data/products.json', import.meta.url);
const LIMIT = 100;

async function etsy(endpoint: string): Promise<any> {
  const res = await fetch(`https://openapi.etsy.com/v3/application/${endpoint}`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!res.ok) throw new Error(`Etsy API ${res.status}: ${await res.text()}`);
  return res.json();
}

interface ShopInfo { shopId: string; rating: number | null; count: number; }

async function getShop(): Promise<ShopInfo> {
  const d = await etsy(`shops?shop_name=${encodeURIComponent(SHOP)}`);
  if (!d.results?.length) throw new Error(`Etsy shop '${SHOP}' not found`);
  const s = d.results[0];
  return {
    shopId: String(s.shop_id),
    rating: typeof s.review_average === 'number' ? s.review_average : null,
    count: typeof s.review_count === 'number' ? s.review_count : 0,
  };
}

const REVIEWS_OUT = new URL('../src/data/reviews.json', import.meta.url);

interface SyncReview { rating: number; text: string; language: string; date: string; }

async function getReviews(shopId: string): Promise<SyncReview[]> {
  const d = await etsy(`shops/${shopId}/reviews?limit=100`);
  return (d.results ?? []).map((r: any) => ({
    rating: Number(r.rating ?? 0),
    text: String(r.review ?? '').trim(),
    language: String(r.language ?? 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en',
    date: r.created_timestamp ? new Date(r.created_timestamp * 1000).toISOString().slice(0, 10) : '',
  }));
}

async function writeReviews(shop: ShopInfo): Promise<void> {
  let reviews: SyncReview[] = [];
  try {
    reviews = await getReviews(shop.shopId);
  } catch (err) {
    console.warn('Could not fetch reviews (rating badge only):', err instanceof Error ? err.message : err);
  }
  const out = { shop: { rating: shop.rating, count: shop.count }, reviews };
  writeFileSync(REVIEWS_OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Reviews: rating ${shop.rating ?? 'n/a'} (${shop.count}), ${reviews.length} reviews written.`);
}

// Map shop_section_id -> section title (the seller's real categories).
async function getSections(shopId: string): Promise<Record<string, string>> {
  const d = await etsy(`shops/${shopId}/sections`);
  const map: Record<string, string> = {};
  for (const s of d.results ?? []) {
    if (s?.shop_section_id != null && s?.title) map[String(s.shop_section_id)] = String(s.title);
  }
  return map;
}

// getListingsByShop does not reliably attach images under app-key auth even
// with includes=Images, so fetch each listing's images from the dedicated
// endpoint (public, works with the API key). Best-effort per listing.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getListingImages(listingId: number | string): Promise<EtsyImage[]> {
  // Retry once with a backoff to survive a transient rate-limit (429).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const d = await etsy(`listings/${listingId}/images`);
      return (d.results ?? []).map((img: any) => ({
        url_570xN: img.url_570xN,
        url_fullxfull: img.url_fullxfull,
      }));
    } catch {
      if (attempt === 0) await sleep(1500);
    }
  }
  return [];
}

async function attachImages(listings: EtsyListing[]): Promise<void> {
  // Sequential + 250ms spacing keeps us under Etsy's 5 QPS rate limit.
  for (const l of listings) {
    l.images = await getListingImages(l.listing_id);
    await sleep(250);
  }
}

async function getListings(shopId: string): Promise<EtsyListing[]> {
  const all: EtsyListing[] = [];
  let offset = 0;
  for (;;) {
    // Etsy v3 array params are comma-separated (not includes[]=...).
    const d = await etsy(
      `shops/${shopId}/listings/active?limit=${LIMIT}&offset=${offset}&includes=Images,Translations`,
    );
    const results: EtsyListing[] = d.results ?? [];
    all.push(...results);
    if (results.length < LIMIT) break;
    offset += LIMIT;
  }
  return all;
}

function loadPrevious(): Map<string, Product> {
  const map = new Map<string, Product>();
  try {
    const raw = JSON.parse(readFileSync(OUT, 'utf8'));
    for (const p of raw.products ?? []) map.set(String(p.id), p);
  } catch {
    // no previous products.json — first run
  }
  return map;
}

// DeepL free keys end in ':fx' and use the api-free host; Pro keys use api.
async function deeplTranslate(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  const host = DEEPL_API_KEY.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const body = new URLSearchParams();
  body.set('target_lang', 'TR');
  body.set('source_lang', 'EN');
  for (const t of texts) body.append('text', t);
  const res = await fetch(`https://${host}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.translations ?? []).map((t: any) => String(t.text));
}

// Fill Turkish fields: reuse Etsy/previous translations where possible, and
// only call DeepL for products whose English source is new or changed.
async function applyTranslations(products: Product[], prev: Map<string, Product>): Promise<void> {
  const needing: Product[] = [];
  for (const p of products) {
    const cached = cachedTranslation(p, prev.get(p.id));
    if (cached) {
      p.title_tr = cached.title_tr;
      p.description_tr = cached.description_tr;
    } else {
      needing.push(p);
    }
  }
  if (needing.length === 0) {
    console.log('Translations: all reused from cache (no DeepL calls).');
    return;
  }
  if (!DEEPL_API_KEY) {
    console.warn(`Translations: ${needing.length} products need Turkish but DEEPL_API_KEY is not set — leaving English.`);
    return;
  }
  console.log(`Translating ${needing.length} products to Turkish via DeepL...`);
  const CHUNK = 25; // 25 products * 2 texts = 50 texts/request (DeepL max)
  for (let i = 0; i < needing.length; i += CHUNK) {
    const chunk = needing.slice(i, i + CHUNK);
    const texts: string[] = [];
    for (const p of chunk) {
      texts.push(p.title_en);
      texts.push(p.description_en);
    }
    try {
      const out = await deeplTranslate(texts);
      chunk.forEach((p, idx) => {
        if (out[idx * 2]) p.title_tr = out[idx * 2];
        if (out[idx * 2 + 1]) p.description_tr = out[idx * 2 + 1];
      });
    } catch (err) {
      console.warn('DeepL chunk failed (leaving English for it):', err instanceof Error ? err.message : err);
    }
    await sleep(300);
  }
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('ETSY_API_KEY is not set — aborting.');
    process.exit(1);
  }
  const shop = await getShop();
  const shopId = shop.shopId;
  // Sections are best-effort: a failure here must not wipe the whole sync;
  // we fall back to keyword categories.
  let sections: Record<string, string> = {};
  try {
    sections = await getSections(shopId);
  } catch (err) {
    console.warn('Could not fetch shop sections (falling back to keyword categories):', err instanceof Error ? err.message : err);
  }
  const listings = await getListings(shopId);
  await attachImages(listings);
  const prev = loadPrevious();
  const matchedIds = new Set<string>();

  const syncedProducts = listings.map((l) => {
    const mapped = mapListing(l, Date.now(), sections);
    matchedIds.add(mapped.id);
    const existing = prev.get(mapped.id);
    if (existing) {
      // Preserve local manual changes!
      return {
        ...mapped,
        title_tr: existing.title_tr !== undefined ? existing.title_tr : mapped.title_tr,
        title_en: existing.title_en !== undefined ? existing.title_en : mapped.title_en,
        description_tr: existing.description_tr !== undefined ? existing.description_tr : mapped.description_tr,
        description_en: existing.description_en !== undefined ? existing.description_en : mapped.description_en,
        price: existing.price !== undefined ? existing.price : mapped.price,
        currency: existing.currency !== undefined ? existing.currency : mapped.currency,
        image: existing.image !== undefined ? existing.image : mapped.image,
        category: existing.category !== undefined ? existing.category : mapped.category,
        isActive: existing.isActive !== undefined ? existing.isActive : mapped.isActive,
        isNew: existing.isNew !== undefined ? existing.isNew : mapped.isNew,
      };
    }
    return mapped;
  });

  // Append manual products and any products that exist locally but were not returned by Etsy
  const localOnlyProducts: Product[] = [];
  for (const [id, p] of prev.entries()) {
    if (!matchedIds.has(id)) {
      localOnlyProducts.push(p);
    }
  }

  const products = [...syncedProducts, ...localOnlyProducts];

  if (products.length === 0) {
    console.warn('No products to write — keeping existing products.json (no overwrite).');
    process.exit(0);
  }

  await applyTranslations(products, prev);
  const out = {
    lastSync: new Date().toISOString(),
    shopId,
    shopName: SHOP,
    total: products.length,
    products,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  const withImages = products.filter((p) => p.image).length;
  const cats = new Set(products.map((p) => p.category)).size;
  console.log(
    `Synced ${products.length} products to src/data/products.json ` +
      `(${withImages} with images, ${cats} categories, ${Object.keys(sections).length} shop sections)`,
  );
  await writeReviews(shop);
}

main().catch((err) => {
  console.error('Sync failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
