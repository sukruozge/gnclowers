import { canonical } from './seo';
import { loadProducts, productSlug } from './products';
import { loadPosts } from './blog';
import { categorySlug } from './categories';

const STATIC: Array<{ tr: string; en: string }> = [
  { tr: '', en: '' },
  { tr: 'urunler', en: 'products' },
  { tr: 'hakkimizda', en: 'about' },
  { tr: 'blog', en: 'blog' },
  { tr: 'iletisim', en: 'contact' },
];

export function buildSitemap(site: string): string {
  const urls: Array<{ loc: string; lastmod?: string }> = [];
  for (const r of STATIC) {
    urls.push({ loc: canonical(site, 'tr', r.tr) });
    urls.push({ loc: canonical(site, 'en', r.en) });
  }
  const products = loadProducts();
  for (const c of new Set(products.map((p) => p.category))) {
    urls.push({ loc: canonical(site, 'tr', `urunler/${categorySlug(c, 'tr')}`) });
    urls.push({ loc: canonical(site, 'en', `products/${categorySlug(c, 'en')}`) });
  }
  for (const p of products) {
    urls.push({ loc: canonical(site, 'tr', `urun/${productSlug(p, 'tr')}`) });
    urls.push({ loc: canonical(site, 'en', `product/${productSlug(p, 'en')}`) });
  }
  for (const post of loadPosts()) {
    // Freshness signal for crawlers; posts carry a YYYY-MM-DD date.
    const lastmod = /^\d{4}-\d{2}-\d{2}/.test(post.date || '') ? post.date.slice(0, 10) : undefined;
    urls.push({ loc: canonical(site, 'tr', `blog/${post.slug}`), lastmod });
    urls.push({ loc: canonical(site, 'en', `blog/${post.slug}`), lastmod });
  }
  const body = urls
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
