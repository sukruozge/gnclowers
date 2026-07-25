import { describe, expect, test } from 'vitest';
import { buildRss } from './rss';
import { loadPosts } from './blog';

const SITE = 'https://example.com';

describe('buildRss', () => {
  test('renders a valid RSS 2.0 envelope', () => {
    const xml = buildRss(SITE, 'tr');
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('</rss>');
  });

  test('contains one item per published post', () => {
    const xml = buildRss(SITE, 'tr');
    const items = xml.match(/<item>/g) ?? [];
    expect(items.length).toBe(loadPosts().length);
  });

  test('uses locale-specific titles and links', () => {
    const tr = buildRss(SITE, 'tr');
    const en = buildRss(SITE, 'en');
    const first = loadPosts()[0];
    expect(tr).toContain(`${SITE}/tr/blog/${first.slug}`);
    expect(en).toContain(`${SITE}/en/blog/${first.slug}`);
  });

  test('emits RFC-822 pubDate from the post date', () => {
    const xml = buildRss(SITE, 'tr');
    const first = loadPosts()[0];
    expect(xml).toContain(new Date(`${first.date.slice(0, 10)}T00:00:00Z`).toUTCString());
  });

  test('escapes XML special characters in titles', () => {
    const xml = buildRss(SITE, 'tr');
    // No raw ampersands outside of escaped entities anywhere in the feed.
    expect(xml).not.toMatch(/&(?!(amp|lt|gt|quot|apos|#\d+);)/);
  });

  test('includes an image in each item description for discovery feeds', () => {
    const xml = buildRss(SITE, 'tr');
    expect(xml).toContain('&lt;img src=');
  });
});
