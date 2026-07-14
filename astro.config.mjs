import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// SITE_URL is the production domain (custom domain served by Cloudflare Pages).
// Drives canonical URLs, hreflang, sitemap and JSON-LD, so it must be the real
// public domain. Override per-env with SITE_URL if a preview host is needed.
const SITE_URL = process.env.SITE_URL || 'https://aseloves.com';

export default defineConfig({
  site: SITE_URL,
  output: 'static',

  // Astro's default CSRF guard (security.checkOrigin) rejects cross-site POSTs
  // with a form content-type. PayTR's payment callback is exactly that — a
  // server-to-server `application/x-www-form-urlencoded` POST from paytr.com —
  // so the guard 403'd it before our handler ran and orders never recorded.
  // Disabling it is safe here: the admin API is protected by a SameSite=Strict
  // cookie (never sent cross-site) plus JWT, not by this form-origin check.
  security: { checkOrigin: false },

  // imageService: 'passthrough' — all product images are remote Etsy URLs
  // rendered directly in <img>; we do not use Astro image optimization. This
  // keeps `sharp` (a native Node addon that cannot run on Cloudflare's edge)
  // out of the worker bundle so the `/` redirect worker boots cleanly.
  adapter: cloudflare({ imageService: 'passthrough' }),

  trailingSlash: 'ignore',
  build: { format: 'directory' },

  vite: {
    resolve: {
      // The react-dom/server → server.edge alias is required for the Cloudflare
      // edge build in production, but it breaks `astro dev`: server.edge.js uses
      // `require`, which is undefined in the dev SSR runtime, so every page 500s
      // with "require is not defined". Apply the alias only for `astro build`.
      alias: process.env.NODE_ENV === 'production' ? {
        'react-dom/server': 'react-dom/server.edge',
      } : {},
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/products.json': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },

    plugins: [tailwindcss()],
  },

  integrations: [react()],
});