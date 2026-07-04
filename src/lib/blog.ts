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
