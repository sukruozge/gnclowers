import { describe, it, expect } from 'vitest';
import { buildSitemap } from '@lib/sitemap';

describe('buildSitemap', () => {
  const xml = buildSitemap('https://aselovers.example');
  it('is valid urlset xml', () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset');
  });
  it('includes both locale home pages', () => {
    expect(xml).toContain('<loc>https://aselovers.example/tr</loc>');
    expect(xml).toContain('<loc>https://aselovers.example/en</loc>');
  });
  it('includes localized catalog routes', () => {
    expect(xml).toContain('https://aselovers.example/tr/urunler');
    expect(xml).toContain('https://aselovers.example/en/products');
  });
  it('includes blog post urls', () => {
    expect(xml).toContain('/tr/blog/');
    expect(xml).toContain('/en/blog/');
  });
});
