import { describe, it, expect } from 'vitest';
import { loadPosts, postSlug } from '@lib/blog';

describe('blog', () => {
  const posts = loadPosts();
  it('has at least 3 posts, each bilingual', () => {
    expect(posts.length).toBeGreaterThanOrEqual(3);
    for (const p of posts) {
      expect(p.title_tr && p.title_en).toBeTruthy();
      expect(p.bodyHtml_tr && p.bodyHtml_en).toBeTruthy();
    }
  });
  it('orders posts newest first', () => {
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1].date >= posts[i].date).toBe(true);
    }
  });
  it('postSlug returns the slug', () => {
    expect(postSlug(posts[0])).toBe(posts[0].slug);
  });
  it('slugs are unique', () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
