/**
 * ASELOVERS — Etsy Sync Script
 * ─────────────────────────────────────────────
 * Etsy mağazanızdan ürünleri çeker ve products.json'a kaydeder.
 * Kullanım: node sync.js
 *
 * Gereksinimler:
 *   1. Node.js yüklü olmalı
 *   2. .env dosyasına ETSY_API_KEY değerinizi yazın
 *   3. npm install node-fetch dotenv   (ilk çalıştırmada)
 */

const fs   = require('fs');
const path = require('path');

// Load env from .env file if exists
try {
  require('dotenv').config();
} catch(e) {
  // dotenv not installed, will use process.env directly
}

const ETSY_API_KEY = process.env.ETSY_API_KEY || '';
const SHOP_NAME    = process.env.ETSY_SHOP     || 'aselovers';
const OUT_FILE     = path.join(__dirname, 'products.json');
const LIMIT        = 100; // per page

// Category mapping: Etsy taxonomy -> site category
const CATEGORY_MAP = {
  'amigurumi':   'amigurumi',
  'toy':         'amigurumi',
  'plush':       'amigurumi',
  'doll':        'amigurumi',
  'stuffed':     'amigurumi',
  'bunny':       'amigurumi',
  'bear':        'amigurumi',
  'giraffe':     'amigurumi',
  'duck':        'amigurumi',
  'flamingo':    'amigurumi',
  'bag':         'bag',
  'tote':        'bag',
  'purse':       'bag',
  'tieback':     'decor',
  'curtain':     'decor',
  'nursery':     'decor',
  'clip':        'accessory',
  'hair':        'accessory',
  'brooch':      'accessory',
  'accessory':   'accessory',
};

function detectCategory(listing) {
  const text = (listing.title + ' ' + (listing.description || '')).toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) return cat;
  }
  return 'amigurumi'; // default
}

async function fetchEtsy(endpoint) {
  // Try native fetch (Node 18+) or fallback to node-fetch
  let fetchFn;
  try {
    fetchFn = fetch; // Node 18+
  } catch(e) {
    fetchFn = require('node-fetch');
  }

  const url = `https://openapi.etsy.com/v3/application/${endpoint}`;
  const res = await fetchFn(url, {
    headers: { 'x-api-key': ETSY_API_KEY }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getShopId() {
  const data = await fetchEtsy(`shops?shop_name=${SHOP_NAME}`);
  if (!data.results || data.results.length === 0) throw new Error(`Shop '${SHOP_NAME}' bulunamadı`);
  return data.results[0].shop_id;
}

async function getListings(shopId) {
  let offset = 0;
  let all = [];

  while (true) {
    const data = await fetchEtsy(
      `shops/${shopId}/listings/active?limit=${LIMIT}&offset=${offset}&includes[]=Images&includes[]=Translations`
    );
    const results = data.results || [];
    all = all.concat(results);
    process.stdout.write(`  ${all.length}/${data.count || '?'} ürün alındı...\r`);
    if (results.length < LIMIT) break;
    offset += LIMIT;
  }
  console.log(`\n  Toplam ${all.length} aktif ürün bulundu.`);
  return all;
}

function mapListing(listing) {
  const image = listing.images && listing.images.length > 0
    ? listing.images[0].url_570xN || listing.images[0].url_fullxfull
    : null;

  // Try to get Turkish translation
  const trTranslation = listing.translations
    ? listing.translations.find(tr => tr.language === 'tr')
    : null;

  const title_en = listing.title || '';
  const title_tr = trTranslation ? trTranslation.title : title_en;
  const desc_en  = (listing.description || '').split('\n')[0].substring(0, 200);
  const desc_tr  = trTranslation ? (trTranslation.description || '').split('\n')[0].substring(0, 200) : desc_en;

  return {
    id:             String(listing.listing_id),
    title_en:       title_en,
    title_tr:       title_tr,
    description_en: desc_en,
    description_tr: desc_tr,
    price:          parseFloat(listing.price?.amount || 0) / (listing.price?.divisor || 100),
    currency:       listing.price?.currency_code || 'TRY',
    image:          image,
    url:            listing.url || `https://www.etsy.com/listing/${listing.listing_id}/`,
    category:       detectCategory(listing),
    tags:           listing.tags || [],
    views:          listing.views || 0,
    isNew:          isNewListing(listing),
    isActive:       listing.state === 'active',
  };
}

function isNewListing(listing) {
  const created = new Date(listing.creation_timestamp * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return created > thirtyDaysAgo;
}

async function sync() {
  console.log('\n🧶 ASELOVERS — Etsy Sync Başlıyor\n' + '─'.repeat(40));

  if (!ETSY_API_KEY) {
    console.error('❌ ETSY_API_KEY bulunamadı!');
    console.log('\n📋 Adımlar:');
    console.log('  1. https://www.etsy.com/developers adresine git');
    console.log('  2. "Create a New App" ile uygulama oluştur');
    console.log('  3. Aldığın "Keystring"i .env dosyasına yaz:');
    console.log('     ETSY_API_KEY=your_keystring_here');
    console.log('     ETSY_SHOP=aselovers\n');
    process.exit(1);
  }

  try {
    console.log('🔍 Shop ID alınıyor...');
    const shopId = await getShopId();
    console.log(`✅ Shop bulundu: ${SHOP_NAME} (ID: ${shopId})`);

    console.log('📦 Ürünler çekiliyor...');
    const listings = await getListings(shopId);

    console.log('🔄 Ürünler dönüştürülüyor...');
    const products = listings.map(mapListing);

    const output = {
      lastSync:  new Date().toISOString(),
      shopId:    String(shopId),
      shopName:  SHOP_NAME,
      total:     products.length,
      products:  products,
    };

    fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\n✅ Sync tamamlandı! ${products.length} ürün kaydedildi.`);
    console.log(`📁 Dosya: ${OUT_FILE}`);
    console.log(`🕐 Zaman: ${new Date().toLocaleString('tr-TR')}\n`);

  } catch (err) {
    console.error('\n❌ Sync hatası:', err.message);
    process.exit(1);
  }
}

sync();
