import raw from '../data/products.json';
import { slugify } from './slug';
import type { Locale } from './i18n';

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

export function productSlug(p: Product, l: Locale): string {
  return slugify(localizedTitle(p, l), p.id);
}
