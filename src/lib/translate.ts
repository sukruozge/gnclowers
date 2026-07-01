// Pure caching logic for Turkish product translations. The sync uses this to
// avoid re-paying a translation API on every run: a product only needs a fresh
// translation when its English source changed (or was never translated).

export interface Translatable {
  title_en: string;
  title_tr: string;
  description_en: string;
  description_tr: string;
}

/**
 * Returns a reusable Turkish translation for `product`, or null if it needs a
 * fresh one. Reuse happens when either the source already carries a real
 * translation (title/description differ from English), or a previously-stored
 * product with the SAME English source was already translated.
 */
export function cachedTranslation(
  product: Translatable,
  prev?: Translatable,
): { title_tr: string; description_tr: string } | null {
  const isTranslated = (t: Translatable) =>
    t.title_tr !== t.title_en || t.description_tr !== t.description_en;

  if (isTranslated(product)) {
    return { title_tr: product.title_tr, description_tr: product.description_tr };
  }
  if (
    prev &&
    prev.title_en === product.title_en &&
    prev.description_en === product.description_en &&
    isTranslated(prev)
  ) {
    return { title_tr: prev.title_tr, description_tr: prev.description_tr };
  }
  return null;
}
