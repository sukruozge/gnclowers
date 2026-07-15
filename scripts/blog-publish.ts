/**
 * Auto-publish queued blog posts on schedule.
 *
 * Posts written ahead of time carry `published: false` + `publishAt: "YYYY-MM-DD"`.
 * The daily blog-publish workflow runs this; any post whose publishAt has arrived
 * is flipped live (published: true), fresh-dated to today, and its publishAt is
 * removed. This drips out pre-written, human-quality content over time — Google
 * sees a steady stream of fresh posts, no LLM API key required.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../src/data/blog.json', import.meta.url);
const today = new Date().toISOString().slice(0, 10);

const posts = JSON.parse(readFileSync(FILE, 'utf8')) as Array<Record<string, any>>;
let changed = 0;
for (const p of posts) {
  if (p.published === false && typeof p.publishAt === 'string' && p.publishAt <= today) {
    p.published = true;
    p.date = today; // fresh-date on go-live for a genuine "published today" signal
    delete p.publishAt;
    changed++;
    console.log(`Published: ${p.slug}`);
  }
}

if (changed) {
  writeFileSync(FILE, JSON.stringify(posts, null, 2) + '\n', 'utf8');
  console.log(`${changed} post(s) published today (${today}).`);
} else {
  console.log(`No queued posts due on ${today}.`);
}
