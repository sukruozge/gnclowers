import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// SITE_URL is the production domain (Cloudflare-managed). Override per-env if needed.
const SITE_URL = process.env.SITE_URL || 'https://aselovers.pages.dev';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // imageService: 'passthrough' — all product images are remote Etsy URLs
  // rendered directly in <img>; we do not use Astro image optimization. This
  // keeps `sharp` (a native Node addon that cannot run on Cloudflare's edge)
  // out of the worker bundle so the `/` redirect worker boots cleanly.
  adapter: cloudflare({ imageService: 'passthrough' }),
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
