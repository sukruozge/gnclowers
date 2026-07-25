import { canonical } from './seo';
import { loadPosts } from './blog';
import type { Locale } from './i18n';

/** Minimal XML entity escape for text nodes and attribute values. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * RSS 2.0 feed of the blog for one locale. Consumed by feed readers and by
 * discovery/auto-posting services (e.g. Pinterest "auto-publish from RSS").
 * Each item carries its cover image inside the description so image-driven
 * platforms have something to pin.
 */
export function buildRss(site: string, locale: Locale): string {
  const isTr = locale === 'tr';
  const posts = loadPosts();
  const channelTitle = isTr ? 'Aselovers Blog — El Yapımı Amigurumi' : 'Aselovers Journal — Handmade Amigurumi';
  const channelDesc = isTr
    ? 'El yapımı amigurumi oyuncaklar, hediye rehberleri ve atölye günlüğü.'
    : 'Handmade amigurumi toys, gift guides and workshop journal.';
  const channelLink = canonical(site, locale, 'blog');

  const items = posts
    .map((p) => {
      const title = isTr ? p.title_tr : p.title_en;
      const excerpt = isTr ? p.excerpt_tr : p.excerpt_en;
      const link = canonical(site, locale, `blog/${p.slug}`);
      const pubDate = new Date(`${(p.date || '').slice(0, 10)}T00:00:00Z`).toUTCString();
      const coverAbs = p.cover ? (p.cover.startsWith('http') ? p.cover : site + p.cover) : undefined;
      const descHtml = `${coverAbs ? `<img src="${coverAbs}" alt="${esc(title)}" />` : ''}<p>${esc(excerpt)}</p>`;
      return [
        '    <item>',
        `      <title>${esc(title)}</title>`,
        `      <link>${esc(link)}</link>`,
        `      <guid isPermaLink="true">${esc(link)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${esc(descHtml)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${esc(channelTitle)}</title>`,
    `    <link>${esc(channelLink)}</link>`,
    `    <description>${esc(channelDesc)}</description>`,
    `    <language>${isTr ? 'tr' : 'en'}</language>`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n');
}
