// Pure variation helpers, kept free of any `products.json` import so client
// bundles (product detail page, cart, checkout) can use them without pulling
// the whole catalog into the browser.

export interface ProductOptionGroup {
  name: string;
  values: string[];
}
export interface ProductVariant {
  values: Record<string, string>;
  price: number;
}

// Canonical, order-independent key for a set of selected option values.
export function variantKey(values: Record<string, string>): string {
  return Object.keys(values)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${values[k]}`)
    .join('|');
}

// Effective price for a product given the customer's selected options. Falls
// back to the base price when there's no matching variant.
// SECURITY: the server (paytr.ts) calls this too — never trust a client price.
export function resolveVariantPrice(
  p: { price: number; variants?: ProductVariant[] },
  selected: Record<string, string> | undefined,
): number {
  if (!p.variants || !p.variants.length || !selected || !Object.keys(selected).length) return p.price;
  const key = variantKey(selected);
  const match = p.variants.find((v) => variantKey(v.values) === key);
  return match ? match.price : p.price;
}
