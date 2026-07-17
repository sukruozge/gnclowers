import { readFileSync, writeFileSync } from 'node:fs';
import { mapListing, type EtsyImage, type EtsyListing } from '../src/lib/etsy';
import type { Product } from '../src/lib/products';
import { cachedTranslation } from '../src/lib/translate';

// ETSY_API_KEY may be "keystring" or "keystring:shared_secret" — Etsy wants the
// full value in the x-api-key header, but OAuth's client_id is the keystring only.
const API_KEY = process.env.ETSY_API_KEY ?? '';
const KEYSTRING = API_KEY.split(':')[0];
const DEEPL_API_KEY = process.env.DEEPL_API_KEY ?? '';
const ETSY_REFRESH_TOKEN = process.env.ETSY_REFRESH_TOKEN ?? '';
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

// getListingInventory needs an OAuth 2.0 token (listings_r scope), not just the
// API key — so we exchange the long-lived refresh token for a short-lived
// access token first. Without ETSY_REFRESH_TOKEN we skip variations entirely.
async function getAccessToken(): Promise<string> {
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEYSTRING,
      refresh_token: ETSY_REFRESH_TOKEN,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token refresh ${res.status}: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

// Fetch a listing's inventory (variations/options + per-combination price).
// Best-effort: a listing with no variations just yields nothing usable.
async function getListingInventory(listingId: number | string, token: string): Promise<any | undefined> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`, {
        headers: { 'x-api-key': API_KEY, Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Etsy inventory ${res.status}`);
      return await res.json();
    } catch {
      if (attempt === 0) await sleep(1500);
    }
  }
  return undefined;
}

async function attachInventory(listings: EtsyListing[], token: string): Promise<void> {
  for (const l of listings) {
    l.inventory = await getListingInventory(l.listing_id, token);
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

const SETTINGS_OUT = new URL('../src/data/settings.json', import.meta.url);

// Refresh TRY→USD / TRY→EUR rates so the EN storefront prices stay accurate.
// Best-effort: a failure keeps the existing rates. TRY is volatile, so daily is ideal.
async function updateRates(): Promise<void> {
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=TRY,EUR');
    if (!res.ok) throw new Error(`FX ${res.status}`);
    const d: any = await res.json();
    const tryPerUsd = Number(d?.rates?.TRY);
    const eurPerUsd = Number(d?.rates?.EUR);
    if (!(tryPerUsd > 0 && eurPerUsd > 0)) throw new Error('bad rate payload');
    const usd = Math.round(tryPerUsd * 100) / 100;
    const eur = Math.round((tryPerUsd / eurPerUsd) * 100) / 100;
    const s = JSON.parse(readFileSync(SETTINGS_OUT, 'utf8'));
    s.rates = { usd, eur, updatedAt: new Date().toISOString().slice(0, 10) };
    writeFileSync(SETTINGS_OUT, JSON.stringify(s, null, 2) + '\n', 'utf8');
    console.log(`FX rates updated: 1 USD = ${usd} TRY, 1 EUR = ${eur} TRY`);
  } catch (err) {
    console.warn('Could not update FX rates (keeping existing):', err instanceof Error ? err.message : err);
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
  // Variations require OAuth. If a refresh token is configured, pull inventory
  // (options + per-variant prices); otherwise skip it without failing the sync.
  if (ETSY_REFRESH_TOKEN) {
    try {
      const token = await getAccessToken();
      await attachInventory(listings, token);
      console.log('Inventory (variations) fetched via OAuth.');
    } catch (err) {
      console.warn('Could not fetch inventory (variations):', err instanceof Error ? err.message : err);
    }
  } else {
    console.log('ETSY_REFRESH_TOKEN not set — skipping product variations (options).');
  }
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
        priceUsd: (existing as any).priceUsd !== undefined ? (existing as any).priceUsd : (mapped as any).priceUsd,
        currency: existing.currency !== undefined ? existing.currency : mapped.currency,
        image: existing.image !== undefined ? existing.image : mapped.image,
        // Panel is the editing surface for these — manual curation (gallery order,
        // variant prices, tags) wins over the nightly Etsy pull, like titles/price do.
        images: (existing as any).images !== undefined ? (existing as any).images : (mapped as any).images,
        tags: (existing as any).tags !== undefined ? (existing as any).tags : (mapped as any).tags,
        options: (existing as any).options !== undefined ? (existing as any).options : (mapped as any).options,
        variants: (existing as any).variants !== undefined ? (existing as any).variants : (mapped as any).variants,
        optionImages: (existing as any).optionImages !== undefined ? (existing as any).optionImages : (mapped as any).optionImages,
        imageAlt: (existing as any).imageAlt !== undefined ? (existing as any).imageAlt : (mapped as any).imageAlt,
        customFields: (existing as any).customFields !== undefined ? (existing as any).customFields : (mapped as any).customFields,
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
  await updateRates();
}

main().catch((err) => {
  console.error('Sync failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
