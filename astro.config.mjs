import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// SITE_URL is the production domain (Cloudflare-managed). Override per-env if needed.
const SITE_URL = process.env.SITE_URL || 'https://aselovers.pages.dev';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  adapter: cloudflare(),
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
