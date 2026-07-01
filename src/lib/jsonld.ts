import type { Product } from './products';
import { localizedTitle } from './products';
import type { Locale } from './i18n';

export function productJsonLd(product: Product, locale: Locale, url: string): string {
  const desc = locale === 'tr' ? product.description_tr : product.description_en;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: localizedTitle(product, locale),
    image: product.image ? [product.image] : [],
    description: desc,
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: product.currency,
      url: product.url,
      availability: 'https://schema.org/InStock',
    },
  };
  return JSON.stringify(data);
}
