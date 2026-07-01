import { canonical } from './seo';
import { loadProducts, productSlug } from './products';

const STATIC: Array<{ tr: string; en: string }> = [
  { tr: '', en: '' },
  { tr: 'urunler', en: 'products' },
  { tr: 'hakkimizda', en: 'about' },
  { tr: 'blog', en: 'blog' },
  { tr: 'iletisim', en: 'contact' },
];

export function buildSitemap(site: string): string {
  const urls: string[] = [];
  for (const r of STATIC) {
    urls.push(canonical(site, 'tr', r.tr));
    urls.push(canonical(site, 'en', r.en));
  }
  for (const p of loadProducts()) {
    urls.push(canonical(site, 'tr', `urun/${productSlug(p, 'tr')}`));
    urls.push(canonical(site, 'en', `product/${productSlug(p, 'en')}`));
  }
  const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
