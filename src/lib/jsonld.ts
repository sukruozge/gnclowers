import type { Product } from './products';
import { localizedTitle } from './products';
import type { Locale } from './i18n';

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
      url: product.url,
      availability: 'https://schema.org/InStock',
    },
  };
  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);
  if (images.length) data.image = images;
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
