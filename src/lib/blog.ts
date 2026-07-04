export interface Post {
  slug: string;
  date: string;
  title_tr: string;
  title_en: string;
  excerpt_tr: string;
  excerpt_en: string;
  bodyHtml_tr: string;
  bodyHtml_en: string;
}

import blogData from "../data/blog.json";

const POSTS: Post[] = blogData as Post[];

export function loadPosts(): Post[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function postSlug(post: Post): string {
  return post.slug;
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
