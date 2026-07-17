import type { Product } from './products';
import { localizedTitle } from './products';
import type { Locale } from './i18n';
import type { Post } from './blog';
import { localeCurrency, toCurrency, FALLBACK_RATES, type Rates } from './currency';

const BRAND = 'Aselovers';
const BRAND_DESC =
  'Handmade amigurumi and crochet toys, crocheted by hand in Istanbul from soft cotton yarn.';

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
    image: `${site}/hero.png`,
    description: BRAND_DESC,
    email: 'info@aselovers.com',
    address: { '@type': 'PostalAddress', addressLocality: 'İstanbul', addressCountry: 'TR' },
    areaServed: 'Worldwide',
    knowsAbout: ['amigurumi', 'crochet', 'örgü', 'handmade toys', 'nursery decor', 'baby gifts'],
    sameAs: [
      'https://www.instagram.com/aselovers/',
      'https://pinterest.com/aselovers',
    ],
  });
}

/** FAQ schema — a high-value AEO signal: LLMs and Google surface Q&A directly. */
export function faqPageJsonLd(items: Array<{ q: string; a: string }>): string {
  return encode({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
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

/** Catalog page schema — tells Google the listing is a curated product collection. */
export function itemListJsonLd(name: string, items: Array<{ name: string; url: string }>): string {
  return encode({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
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

export function productJsonLd(
  product: Product,
  locale: Locale,
  url: string,
  rating?: { value: number; count: number },
  rates: Rates = FALLBACK_RATES,
): string {
  const desc = locale === 'tr' ? product.description_tr : product.description_en;
  // Offer must reflect the price the visitor actually sees on this locale's page:
  // TRY on /tr, USD on /en. Declaring TRY on the English page is a currency mismatch
  // that suppresses Google rich results / Merchant listings.
  const cur = localeCurrency(locale);
  const price = toCurrency(product.price, cur, rates);
  // Google recommends priceValidUntil on Offer; keep it a stable far-future date so
  // the schema doesn't churn every build.
  const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: localizedTitle(product, locale),
    description: desc,
    brand: { '@type': 'Brand', name: BRAND },
    category: product.category,
    itemCondition: 'https://schema.org/NewCondition',
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: cur,
      priceValidUntil,
      url,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: BRAND },
    },
  };
  // Turkish tags become schema keywords on the TR locale only — the EN listing
  // copy comes from Etsy and must stay untouched.
  if (locale === 'tr' && product.tags?.length) {
    data.keywords = product.tags.slice(0, 13).join(', ');
  }
  // Real, verified seller rating from Etsy (shop-wide) — only when we have it.
  if (rating && rating.count > 0 && rating.value > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.value,
      reviewCount: rating.count,
      bestRating: 5,
    };
  }
  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);
  if (images.length) data.image = images;
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
