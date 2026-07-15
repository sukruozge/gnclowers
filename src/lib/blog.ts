export interface Post {
  slug: string;
  date: string;
  title_tr: string;
  title_en: string;
  excerpt_tr: string;
  excerpt_en: string;
  bodyHtml_tr: string;
  bodyHtml_en: string;
  /** Banner/cover image URL, managed in the admin. Falls back to the first body image. */
  cover?: string;
  /** Category label shown on the banner. Falls back to a locale default. */
  category?: string;
  /** SEO <title> override. Falls back to the post title. */
  metaTitle?: string;
  /** SEO meta description override. Falls back to the excerpt. */
  metaDesc?: string;
  /** Reading-time label override (e.g. "5 min"). Falls back to a computed estimate. */
  readTime?: string;
  /** When false, the post is a draft/queued and hidden from the storefront. Absent/true means live. */
  published?: boolean;
  /** ISO date (YYYY-MM-DD) when a queued post should auto-publish. The daily
   *  blog-publish workflow flips `published` to true on/after this date. */
  publishAt?: string;
}

import blogData from "../data/blog.json";

const POSTS: Post[] = blogData as Post[];

export function loadPosts(): Post[] {
  // Hide drafts / queued posts (published === false). Queued posts go live when
  // the daily blog-publish workflow flips them on/after their publishAt date.
  return [...POSTS]
    .filter((p) => p.published !== false)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function postSlug(post: Post): string {
  return post.slug;
}

/** Localized display labels for the (language-neutral) category keys. */
const CATEGORY_LABELS: Record<string, { tr: string; en: string }> = {
  Safety: { tr: 'Güvenlik', en: 'Safety' },
  'Gift Guide': { tr: 'Hediye Rehberi', en: 'Gift Guide' },
  'Care & Sleep': { tr: 'Bakım & Uyku', en: 'Care & Sleep' },
  'Home & Style': { tr: 'Ev & Tarz', en: 'Home & Style' },
  Stories: { tr: 'Hikâyeler', en: 'Stories' },
  Journal: { tr: 'Günlük', en: 'Journal' },
};

export function categoryLabel(cat: string, locale: 'tr' | 'en'): string {
  return CATEGORY_LABELS[cat]?.[locale] ?? cat;
}

const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

/** Estimated reading time in minutes (~200 words/min, floor of 1). */
export function readingTimeMin(html: string): number {
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function slugifyHeading(text: string): string {
  const mapped = text.replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => TR_MAP[c] ?? c);
  return (
    mapped
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section'
  );
}

/** First <img> src in the body, used as the article cover. */
export function firstImageSrc(html: string): string | undefined {
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
}

/**
 * Pull the first image out of the body to use as the hero cover, and return the
 * body with that image removed so it is not shown twice. Falls back to /hero.png.
 */
export function splitCover(html: string): { cover: string; body: string } {
  const wrapped = html.match(/<p>\s*<img[^>]+src=["']([^"']+)["'][^>]*\/?>\s*<\/p>/i);
  if (wrapped) return { cover: wrapped[1], body: html.replace(wrapped[0], '') };
  const bare = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/i);
  if (bare) return { cover: bare[1], body: html.replace(bare[0], '') };
  return { cover: '/hero.png', body: html };
}

/**
 * Inject id attributes into <h2> headings and return a table of contents.
 * Lets every post render a consistent "In this article" nav automatically.
 */
export function buildToc(html: string): { html: string; toc: Array<{ id: string; text: string }> } {
  const toc: Array<{ id: string; text: string }> = [];
  const used = new Set<string>();
  const withIds = html.replace(/<h2>([\s\S]*?)<\/h2>/gi, (_m, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    let id = slugifyHeading(text);
    let n = 2;
    while (used.has(id)) id = `${slugifyHeading(text)}-${n++}`;
    used.add(id);
    toc.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: withIds, toc };
}
