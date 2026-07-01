# Storefront Foundation (Plan 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a bilingual (TR/EN), SEO-optimized Astro static site on Cloudflare Pages that reuses the existing visual design and renders products from a seed `products.json`.

**Architecture:** Astro generates static `/tr/` and `/en/` HTML at build time using the `@astrojs/cloudflare` adapter. Pure, testable TypeScript modules under `src/lib/` hold all logic (i18n lookup, slugify, product loading, SEO URL building, locale selection, sitemap). Astro components/pages assemble those modules into HTML. Cloudflare Pages serves the output; a small Pages Function handles country-based root redirect.

**Tech Stack:** Astro 5, `@astrojs/cloudflare`, TypeScript, Vitest (unit tests), existing `style.css`.

## Global Constraints

- Node version floor: `>=18.0.0` (matches existing `package.json` engines).
- Two locales only: `tr` and `en`. Every public URL is prefixed `/tr/` or `/en/` — no unprefixed content pages.
- Every page emits `<link rel="canonical">` plus `hreflang` alternates for `tr`, `en`, and `x-default`.
- `<html lang>` must equal the page locale.
- Site base URL is read from one source: `SITE_URL` (Astro `site` config). Never hardcode the domain in templates.
- Reuse existing `style.css`; do not redesign visuals in this plan.
- All commands target Windows + PowerShell. Use `npm` (project already uses npm).
- "Buy" actions link to the product's Etsy `url`; no cart in this plan.

---

### Task 1: Initialize Astro project alongside existing files

