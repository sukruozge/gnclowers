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
  price: number;        // base price in TRY (shown on the TR storefront)
  currency: string;
  // Optional independent USD price for the EN storefront. When set, EN shows/charges
  // exactly this instead of converting `price` at the daily FX rate; variant prices
  // scale proportionally. When absent, EN falls back to auto-conversion.
  priceUsd?: number;
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
  // Optional map of an option value (e.g. a colour) → image URL, so picking that
  // option on the product page swaps the main gallery image. Admin-managed.
  optionImages?: Record<string, string>;
  // Merchant-defined customer input boxes shown on the product page (e.g. "Name to
  // embroider", "Gift note"). Their filled values travel with the order as a note.
  customFields?: { label: string; required?: boolean }[];
  /** Image alt text (EN, admin-editable) and its Turkish counterpart for /tr pages. */
  imageAlt?: string;
  imageAlt_tr?: string;
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
