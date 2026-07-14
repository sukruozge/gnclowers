import raw from '../data/products.json';
import { slugify } from './slug';
import type { Locale } from './i18n';
import type { ProductOptionGroup, ProductVariant } from './variants';

export { variantKey, resolveVariantPrice } from './variants';
export type { ProductOptionGroup, ProductVariant } from './variants';

export interface Product {
  id: string;
  title_en: string;
  title_tr: string;
  description_en: string;
  description_tr: string;
  price: number;
  currency: string;
  image: string | null;
  images: string[];
  url: string;
  category: string;
  tags: string[];
  isNew: boolean;
  isActive: boolean;
  // Etsy variations (optional). `options` drives the selectors; `variants` maps a
  // chosen combination to its price. Absent for listings without variations.
  options?: ProductOptionGroup[];
  variants?: ProductVariant[];
}

export function hasVariations(p: Product): boolean {
  return Array.isArray(p.options) && p.options.length > 0 && p.options.some((o) => o.values.length > 1);
}

export function activeOnly(products: Product[]): Product[] {
  return products.filter((p) => p.isActive);
}

export function loadProducts(): Product[] {
  const list = (raw as { products: Product[] }).products ?? [];
  return activeOnly(list);
}

export function localizedTitle(p: Product, l: Locale): string {
  return l === 'tr' ? p.title_tr : p.title_en;
}

// Keep URLs short: use only the first few words of the (often very long) title,
// with the id appended to guarantee uniqueness and stable routing.
export function productSlug(p: Product, l: Locale): string {
  const short = localizedTitle(p, l).split(/\s+/).slice(0, 4).join(' ');
  return slugify(short, p.id);
}
