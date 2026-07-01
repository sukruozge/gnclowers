# Deploy — Aselovers (Cloudflare Pages)

The site is a static Astro build served by Cloudflare Pages, with one Pages
Function (`functions/index.js`) handling the country-based `/` redirect.

## One-time setup (Cloudflare dashboard)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Select repo **`sukruozge/aselovers-webpage2`**.
   - Production branch: choose **`main`** (merge `feat/astro-storefront` into
     `main` first — see below), or temporarily set it to
     `feat/astro-storefront` to preview before merging.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Environment variables (Settings → Environment variables):
   - **`SITE_URL`** = `https://<your-domain>` (your Cloudflare-managed domain).
     This drives all canonical/hreflang/sitemap absolute URLs — set it before
     the first production build.
5. Compatibility flag: the repo ships a `wrangler.toml` that sets
   `compatibility_flags = ["nodejs_compat"]` and `pages_build_output_dir = "dist"`.
   Cloudflare Pages reads this automatically, so the `/` redirect worker boots
   without any manual dashboard flag. (If your Pages project ever ignores
   `wrangler.toml`, set `nodejs_compat` manually under Settings → Functions →
   Compatibility flags for BOTH Production and Preview.)
6. Save and deploy. The first build runs `npm run build` and publishes `dist/`.
   The `/` country redirect runs as an on-demand worker route
   (`src/pages/index.ts`); all `/tr/*` and `/en/*` pages are static.

## Custom domain

After the first successful deploy: **Pages → Custom domains → Set up a domain**.
Since the domain is already on Cloudflare, DNS is configured automatically.

## Post-deploy verification

Against the live URL, confirm:

- Visiting `/` redirects by country: Turkey → `/tr`, elsewhere → `/en`.
- `/tr/urunler` and `/en/products` list the products.
- A product page (e.g. `/en/product/<slug>`) shows the Etsy **Buy** link and,
  in page source, `<link rel="alternate" hreflang="tr|en|x-default">` plus a
  `<link rel="canonical">`.
- `/sitemap.xml` lists both `/tr/...` and `/en/...` URLs; `/robots.txt` resolves
  and points to the sitemap.
- Security headers are present (from `public/_headers`): `X-Frame-Options`,
  `X-Content-Type-Options`, `Strict-Transport-Security`, etc.

## Local commands

```
npm install      # install dependencies
npm run dev      # local dev server (http://localhost:4321)
npm test         # unit tests (Vitest)
npm run build    # production build → dist/
npm run preview  # preview the production build locally
```

## Notes / next phases

- Products currently come from the committed seed `src/data/products.json`.
  **Plan 2** adds a GitHub Action that pulls live products from the Etsy API
  and adds Product JSON-LD structured data.
- The admin panel, subscriber capture, shipping-info editing, and security
  hardening are **Plan 3** (Cloudflare Pages Functions + KV).