**Files:**
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/env.d.ts`
- Modify: `package.json` (scripts + deps)
- Modify: `.gitignore` (add `dist/`, `.astro/`)

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable Astro project. `npm run build` outputs to `dist/`. `npm test` runs Vitest.

- [ ] **Step 1: Install Astro + adapter + Vitest**

The repo already has files in the root, so initialize Astro manually (do NOT run `npm create astro` — it scaffolds a fresh tree).

Run:
```
npm install astro@^5 @astrojs/cloudflare@^12
npm install -D vitest@^2 typescript@^5
```
Expected: packages added to `package.json`, no errors.

- [ ] **Step 2: Write `astro.config.mjs`**

```js
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
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@lib/*": ["src/lib/*"] }
  },
  "include": ["src", "vitest.config.ts"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '@lib': new URL('./src/lib/', import.meta.url).pathname } },
});
```

- [ ] **Step 5: Write `src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
```

- [ ] **Step 6: Update `package.json` scripts**

Replace the `scripts` block with:
```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 7: Update `.gitignore`**

Append:
```
dist/
.astro/
```

- [ ] **Step 8: Verify the toolchain runs**

Run: `npm test`
Expected: Vitest exits 0 with "No test files found" (no tests yet — that's fine).

- [ ] **Step 9: Commit**

```
git add astro.config.mjs tsconfig.json vitest.config.ts src/env.d.ts package.json package-lock.json .gitignore
git commit -m "chore: initialize Astro + Vitest toolchain"
```

---

### Task 2: i18n strings and lookup utility

**Files:**
- Create: `src/lib/i18n.ts`
- Create: `src/lib/i18n.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Locale = 'tr' | 'en'`
  - `const LOCALES: Locale[]`
  - `function t(key: string, locale: Locale): string` — returns the string for `key`; falls back to the key itself if missing.
  - `const strings: Record<Locale, Record<string, string>>`

- [ ] **Step 1: Write the failing test**

`src/lib/i18n.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { t, LOCALES } from '@lib/i18n';

describe('i18n', () => {
  it('exposes exactly tr and en', () => {
    expect(LOCALES).toEqual(['tr', 'en']);
  });
  it('returns the localized string', () => {
    expect(t('nav.products', 'tr')).toBe('Ürünler');
    expect(t('nav.products', 'en')).toBe('Products');
  });
  it('falls back to the key when missing', () => {
    expect(t('does.not.exist', 'en')).toBe('does.not.exist');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@lib/i18n`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/i18n.ts`:
```ts
export type Locale = 'tr' | 'en';
export const LOCALES: Locale[] = ['tr', 'en'];

export const strings: Record<Locale, Record<string, string>> = {
  tr: {
    'nav.home': 'Ana Sayfa',
    'nav.products': 'Ürünler',
    'nav.about': 'Hakkımızda',
    'nav.blog': 'Blog',
    'nav.contact': 'İletişim',
    'cta.buy': "Etsy'de Satın Al",
    'shipping.title': 'Kargo Bilgisi',
    'footer.rights': 'Tüm hakları saklıdır.',
  },
  en: {
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.about': 'About',
    'nav.blog': 'Blog',
    'nav.contact': 'Contact',
    'cta.buy': 'Buy on Etsy',
    'shipping.title': 'Shipping Info',
    'footer.rights': 'All rights reserved.',
  },
};

export function t(key: string, locale: Locale): string {
  return strings[locale]?.[key] ?? key;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```
git add src/lib/i18n.ts src/lib/i18n.test.ts
git commit -m "feat: i18n string lookup for tr/en"
```

---

### Task 3: Slug generation

**Files:**
- Create: `src/lib/slug.ts`
- Create: `src/lib/slug.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `function slugify(title: string, id: string): string` — lowercase, ASCII-folded (Turkish chars mapped), hyphenated, with `-<id>` suffix to guarantee uniqueness.

- [ ] **Step 1: Write the failing test**

`src/lib/slug.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { slugify } from '@lib/slug';

describe('slugify', () => {
  it('folds Turkish characters and appends id', () => {
    expect(slugify('El Yapımı Tavşan', '1234')).toBe('el-yapimi-tavsan-1234');
  });
  it('collapses spaces and symbols', () => {
    expect(slugify('Handmade  Bunny!! Toy', '9')).toBe('handmade-bunny-toy-9');
  });
  it('handles empty title', () => {
    expect(slugify('', '5')).toBe('5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@lib/slug`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/slug.ts`:
```ts
const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

export function slugify(title: string, id: string): string {
  const base = title
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => TR_MAP[c] ?? c)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base ? `${base}-${id}` : id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat: locale-safe slug generation"
```

---

### Task 4: Product data module

**Files:**
- Create: `src/data/products.json` (seed copy of existing root `products.json`)
- Create: `src/lib/products.ts`
- Create: `src/lib/products.test.ts`

**Interfaces:**
- Consumes: `slugify` (Task 3), `Locale` (Task 2).
- Produces:
  - `interface Product { id, title_en, title_tr, description_en, description_tr, price, currency, image, url, category, tags, isNew, isActive }`
  - `function loadProducts(): Product[]` — reads `src/data/products.json`, returns only `isActive` items.
  - `function localizedTitle(p: Product, l: Locale): string`
  - `function productSlug(p: Product, l: Locale): string` — locale-specific slug from the localized title.

- [ ] **Step 1: Seed the data file**

Copy the existing root `products.json` into `src/data/products.json` (same shape: `{ products: [...] }`). This is a static seed; Plan 2 replaces it via the Etsy Action.

- [ ] **Step 2: Write the failing test**

`src/lib/products.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { loadProducts, localizedTitle, productSlug } from '@lib/products';

describe('products', () => {
  const all = loadProducts();

  it('loads at least one active product', () => {
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((p) => p.isActive)).toBe(true);
  });
  it('localizes title by locale', () => {
    const p = all[0];
    expect(localizedTitle(p, 'tr')).toBe(p.title_tr);
    expect(localizedTitle(p, 'en')).toBe(p.title_en);
  });
  it('produces a slug ending in the product id', () => {
    const p = all[0];
    expect(productSlug(p, 'en').endsWith(p.id)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@lib/products`.

- [ ] **Step 4: Write minimal implementation**

`src/lib/products.ts`:
```ts
import raw from '../data/products.json';
import { slugify } from './slug';
import type { Locale } from './i18n';

export interface Product {
  id: string;
  title_en: string;
  title_tr: string;
  description_en: string;
  description_tr: string;
  price: number;
  currency: string;
  image: string | null;
  url: string;
  category: string;
  tags: string[];
  isNew: boolean;
  isActive: boolean;
}

export function loadProducts(): Product[] {
  const list = (raw as { products: Product[] }).products ?? [];
  return list.filter((p) => p.isActive);
}

export function localizedTitle(p: Product, l: Locale): string {
  return l === 'tr' ? p.title_tr : p.title_en;
}

export function productSlug(p: Product, l: Locale): string {
  return slugify(localizedTitle(p, l), p.id);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```
git add src/data/products.json src/lib/products.ts src/lib/products.test.ts
git commit -m "feat: product data module with localized slugs"
```

---

### Task 5: SEO URL + hreflang builder

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/lib/seo.test.ts`

**Interfaces:**
- Consumes: `Locale`, `LOCALES` (Task 2).
- Produces:
  - `function canonical(site: string, locale: Locale, path: string): string` — absolute URL, e.g. `canonical('https://x.com','tr','urunler') => 'https://x.com/tr/urunler'`.
  - `function alternates(site: string, paths: Record<Locale, string>): Array<{ hreflang: string; href: string }>` — includes `tr`, `en`, and `x-default` (x-default → en).

- [ ] **Step 1: Write the failing test**

`src/lib/seo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { canonical, alternates } from '@lib/seo';

const SITE = 'https://aselovers.example';

describe('seo', () => {
  it('builds an absolute canonical url', () => {
    expect(canonical(SITE, 'tr', 'urunler')).toBe('https://aselovers.example/tr/urunler');
    expect(canonical(SITE, 'en', '')).toBe('https://aselovers.example/en');
  });
  it('emits tr, en and x-default alternates', () => {
    const alt = alternates(SITE, { tr: 'urunler', en: 'products' });
    expect(alt).toEqual([
      { hreflang: 'tr', href: 'https://aselovers.example/tr/urunler' },
      { hreflang: 'en', href: 'https://aselovers.example/en/products' },
      { hreflang: 'x-default', href: 'https://aselovers.example/en/products' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@lib/seo`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/seo.ts`:
```ts
import type { Locale } from './i18n';

export function canonical(site: string, locale: Locale, path: string): string {
  const base = site.replace(/\/+$/, '');
  const clean = path.replace(/^\/+/, '');
  return clean ? `${base}/${locale}/${clean}` : `${base}/${locale}`;
}

export function alternates(
  site: string,
  paths: Record<Locale, string>,
): Array<{ hreflang: string; href: string }> {
  return [
    { hreflang: 'tr', href: canonical(site, 'tr', paths.tr) },
    { hreflang: 'en', href: canonical(site, 'en', paths.en) },
    { hreflang: 'x-default', href: canonical(site, 'en', paths.en) },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "feat: canonical + hreflang URL builders"
```

---

### Task 6: Locale selection from country

**Files:**
- Create: `src/lib/locale.ts`
- Create: `src/lib/locale.test.ts`

**Interfaces:**
- Consumes: `Locale` (Task 2).
- Produces: `function pickLocale(country: string | null): Locale` — `'TR'` → `tr`; everything else (and null) → `en`.

- [ ] **Step 1: Write the failing test**

`src/lib/locale.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pickLocale } from '@lib/locale';

describe('pickLocale', () => {
  it('routes Turkey to tr', () => expect(pickLocale('TR')).toBe('tr'));
  it('routes the US to en', () => expect(pickLocale('US')).toBe('en'));
  it('defaults null to en', () => expect(pickLocale(null)).toBe('en'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@lib/locale`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/locale.ts`:
```ts
import type { Locale } from './i18n';

export function pickLocale(country: string | null): Locale {
  return country === 'TR' ? 'tr' : 'en';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add src/lib/locale.ts src/lib/locale.test.ts
git commit -m "feat: country-to-locale selection"
```

---

### Task 7: Base layout component with SEO head

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `public/style.css` (move existing root `style.css`)
- Create: `src/components/Nav.astro`
- Create: `src/components/Footer.astro`

**Interfaces:**
- Consumes: `t` (Task 2), `canonical` + `alternates` (Task 5).
- Produces: `Base.astro` accepting props `{ locale: Locale; title: string; description: string; pathSelf: string; pathsAlt: Record<Locale,string>; ogImage?: string }` and a default `<slot/>`.

- [ ] **Step 1: Make the stylesheet a static asset**

Copy existing root `style.css` to `public/style.css` (Astro serves `public/` at site root, so `/style.css` resolves).

- [ ] **Step 2: Write `src/components/Nav.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
const { locale } = Astro.props as { locale: Locale };
const p = (tr: string, en: string) => (locale === 'tr' ? `/tr/${tr}` : `/en/${en}`);
const other = locale === 'tr' ? '/en' : '/tr';
---
<nav class="site-nav">
  <a class="brand" href={`/${locale}`}>Aselovers</a>
  <a href={p('urunler', 'products')}>{t('nav.products', locale)}</a>
  <a href={p('hakkimizda', 'about')}>{t('nav.about', locale)}</a>
  <a href={p('blog', 'blog')}>{t('nav.blog', locale)}</a>
  <a href={p('iletisim', 'contact')}>{t('nav.contact', locale)}</a>
  <a class="lang-switch" href={other}>{locale === 'tr' ? 'EN' : 'TR'}</a>
</nav>
```

- [ ] **Step 3: Write `src/components/Footer.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
const { locale } = Astro.props as { locale: Locale };
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <p>© {year} Aselovers — {t('footer.rights', locale)}</p>
</footer>
```

- [ ] **Step 4: Write `src/layouts/Base.astro`**

```astro
---
import { type Locale } from '@lib/i18n';
import { canonical, alternates } from '@lib/seo';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';

interface Props {
  locale: Locale;
  title: string;
  description: string;
  pathSelf: string;
  pathsAlt: Record<Locale, string>;
  ogImage?: string;
}
const { locale, title, description, pathSelf, pathsAlt, ogImage } = Astro.props;
const site = Astro.site!.toString().replace(/\/+$/, '');
const canon = canonical(site, locale, pathSelf);
const alts = alternates(site, pathsAlt);
const og = ogImage ?? `${site}/og-default.jpg`;
---
<!doctype html>
<html lang={locale}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canon} />
    {alts.map((a) => <link rel="alternate" hreflang={a.hreflang} href={a.href} />)}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canon} />
    <meta property="og:image" content={og} />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <Nav locale={locale} />
    <main>
      <slot />
    </main>
    <Footer locale={locale} />
  </body>
</html>
```

- [ ] **Step 5: Verify it compiles (no test — component)**

Run: `npm run build`
Expected: build may warn about missing pages, but must not error on `Base.astro`/components parsing. (Pages added next task.) If build fails only due to "no pages found", proceed.

- [ ] **Step 6: Commit**

```
git add public/style.css src/layouts/Base.astro src/components/Nav.astro src/components/Footer.astro
git commit -m "feat: base layout with SEO head, nav, footer"
```

---

### Task 8: Localized content pages (home, about, blog, contact)

**Files:**
- Create: `src/pages/tr/index.astro`, `src/pages/en/index.astro`
- Create: `src/pages/tr/hakkimizda.astro`, `src/pages/en/about.astro`
- Create: `src/pages/tr/blog.astro`, `src/pages/en/blog.astro`
- Create: `src/pages/tr/iletisim.astro`, `src/pages/en/contact.astro`

**Interfaces:**
- Consumes: `Base.astro` (Task 7), `t` (Task 2).
- Produces: eight routes. Each passes correct `pathSelf` and `pathsAlt` so hreflang cross-links the two locales.

- [ ] **Step 1: Write the TR home page**

`src/pages/tr/index.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
---
<Base
  locale="tr"
  title="Aselovers — El Yapımı Amigurumi"
  description="Sevgiyle örülmüş el yapımı amigurumi oyuncaklar ve aksesuarlar."
  pathSelf=""
  pathsAlt={{ tr: '', en: '' }}
>
  <section class="hero">
    <h1>Aselovers</h1>
    <p>Sevgiyle örülmüş el yapımı amigurumi.</p>
    <a class="btn" href="/tr/urunler">Ürünleri Keşfet</a>
  </section>
</Base>
```

- [ ] **Step 2: Write the EN home page**

`src/pages/en/index.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
---
<Base
  locale="en"
  title="Aselovers — Handmade Amigurumi"
  description="Lovingly crocheted handmade amigurumi toys and accessories."
  pathSelf=""
  pathsAlt={{ tr: '', en: '' }}
>
  <section class="hero">
    <h1>Aselovers</h1>
    <p>Lovingly crocheted handmade amigurumi.</p>
    <a class="btn" href="/en/products">Explore Products</a>
  </section>
</Base>
```

- [ ] **Step 3: Write the about pages**

`src/pages/tr/hakkimizda.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
---
<Base locale="tr" title="Hakkımızda — Aselovers"
  description="Aselovers hikayesi: el yapımı amigurumi tutkusu."
  pathSelf="hakkimizda" pathsAlt={{ tr: 'hakkimizda', en: 'about' }}>
  <section class="page"><h1>Hakkımızda</h1>
  <p>Aselovers, sevgiyle örülen el yapımı amigurumi markasıdır.</p></section>
</Base>
```

`src/pages/en/about.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
---
<Base locale="en" title="About — Aselovers"
  description="The Aselovers story: a passion for handmade amigurumi."
  pathSelf="about" pathsAlt={{ tr: 'hakkimizda', en: 'about' }}>
  <section class="page"><h1>About</h1>
  <p>Aselovers is a handmade amigurumi brand crocheted with love.</p></section>
</Base>
```

- [ ] **Step 4: Write the blog pages**

`src/pages/tr/blog.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
---
<Base locale="tr" title="Blog — Aselovers"
  description="Amigurumi ipuçları, hikayeler ve yenilikler."
  pathSelf="blog" pathsAlt={{ tr: 'blog', en: 'blog' }}>
  <section class="page"><h1>Blog</h1><p>Yakında yazılar burada.</p></section>
</Base>
```

`src/pages/en/blog.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
---
<Base locale="en" title="Blog — Aselovers"
  description="Amigurumi tips, stories and news."
  pathSelf="blog" pathsAlt={{ tr: 'blog', en: 'blog' }}>
  <section class="page"><h1>Blog</h1><p>Posts coming soon.</p></section>
</Base>
```

- [ ] **Step 5: Write the contact pages**

`src/pages/tr/iletisim.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
---
<Base locale="tr" title="İletişim — Aselovers"
  description="Aselovers ile iletişime geçin."
  pathSelf="iletisim" pathsAlt={{ tr: 'iletisim', en: 'contact' }}>
  <section class="page"><h1>İletişim</h1>
  <p>Bize Etsy üzerinden ya da sosyal medyadan ulaşabilirsiniz.</p></section>
</Base>
```

`src/pages/en/contact.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
---
<Base locale="en" title="Contact — Aselovers"
  description="Get in touch with Aselovers."
  pathSelf="contact" pathsAlt={{ tr: 'iletisim', en: 'contact' }}>
  <section class="page"><h1>Contact</h1>
  <p>Reach us on Etsy or social media.</p></section>
</Base>
```

- [ ] **Step 6: Build and verify routes exist**

Run: `npm run build`
Expected: PASS. `dist/tr/index.html`, `dist/en/index.html`, `dist/tr/hakkimizda/index.html`, `dist/en/about/index.html`, and the blog/contact equivalents all exist.

- [ ] **Step 7: Commit**

```
git add src/pages/tr src/pages/en
git commit -m "feat: bilingual home/about/blog/contact pages"
```

---

### Task 9: Product catalog + detail pages

**Files:**
- Create: `src/pages/tr/urunler.astro`, `src/pages/en/products.astro`
- Create: `src/pages/tr/urun/[slug].astro`, `src/pages/en/product/[slug].astro`
- Create: `src/components/ProductCard.astro`

**Interfaces:**
- Consumes: `loadProducts`, `localizedTitle`, `productSlug` (Task 4), `t` (Task 2), `Base.astro` (Task 7).
- Produces: catalog listing + one static detail page per active product per locale, cross-linked via hreflang. "Buy" links to Etsy `url`.

- [ ] **Step 1: Write `src/components/ProductCard.astro`**

```astro
---
import { type Locale } from '@lib/i18n';
import { localizedTitle, productSlug, type Product } from '@lib/products';
const { product, locale } = Astro.props as { product: Product; locale: Locale };
const title = localizedTitle(product, locale);
const href = locale === 'tr'
  ? `/tr/urun/${productSlug(product, 'tr')}`
  : `/en/product/${productSlug(product, 'en')}`;
---
<a class="product-card" href={href}>
  {product.image && <img src={product.image} alt={title} loading="lazy" />}
  <h3>{title}</h3>
  <span class="price">{product.price} {product.currency}</span>
</a>
```

- [ ] **Step 2: Write the TR catalog page**

`src/pages/tr/urunler.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import ProductCard from '../../components/ProductCard.astro';
import { loadProducts } from '@lib/products';
const products = loadProducts();
---
<Base locale="tr" title="Ürünler — Aselovers"
  description="El yapımı amigurumi ürün koleksiyonu."
  pathSelf="urunler" pathsAlt={{ tr: 'urunler', en: 'products' }}>
  <section class="catalog">
    <h1>Ürünler</h1>
    <div class="grid">
      {products.map((p) => <ProductCard product={p} locale="tr" />)}
    </div>
  </section>
</Base>
```

- [ ] **Step 3: Write the EN catalog page**

`src/pages/en/products.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import ProductCard from '../../components/ProductCard.astro';
import { loadProducts } from '@lib/products';
const products = loadProducts();
---
<Base locale="en" title="Products — Aselovers"
  description="The handmade amigurumi collection."
  pathSelf="products" pathsAlt={{ tr: 'urunler', en: 'products' }}>
  <section class="catalog">
    <h1>Products</h1>
    <div class="grid">
      {products.map((p) => <ProductCard product={p} locale="en" />)}
    </div>
  </section>
</Base>
```

- [ ] **Step 4: Write the TR detail page**

`src/pages/tr/urun/[slug].astro`:
```astro
---
import Base from '../../../layouts/Base.astro';
import { t } from '@lib/i18n';
import { loadProducts, localizedTitle, productSlug, type Product } from '@lib/products';

export function getStaticPaths() {
  return loadProducts().map((p) => ({
    params: { slug: productSlug(p, 'tr') },
    props: { product: p },
  }));
}
const { product } = Astro.props as { product: Product };
const title = localizedTitle(product, 'tr');
const enSlug = productSlug(product, 'en');
---
<Base locale="tr" title={`${title} — Aselovers`}
  description={product.description_tr || title}
  pathSelf={`urun/${productSlug(product, 'tr')}`}
  pathsAlt={{ tr: `urun/${productSlug(product, 'tr')}`, en: `product/${enSlug}` }}
  ogImage={product.image ?? undefined}>
  <article class="product-detail">
    {product.image && <img src={product.image} alt={title} />}
    <h1>{title}</h1>
    <p class="price">{product.price} {product.currency}</p>
    <p>{product.description_tr}</p>
    <a class="btn buy" href={product.url} target="_blank" rel="noopener">{t('cta.buy', 'tr')}</a>
  </article>
</Base>
```

- [ ] **Step 5: Write the EN detail page**

`src/pages/en/product/[slug].astro`:
```astro
---
import Base from '../../../layouts/Base.astro';
import { t } from '@lib/i18n';
import { loadProducts, localizedTitle, productSlug, type Product } from '@lib/products';

export function getStaticPaths() {
  return loadProducts().map((p) => ({
    params: { slug: productSlug(p, 'en') },
    props: { product: p },
  }));
}
const { product } = Astro.props as { product: Product };
const title = localizedTitle(product, 'en');
const trSlug = productSlug(product, 'tr');
---
<Base locale="en" title={`${title} — Aselovers`}
  description={product.description_en || title}
  pathSelf={`product/${productSlug(product, 'en')}`}
  pathsAlt={{ tr: `urun/${trSlug}`, en: `product/${productSlug(product, 'en')}` }}
  ogImage={product.image ?? undefined}>
  <article class="product-detail">
    {product.image && <img src={product.image} alt={title} />}
    <h1>{title}</h1>
    <p class="price">{product.price} {product.currency}</p>
    <p>{product.description_en}</p>
    <a class="btn buy" href={product.url} target="_blank" rel="noopener">{t('cta.buy', 'en')}</a>
  </article>
</Base>
```

- [ ] **Step 6: Build and verify product pages generate**

Run: `npm run build`
Expected: PASS. `dist/tr/urunler/index.html` and `dist/en/products/index.html` exist, and at least one `dist/tr/urun/<slug>/index.html` + `dist/en/product/<slug>/index.html` exist.

- [ ] **Step 7: Commit**

```
git add src/pages/tr/urunler.astro src/pages/en/products.astro src/pages/tr/urun src/pages/en/product src/components/ProductCard.astro
git commit -m "feat: bilingual catalog and product detail pages"
```

---

### Task 10: Sitemap + robots

**Files:**
- Create: `src/lib/sitemap.ts`
- Create: `src/lib/sitemap.test.ts`
- Create: `src/pages/sitemap.xml.ts`
- Create: `public/robots.txt`

**Interfaces:**
- Consumes: `loadProducts`, `productSlug` (Task 4), `canonical` (Task 5).
- Produces: `function buildSitemap(site: string): string` — valid XML containing every static route in both locales plus every product URL in both locales.

- [ ] **Step 1: Write the failing test**

`src/lib/sitemap.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildSitemap } from '@lib/sitemap';

describe('buildSitemap', () => {
  const xml = buildSitemap('https://aselovers.example');
  it('is valid urlset xml', () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset');
  });
  it('includes both locale home pages', () => {
    expect(xml).toContain('<loc>https://aselovers.example/tr</loc>');
    expect(xml).toContain('<loc>https://aselovers.example/en</loc>');
  });
  it('includes localized catalog routes', () => {
    expect(xml).toContain('https://aselovers.example/tr/urunler');
    expect(xml).toContain('https://aselovers.example/en/products');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@lib/sitemap`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/sitemap.ts`:
```ts
import { canonical } from './seo';
import { loadProducts, productSlug } from './products';

const STATIC: Array<{ tr: string; en: string }> = [
  { tr: '', en: '' },
  { tr: 'urunler', en: 'products' },
  { tr: 'hakkimizda', en: 'about' },
  { tr: 'blog', en: 'blog' },
  { tr: 'iletisim', en: 'contact' },
];

export function buildSitemap(site: string): string {
  const urls: string[] = [];
  for (const r of STATIC) {
    urls.push(canonical(site, 'tr', r.tr));
    urls.push(canonical(site, 'en', r.en));
  }
  for (const p of loadProducts()) {
    urls.push(canonical(site, 'tr', `urun/${productSlug(p, 'tr')}`));
    urls.push(canonical(site, 'en', `product/${productSlug(p, 'en')}`));
  }
  const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write the sitemap endpoint**

`src/pages/sitemap.xml.ts`:
```ts
import type { APIRoute } from 'astro';
import { buildSitemap } from '@lib/sitemap';

export const GET: APIRoute = ({ site }) => {
  const xml = buildSitemap(site!.toString().replace(/\/+$/, ''));
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
```

- [ ] **Step 6: Write `public/robots.txt`**

```
User-agent: *
Allow: /
Sitemap: /sitemap.xml
```

- [ ] **Step 7: Build and verify sitemap renders**

Run: `npm run build`
Expected: PASS. `dist/sitemap.xml` exists and contains `/tr/urunler` and `/en/products`.

- [ ] **Step 8: Commit**

```
git add src/lib/sitemap.ts src/lib/sitemap.test.ts src/pages/sitemap.xml.ts public/robots.txt
git commit -m "feat: sitemap.xml and robots.txt"
```

---

### Task 11: Country-based root redirect (Pages Function)

**Files:**
- Create: `functions/index.js`
- Create: `public/_headers`

**Interfaces:**
- Consumes: locale logic mirrors `pickLocale` (Task 6) but runs at the edge (Functions cannot import `src/`). Logic is duplicated intentionally and kept to one line.
- Produces: a redirect from `/` to `/tr` or `/en` based on `request.cf.country`. `_headers` adds baseline security headers.

- [ ] **Step 1: Write the root redirect Function**

`functions/index.js`:
```js
// Cloudflare Pages Function: redirect "/" by visitor country.
export const onRequestGet = (context) => {
  const country = context.request.cf?.country ?? null;
  const locale = country === 'TR' ? 'tr' : 'en';
  return Response.redirect(new URL(`/${locale}`, context.request.url).toString(), 302);
};
```

- [ ] **Step 2: Write `public/_headers`**

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
```

- [ ] **Step 3: Build and confirm output**

Run: `npm run build`
Expected: PASS. (`_headers` is copied from `public/` to `dist/`.)

> **CORRECTION (post-implementation):** The original plan assumed a root
> `functions/index.js` would run on Cloudflare Pages. That is FALSE when the
> `@astrojs/cloudflare` adapter is used: the adapter emits `dist/_worker.js`,
> and Pages ignores the `functions/` directory whenever a `_worker.js` exists.
> The country `/` redirect was therefore implemented as an on-demand Astro
> route (`src/pages/index.ts`, `export const prerender = false`, routing through
> `pickLocale`), and `functions/index.js` was removed. The adapter also needs
> `imageService: 'passthrough'` (to keep native `sharp` out of the worker) and
> the `nodejs_compat` flag (shipped via `wrangler.toml`) to boot. Plans 2/3
> should assume Astro routes + `_worker.js`, NOT a root `functions/` dir.

- [ ] **Step 4: Commit**

```
git add functions/index.js public/_headers
git commit -m "feat: country root redirect + security headers"
```

---

### Task 12: Cloudflare Pages deploy + full verification

**Files:**
- Create: `README.deploy.md` (deploy steps, one source of truth)

**Interfaces:**
- Consumes: the built `dist/` from all prior tasks.
- Produces: a live Pages project building from the GitHub repo on push.

- [ ] **Step 1: Confirm a clean full build + tests**

Run: `npm test`
Expected: PASS (all unit suites).
Run: `npm run build`
Expected: PASS, `dist/` populated.

- [ ] **Step 2: Write `README.deploy.md`**

```markdown
# Deploy (Cloudflare Pages)

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Select repo `sukruozge/aselovers-webpage2`, branch `main`.
3. Build command: `npm run build`. Output directory: `dist`.
4. Environment variable: `SITE_URL = https://<your-domain>`.
5. After first deploy, add the custom domain (already on Cloudflare) under
   Pages → Custom domains.
6. Verify: `/` redirects by country; `/tr` and `/en` load; `/sitemap.xml`
   lists both locales; product pages render with hreflang tags.
```

- [ ] **Step 3: Push to trigger deploy**

```
git add README.deploy.md
git commit -m "docs: Cloudflare Pages deploy guide"
git push origin main
```
Expected: Cloudflare Pages builds and publishes. (First-time setup of the Pages project per `README.deploy.md` is a one-time manual dashboard step.)

- [ ] **Step 4: Post-deploy verification (manual, against the live URL)**

Confirm each:
- Visiting `/` redirects to `/tr` or `/en`.
- `/tr/urunler` and `/en/products` list seed products.
- A product detail page shows the Etsy "Buy" link and `hreflang` alternates in page source.
- `/sitemap.xml` and `/robots.txt` resolve.

---

## Self-Review

**Spec coverage (vs. design doc §3–§8):**
- §3 URL/i18n → Tasks 7–9 (locale-prefixed routes, hreflang), Task 11 (root redirect). ✓
- §4 Etsy data model → Task 4 uses the existing product shape; live Etsy Action is **Plan 2** (out of scope here, seed JSON used). ✓ (boundary intentional)
- §5 SEO → Task 7 (canonical/OG), Task 10 (sitemap/robots), Task 9 (per-product meta). Product JSON-LD lands with detail pages in **Plan 2** alongside the real Etsy feed. Noted gap, deferred by design.
- §6 Shipping info → **Plan 3** (admin-edited KV). Out of scope here. ✓
- §7 Admin/security → baseline headers in Task 11; full admin is **Plan 3**. ✓
- §8 Migration → existing `style.css` reused (Task 7); Express removal happens when Functions replace it in **Plan 3**. ✓

**Placeholder scan:** No TBD/TODO; every code step contains complete code. ✓

**Type consistency:** `Locale`, `Product`, `productSlug(p, locale)`, `canonical(site, locale, path)`, `alternates(site, paths)`, `loadProducts()`, `buildSitemap(site)` are used with identical signatures across tasks. ✓

**Note:** Product JSON-LD structured data is intentionally deferred to Plan 2 (it ships with the live Etsy feed and final product fields), so it is not a gap in Plan 1's scope.
