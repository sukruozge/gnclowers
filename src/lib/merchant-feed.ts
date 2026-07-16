import { loadProducts, productSlug } from './products';
import { canonical } from './seo';
import { effectiveUsdRate } from './currency';

// Google Merchant Center product feed (RSS 2.0 + g: namespace). Enables free
// product listings in Google Shopping. Turkish/TRY, matching the shop currency.

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string
  ));
}

function plain(html: string, max = 4000): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Best-guess Google product category by our Etsy section name.
function gCategory(cat: string): string {
  const c = (cat || '').toLowerCase();
  if (c.includes('bag')) return 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags';
  if (c.includes('clip') || c.includes('hair')) return 'Apparel & Accessories > Clothing Accessories > Hair Accessories';
  if (c.includes('tieback') || c.includes('curtain') || c.includes('decor') || c.includes('nursery') || c.includes('shower')) return 'Home & Garden > Decor';
  return 'Toys & Games > Toys';
}

export interface FeedOptions { locale?: 'tr' | 'en'; usdRate?: number }

export function buildMerchantFeed(site: string, opts: FeedOptions = {}): string {
  const locale = opts.locale ?? 'tr';
  const usdRate = opts.usdRate ?? 47.03;
  const isEn = locale === 'en';

  const items = loadProducts().map((p) => {
    const imgs = (p.images && p.images.length ? p.images : (p.image ? [p.image] : [])).filter(Boolean) as string[];
    if (!imgs.length) return ''; // Merchant Center requires an image_link

    const title = ((isEn ? p.title_en : p.title_tr) || p.title_en || p.title_tr || '').slice(0, 150);
    const desc = plain((isEn ? p.description_en : p.description_tr) || p.description_en || title);
    const link = isEn
      ? canonical(site, 'en', `product/${productSlug(p, 'en')}`)
      : canonical(site, 'tr', `urun/${productSlug(p, 'tr')}`);
    // TR feed = TRY; EN feed = USD — the product's own USD price when set, else
    // converted from the TRY base at the daily rate.
    const price = isEn
      ? `${(Number(p.price) / effectiveUsdRate(Number(p.price), p.priceUsd, usdRate)).toFixed(2)} USD`
      : `${Number(p.price).toFixed(2)} ${p.currency || 'TRY'}`;

    const lines = [
      '  <item>',
      `    <g:id>${esc(p.id)}</g:id>`,
      `    <g:title>${esc(title)}</g:title>`,
      `    <g:description>${esc(desc)}</g:description>`,
      `    <g:link>${esc(link)}</g:link>`,
      `    <g:image_link>${esc(imgs[0])}</g:image_link>`,
      ...imgs.slice(1, 11).map((u) => `    <g:additional_image_link>${esc(u)}</g:additional_image_link>`),
      '    <g:availability>in_stock</g:availability>',
      `    <g:price>${esc(price)}</g:price>`,
      '    <g:condition>new</g:condition>',
      '    <g:brand>Aselovers</g:brand>',
      '    <g:identifier_exists>no</g:identifier_exists>',
      `    <g:google_product_category>${esc(gCategory(p.category))}</g:google_product_category>`,
      `    <g:product_type>${esc(p.category || 'Amigurumi')}</g:product_type>`,
      '  </item>',
    ];
    return lines.join('\n');
  }).filter(Boolean).join('\n');

  const channelTitle = isEn ? 'Aselovers — Handmade Crochet Toys' : 'Aselovers — El Yapımı Örgü Oyuncak';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${channelTitle}</title>
  <link>${esc(site)}</link>
  <description>Handmade crochet / amigurumi toys, baby gifts and nursery decor.</description>
${items}
</channel>
</rss>`;
}
