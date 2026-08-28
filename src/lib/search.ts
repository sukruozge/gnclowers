import type { Product } from './products';
import { categoryLabel } from './categories';

// Turkish letters fold to their ASCII counterpart so "Zürafa" and "zurafa" are
// the same query. Dotted/dotless I is the one that actually bites: plain `I`
// lowercases to `i`, so mapping `İ`→i and `ı`→i collapses all four forms.
const TR_FOLD: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

/** Field separator inside a haystack. Marks where one field ends and the next
 *  begins, so scoring can tell a title-start match from a mid-title one. */
const SEP = ' | ';

/**
 * Normalize text for comparison: Turkish-aware, diacritic-free, lowercase,
 * single-spaced. Unlike `slugBase` this keeps spaces as word separators,
 * because scoring needs word boundaries.
 */
export function foldSearch(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => TR_FOLD[c] ?? c)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * The searchable text of a product, folded and field-ordered by importance:
 * TR title, EN title, both category labels, tags, id.
 *
 * Descriptions are deliberately excluded — they are long marketing copy that
 * mentions every animal in the shop, so including them would make almost every
 * query match almost every product.
 */
export function buildHaystack(p: Product): string {
  const fields = [
    p.title_tr,
    p.title_en,
    categoryLabel(p.category, 'tr'),
    categoryLabel(p.category, 'en'),
    ...(p.tags ?? []),
    p.id,
  ];
  return fields.map(foldSearch).filter(Boolean).join(SEP);
}

const FIELD_START = 100; // term opens a field (e.g. the title itself)
const WORD_START = 40;   // term opens a word inside a field
const IN_WORD = 10;      // term sits inside a longer word
const WORD_END = 30;     // bonus: term also ends on a word boundary

const isWordChar = (c: string | undefined) => c !== undefined && /[a-z0-9]/.test(c);

/** Points for the best occurrence of one already-folded term in a haystack. */
function scoreTerm(haystack: string, term: string): number {
  let best = 0;
  for (let i = haystack.indexOf(term); i !== -1; i = haystack.indexOf(term, i + 1)) {
    const before = i === 0 ? undefined : haystack[i - 1];
    const after = haystack[i + term.length];

    let points: number;
    if (i === 0 || before === '|') points = FIELD_START;
    else if (!isWordChar(before)) points = WORD_START;
    else points = IN_WORD;

    if (!isWordChar(after)) points += WORD_END;
    if (points > best) best = points;
  }
  return best;
}

/**
 * Relevance of a haystack for a list of folded terms. Every term must appear
 * (AND semantics) — a query like "orgu zurafa" should not return every crochet
 * item. Returns 0 when any term is missing or no terms were given.
 */
export function scoreHaystack(haystack: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  let total = 0;
  for (const term of terms) {
    const points = scoreTerm(haystack, term);
    if (points === 0) return 0;
    total += points;
  }
  return total;
}

/** Split a raw user query into folded search terms. */
export function queryTerms(query: string | null | undefined): string[] {
  const folded = foldSearch(query);
  return folded ? folded.split(' ') : [];
}

/**
 * Products matching `query`, best match first. Returns [] for a blank query
 * (a blank search shows the catalog, not "no results"). `limit` caps the list.
 */
export function searchProducts(products: Product[], query: string, limit?: number): Product[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const ranked = products
    .map((p) => ({ p, score: scoreHaystack(buildHaystack(p), terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return (limit === undefined ? ranked : ranked.slice(0, limit)).map((r) => r.p);
}
