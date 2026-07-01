import type { Product } from './products';

export function filterByCategory(products: Product[], cat: string | null): Product[] {
  if (!cat || cat === 'all') return products;
  return products.filter((p) => p.category === cat);
}
