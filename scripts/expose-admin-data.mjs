#!/usr/bin/env node
/**
 * Prebuild step: expose the product catalogue as a static file the admin panel
 * (public/admin/dashboard.html) can read at `/products.json`.
 *
 * The storefront embeds src/data/products.json at build time; the admin SPA
 * instead fetches it over HTTP, so we copy it into public/ before `astro build`
 * (Astro then emits it to dist/products.json). Generated file — gitignored.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'data', 'products.json');
const destDir = join(root, 'public');
const dest = join(destDir, 'products.json');

if (!existsSync(src)) {
  console.warn(`[expose-admin-data] ${src} not found — skipping.`);
  process.exit(0);
}

await mkdir(destDir, { recursive: true });
await copyFile(src, dest);
console.log('[expose-admin-data] copied src/data/products.json -> public/products.json');
