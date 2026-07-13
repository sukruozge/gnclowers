import type { Product } from './products';
import { localizedTitle } from './products';
import type { Locale } from './i18n';
import type { Post } from './blog';

const BRAND = 'Aselovers';
const BRAND_DESC =
  'Handmade organic amigurumi and crochet toys, knitted in Istanbul with OEKO-TEX® and GOTS® certified 100% cotton yarn.';

function encode(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Site-wide publisher identity — emit once per page (in Base layout). */
export function organizationJsonLd(site: string): string {
  return encode({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: site,
    logo: `${site}/favicon.svg`,
    description: BRAND_DESC,
    sameAs: ['https://www.instagram.com/aselovers/'],
  });
}

/** Site-wide WebSite entity — helps Google understand the site as one brand. */
export function websiteJsonLd(site: string): string {
  return encode({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND,
    url: site,
    inLanguage: ['en', 'tr'],
    publisher: { '@type': 'Organization', name: BRAND, url: site },
    // NOTE: a SearchAction can be added here once an on-site search endpoint exists.
  });
}

function firstImage(html: string): string | undefined {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

/** Blog article schema — drives rich results and AI citations for blog posts. */
export function articleJsonLd(post: Post, locale: Locale, url: string, site: string): string {
  const isTr = locale === 'tr';
  const image = firstImage(isTr ? post.bodyHtml_tr : post.bodyHtml_en) ?? `${site}/hero.png`;
  return encode({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: isTr ? post.title_tr : post.title_en,
    description: isTr ? post.excerpt_tr : post.excerpt_en,
    image: [image],
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: locale,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: BRAND, url: site },
    publisher: {
      '@type': 'Organization',
      name: BRAND,
      logo: { '@type': 'ImageObject', url: `${site}/favicon.svg` },
    },
  });
}

/** Breadcrumb trail — shows navigation path in search results. */
export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): string {
  return encode({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  });
}

export function productJsonLd(product: Product, locale: Locale, url: string): string {
  const desc = locale === 'tr' ? product.description_tr : product.description_en;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: localizedTitle(product, locale),
    description: desc,
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: product.currency,
      url,
      availability: 'https://schema.org/InStock',
    },
  };
  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);
  if (images.length) data.image = images;
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
