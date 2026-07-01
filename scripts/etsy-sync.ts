import { writeFileSync } from 'node:fs';
import { mapListing, type EtsyImage, type EtsyListing } from '../src/lib/etsy';

const API_KEY = process.env.ETSY_API_KEY ?? '';
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

async function getShopId(): Promise<string> {
  const d = await etsy(`shops?shop_name=${encodeURIComponent(SHOP)}`);
  if (!d.results?.length) throw new Error(`Etsy shop '${SHOP}' not found`);
  return String(d.results[0].shop_id);
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
async function getListingImages(listingId: number | string): Promise<EtsyImage[]> {
  try {
    const d = await etsy(`listings/${listingId}/images`);
    return (d.results ?? []).map((img: any) => ({
      url_570xN: img.url_570xN,
      url_fullxfull: img.url_fullxfull,
    }));
  } catch {
    return [];
  }
}

async function attachImages(listings: EtsyListing[]): Promise<void> {
  // Sequential to stay comfortably under Etsy's 5 QPS rate limit.
  for (const l of listings) {
    l.images = await getListingImages(l.listing_id);
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

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('ETSY_API_KEY is not set — aborting.');
    process.exit(1);
  }
  const shopId = await getShopId();
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
  const products = listings.map((l) => mapListing(l, Date.now(), sections));
  if (products.length === 0) {
    console.warn('Etsy returned 0 products — keeping existing products.json (no overwrite).');
    process.exit(0);
  }
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
}

main().catch((err) => {
  console.error('Sync failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
