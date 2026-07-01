# Premium Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Aselovers storefront's visual layer as a warm-premium "Modern Editorial Boutique" design, driven by a single token system, without touching the working i18n/SEO/redirect/Etsy-data infrastructure.

**Architecture:** A token-first CSS system (`src/styles/tokens.css` + `global.css`) feeds a set of focused Astro components and page layouts. All logic modules under `src/lib/` and the `/` redirect (`src/pages/index.ts`) are preserved and reused verbatim. Verification is build-success + browser-preview screenshots; the existing 18 unit tests must stay green, and new logic (i18n keys, category filter, product JSON-LD) is added test-first.

**Tech Stack:** Astro 5, TypeScript, Vitest, Playfair Display + Inter (Google Fonts), CSS custom properties. No CSS framework.

## Global Constraints

- Two locales only: `tr` and `en`; every public URL stays prefixed `/tr/` or `/en/`.
- Every page keeps canonical + hreflang (tr, en, x-default) and `<html lang>` = page locale (logic already in `src/lib/seo.ts`).
- Site base URL comes only from `Astro.site` — never hardcode the domain.
- All color/space/type values come from CSS variables in `src/styles/tokens.css` — no magic hex/px in components.
- Palette: `--bg:#FBFAF7`, `--surface:#FFFFFF`, `--section:#F3EEE6`, `--ink:#22201E`, `--muted:#6B655E`, `--line:#E3DACE`, `--accent:#B85C38`, `--accent-ink:#8F4426`, `--footer-bg:#2A2622`, `--footer-fg:#EFE9E0`.
- Fonts: `--font-display:'Playfair Display',Georgia,serif`; `--font-body:'Inter',system-ui,sans-serif`.
- "Buy" actions link to the product's Etsy `url` with `target="_blank" rel="noopener"`; no cart (Phase 2).
- Reuse `src/lib` exports verbatim: `t(key,locale)`, `LOCALES`, `type Locale`; `loadProducts()`, `localizedTitle(p,l)`, `productSlug(p,l)`, `type Product`; `canonical(site,locale,path)`, `alternates(site,paths)`.
- Every task ends with `npm run build` passing AND `npm test` still 18/18 (plus any new tests). Windows + PowerShell + npm.
- `prefers-reduced-motion`: motion must be disabled under it.

---

### Task 1: Design tokens, global CSS, and Base layout

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Modify: `src/layouts/Base.astro` (full rewrite — keeps existing SEO head props/logic)
- Create: `public/favicon.svg` (overwrite existing)

**Interfaces:**
- Consumes: `canonical`, `alternates` (`@lib/seo`), `type Locale` (`@lib/i18n`).
- Produces: `Base.astro` with the SAME prop contract as before — `{ locale: Locale; title: string; description: string; pathSelf: string; pathsAlt: Record<Locale,string>; ogImage?: string }` and a default `<slot/>`. Global token CSS available on every page via Base.

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
:root {
  --bg: #FBFAF7;
  --surface: #FFFFFF;
  --section: #F3EEE6;
  --ink: #22201E;
  --muted: #6B655E;
  --line: #E3DACE;
  --accent: #B85C38;
  --accent-ink: #8F4426;
  --footer-bg: #2A2622;
  --footer-fg: #EFE9E0;

  --font-display: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-body: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;

  --step-h1: clamp(2.4rem, 5vw, 4rem);
  --step-h2: clamp(1.8rem, 3vw, 2.6rem);
  --step-h3: 1.35rem;
  --step-body: 1rem;
  --step-small: 0.85rem;

  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 40px; --space-7: 64px; --space-8: 96px;

  --radius: 14px;
  --radius-pill: 999px;
  --ease: cubic-bezier(.4, 0, .2, 1);
  --dur: 220ms;
  --maxw: 1200px;
  --shadow-hover: 0 10px 30px rgba(34, 32, 30, .10);
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--step-body);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4 { font-family: var(--font-display); font-weight: 500; line-height: 1.15; color: var(--ink); margin: 0 0 var(--space-4); }
h1 { font-size: var(--step-h1); }
h2 { font-size: var(--step-h2); }
h3 { font-size: var(--step-h3); }
p { margin: 0 0 var(--space-4); }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
main { min-height: 50vh; }

.container { width: 100%; max-width: var(--maxw); margin: 0 auto; padding: 0 var(--space-5); }
.eyebrow { font-family: var(--font-body); font-size: var(--step-small); letter-spacing: .18em; text-transform: uppercase; color: var(--accent); margin: 0 0 var(--space-3); }
.section { padding: var(--space-8) 0; }
.section--tint { background: var(--section); }
.prose { max-width: 68ch; }
.prose p { color: var(--muted); }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
```

- [ ] **Step 3: Rewrite `src/layouts/Base.astro`**

```astro
---
import { type Locale } from '@lib/i18n';
import { canonical, alternates } from '@lib/seo';
import '../styles/tokens.css';
import '../styles/global.css';

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
    {ogImage && <meta property="og:image" content={ogImage} />}
    <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&display=swap" />
    <slot name="head" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 4: Overwrite `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#B85C38"/><text x="16" y="22" font-family="Georgia, serif" font-size="19" font-weight="600" text-anchor="middle" fill="#FBFAF7">a</text></svg>
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: PASS. (Pages still reference the old Nav/Footer until later tasks — if a page fails to import a not-yet-changed component, that is fine for THIS task only if the build still completes; the pages are rewritten in later tasks. If the build breaks on an existing page importing the old `Base` slot API, it will be resolved as pages are rewritten. Confirm `Base.astro`, `tokens.css`, `global.css` compile.)
Run: `npm test`
Expected: 18/18 pass (no lib changed).

> NOTE for implementer: the previous `Base.astro` rendered `<Nav/>`/`<main>`/`<Footer/>` internally. This new `Base.astro` renders only `<slot/>`, so pages now own their Nav/main/Footer. Every page is rewritten in Tasks 4–7 to include `<Nav/>`, `<main>`, `<Footer/>`. If an un-rewritten page breaks the build between tasks, rewrite order is: do Task 2 (Nav/Footer) and Task 3 before Task 4. Until all pages are migrated, a transient build break on an old page is expected; the FINAL gate is Task 8.

- [ ] **Step 6: Commit**

```
git add src/styles/tokens.css src/styles/global.css src/layouts/Base.astro public/favicon.svg
git commit -m "feat(design): token system, global css, editorial base layout"
```

---

### Task 2: Nav and Footer

**Files:**
- Create: `src/components/Nav.astro` (overwrite)
- Create: `src/components/Footer.astro` (overwrite)
- Modify: `src/lib/i18n.ts` (add nav/footer strings)
- Modify: `src/lib/i18n.test.ts` (assert new keys)

**Interfaces:**
- Consumes: `t`, `type Locale` (`@lib/i18n`).
- Produces: `Nav.astro` and `Footer.astro`, each accepting `{ locale: Locale }`.

- [ ] **Step 1: Add strings — write failing test first**

Append to `src/lib/i18n.test.ts` inside the existing `describe('i18n', ...)`:
```ts
  it('has redesign nav/footer strings', () => {
    expect(t('footer.tagline', 'tr')).toBe('Sevgiyle örülmüş el yapımı amigurumi.');
    expect(t('footer.tagline', 'en')).toBe('Handmade amigurumi, crocheted with love.');
    expect(t('footer.shop', 'en')).toBe('Shop');
  });
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm test`
Expected: FAIL — `t('footer.tagline','tr')` returns the key (not yet defined).

- [ ] **Step 3: Add the strings to `src/lib/i18n.ts`**

Add these keys to BOTH locale objects in `strings` (keep existing keys):
```ts
// in tr:
'nav.shopAll': 'Tüm Ürünler',
'footer.tagline': 'Sevgiyle örülmüş el yapımı amigurumi.',
'footer.shop': 'Mağaza',
'footer.about': 'Hakkımızda',
'footer.follow': 'Bizi Takip Et',
// in en:
'nav.shopAll': 'Shop all',
'footer.tagline': 'Handmade amigurumi, crocheted with love.',
'footer.shop': 'Shop',
'footer.about': 'About',
'footer.follow': 'Follow us',
```

- [ ] **Step 4: Run test — verify pass**

Run: `npm test`
Expected: PASS (existing i18n test now also checks the new keys; total tests increase by 1).

- [ ] **Step 5: Write `src/components/Nav.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
const { locale } = Astro.props as { locale: Locale };
const p = (tr: string, en: string) => (locale === 'tr' ? `/tr/${tr}` : `/en/${en}`);
const other = locale === 'tr' ? '/en' : '/tr';
const links = [
  { href: p('urunler', 'products'), label: t('nav.products', locale) },
  { href: p('hakkimizda', 'about'), label: t('nav.about', locale) },
  { href: p('blog', 'blog'), label: t('nav.blog', locale) },
  { href: p('iletisim', 'contact'), label: t('nav.contact', locale) },
];
---
<header class="nav">
  <div class="container nav__inner">
    <a class="nav__brand" href={`/${locale}`}>aselovers</a>
    <nav class="nav__links" aria-label="Primary">
      {links.map((l) => <a href={l.href}>{l.label}</a>)}
    </nav>
    <a class="nav__lang" href={other} aria-label={locale === 'tr' ? 'English' : 'Türkçe'}>{locale === 'tr' ? 'EN' : 'TR'}</a>
  </div>
</header>
<style>
  .nav { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
  .nav__inner { display: flex; align-items: center; gap: var(--space-5); height: 68px; }
  .nav__brand { font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; letter-spacing: .01em; }
  .nav__links { display: flex; gap: var(--space-5); margin-left: auto; }
  .nav__links a { font-size: .95rem; color: var(--muted); transition: color var(--dur) var(--ease); }
  .nav__links a:hover { color: var(--ink); }
  .nav__lang { font-size: .8rem; letter-spacing: .1em; padding: 6px 12px; border: 1px solid var(--line); border-radius: var(--radius-pill); transition: border-color var(--dur) var(--ease), color var(--dur) var(--ease); }
  .nav__lang:hover { border-color: var(--accent); color: var(--accent); }
  @media (max-width: 640px) {
    .nav__links { display: none; }
    .nav__inner { gap: var(--space-3); }
  }
</style>
```

- [ ] **Step 6: Write `src/components/Footer.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
const { locale } = Astro.props as { locale: Locale };
const p = (tr: string, en: string) => (locale === 'tr' ? `/tr/${tr}` : `/en/${en}`);
const year = new Date().getFullYear();
---
<footer class="foot">
  <div class="container foot__inner">
    <div class="foot__brand">
      <span class="foot__logo">aselovers</span>
      <p class="foot__tag">{t('footer.tagline', locale)}</p>
    </div>
    <nav class="foot__col" aria-label={t('footer.shop', locale)}>
      <h4>{t('footer.shop', locale)}</h4>
      <a href={p('urunler', 'products')}>{t('nav.products', locale)}</a>
      <a href={p('hakkimizda', 'about')}>{t('footer.about', locale)}</a>
      <a href={p('iletisim', 'contact')}>{t('nav.contact', locale)}</a>
    </nav>
    <div class="foot__col">
      <h4>{t('footer.follow', locale)}</h4>
      <a href="https://www.etsy.com/shop/aselovers" target="_blank" rel="noopener">Etsy</a>
      <a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a>
    </div>
  </div>
  <div class="container foot__base"><p>© {year} Aselovers — {t('footer.rights', locale)}</p></div>
</footer>
<style>
  .foot { background: var(--footer-bg); color: var(--footer-fg); margin-top: var(--space-8); padding: var(--space-7) 0 var(--space-5); }
  .foot__inner { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--space-6); }
  .foot__logo { font-family: var(--font-display); font-size: 1.6rem; font-weight: 600; }
  .foot__tag { color: color-mix(in srgb, var(--footer-fg) 72%, transparent); max-width: 34ch; margin-top: var(--space-3); }
  .foot__col h4 { font-family: var(--font-body); font-size: var(--step-small); letter-spacing: .12em; text-transform: uppercase; color: color-mix(in srgb, var(--footer-fg) 65%, transparent); margin-bottom: var(--space-3); }
  .foot__col a { display: block; color: var(--footer-fg); padding: 4px 0; transition: color var(--dur) var(--ease); }
  .foot__col a:hover { color: var(--accent); }
  .foot__base { border-top: 1px solid color-mix(in srgb, var(--footer-fg) 18%, transparent); margin-top: var(--space-6); padding-top: var(--space-4); }
  .foot__base p { font-size: var(--step-small); color: color-mix(in srgb, var(--footer-fg) 60%, transparent); margin: 0; }
  @media (max-width: 640px) { .foot__inner { grid-template-columns: 1fr; gap: var(--space-5); } }
</style>
```

- [ ] **Step 7: Commit**

```
git add src/components/Nav.astro src/components/Footer.astro src/lib/i18n.ts src/lib/i18n.test.ts
git commit -m "feat(design): editorial nav and footer + i18n strings"
```

---

### Task 3: UI primitives — Button, Badge, SectionHeading, ProductCard

**Files:**
- Create: `src/components/Button.astro`
- Create: `src/components/Badge.astro`
- Create: `src/components/SectionHeading.astro`
- Create: `src/components/ProductCard.astro` (overwrite)

**Interfaces:**
- Consumes: `localizedTitle`, `productSlug`, `type Product` (`@lib/products`), `type Locale` (`@lib/i18n`).
- Produces:
  - `Button.astro` props `{ href: string; variant?: 'primary'|'outline'; external?: boolean }`, label via slot.
  - `Badge.astro` — label via slot.
  - `SectionHeading.astro` props `{ eyebrow?: string; title: string }`.
  - `ProductCard.astro` props `{ product: Product; locale: Locale }`.

- [ ] **Step 1: Write `src/components/Button.astro`**

```astro
---
interface Props { href: string; variant?: 'primary' | 'outline'; external?: boolean; }
const { href, variant = 'primary', external = false } = Astro.props;
const rel = external ? 'noopener' : undefined;
const target = external ? '_blank' : undefined;
---
<a class={`btn btn--${variant}`} href={href} target={target} rel={rel}><slot /></a>
<style>
  .btn { display: inline-block; font-size: .95rem; font-weight: 500; letter-spacing: .02em; padding: 13px 26px; border-radius: var(--radius-pill); transition: transform var(--dur) var(--ease), background var(--dur) var(--ease), color var(--dur) var(--ease); }
  .btn:hover { transform: translateY(-2px); }
  .btn--primary { background: var(--accent); color: #fff; }
  .btn--primary:hover { background: var(--accent-ink); }
  .btn--outline { border: 1px solid var(--ink); color: var(--ink); }
  .btn--outline:hover { background: var(--ink); color: var(--bg); }
</style>
```

- [ ] **Step 2: Write `src/components/Badge.astro`**

```astro
---
---
<span class="badge"><slot /></span>
<style>
  .badge { display: inline-flex; align-items: center; gap: 6px; font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-ink); background: color-mix(in srgb, var(--accent) 14%, transparent); padding: 5px 12px; border-radius: var(--radius-pill); }
</style>
```

- [ ] **Step 3: Write `src/components/SectionHeading.astro`**

```astro
---
interface Props { eyebrow?: string; title: string; }
const { eyebrow, title } = Astro.props;
---
<div class="sh">
  {eyebrow && <p class="eyebrow">{eyebrow}</p>}
  <h2>{title}</h2>
</div>
<style>
  .sh { margin-bottom: var(--space-6); max-width: 40ch; }
</style>
```

- [ ] **Step 4: Write `src/components/ProductCard.astro`**

```astro
---
import { type Locale } from '@lib/i18n';
import { localizedTitle, productSlug, type Product } from '@lib/products';
const { product, locale } = Astro.props as { product: Product; locale: Locale };
const title = localizedTitle(product, locale);
const href = locale === 'tr'
  ? `/tr/urun/${productSlug(product, 'tr')}`
  : `/en/product/${productSlug(product, 'en')}`;
const price = new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: product.currency }).format(product.price);
---
<a class="card" href={href}>
  <div class="card__media">
    {product.image && <img src={product.image} alt={title} loading="lazy" />}
    {product.isNew && <span class="card__new">{locale === 'tr' ? 'Yeni' : 'New'}</span>}
  </div>
  <h3 class="card__title">{title}</h3>
  <span class="card__price">{price}</span>
</a>
<style>
  .card { display: block; transition: transform var(--dur) var(--ease); }
  .card:hover { transform: translateY(-4px); }
  .card__media { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--radius); background: var(--section); }
  .card__media img { width: 100%; height: 100%; object-fit: cover; transition: transform 600ms var(--ease); }
  .card:hover .card__media img { transform: scale(1.04); }
  .card__new { position: absolute; top: var(--space-3); left: var(--space-3); font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; background: var(--surface); color: var(--ink); padding: 4px 10px; border-radius: var(--radius-pill); }
  .card__title { font-size: 1.05rem; margin: var(--space-3) 0 var(--space-1); line-height: 1.3; }
  .card__price { font-family: var(--font-body); color: var(--muted); }
</style>
```

- [ ] **Step 5: Build & test**

Run: `npm test` → Expected: still passing (no lib change).
Run: `npm run build` → these components compile (unused-until-Task-4 is fine). A transient break on not-yet-migrated pages is acceptable per Task 1 note; confirm the four new components parse.

- [ ] **Step 6: Commit**

```
git add src/components/Button.astro src/components/Badge.astro src/components/SectionHeading.astro src/components/ProductCard.astro
git commit -m "feat(design): button, badge, section heading, product card primitives"
```

---

### Task 4: Home page — hero + sections

**Files:**
- Create: `src/components/home/Hero.astro`
- Create: `src/components/home/FeaturedProducts.astro`
- Create: `src/components/home/StoryStrip.astro`
- Create: `src/components/home/Categories.astro`
- Create: `src/components/home/TrustBar.astro`
- Create: `src/components/home/NewsletterCta.astro`
- Modify: `src/lib/i18n.ts` + `src/lib/i18n.test.ts` (home strings)
- Create: `src/pages/tr/index.astro` (overwrite), `src/pages/en/index.astro` (overwrite)

**Interfaces:**
- Consumes: `Base.astro`, `Nav.astro`, `Footer.astro`, `Button.astro`, `SectionHeading.astro`, `ProductCard.astro`, `Badge.astro`; `loadProducts` (`@lib/products`), `t` (`@lib/i18n`).
- Produces: the two localized home pages.

- [ ] **Step 1: Add home strings — failing test**

Append to `src/lib/i18n.test.ts`:
```ts
  it('has home strings', () => {
    expect(t('home.heroTitle', 'en')).toBe('Handmade amigurumi, made to be loved');
    expect(t('home.featured', 'tr')).toBe('Öne Çıkanlar');
    expect(t('home.newsletterCta', 'en')).toBe('Join the list');
  });
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test` → FAIL (keys missing).

- [ ] **Step 3: Add home strings to `src/lib/i18n.ts`** (both locales)

```ts
// tr:
'home.heroEyebrow': 'El Yapımı Amigurumi',
'home.heroTitle': 'Sevgiyle örülmüş, sevilmek için yapılmış',
'home.heroSub': 'Her biri tek tek elde örülen, premium ipliklerle hazırlanan amigurumi oyuncaklar ve aksesuarlar.',
'home.heroCtaPrimary': 'Koleksiyonu Keşfet',
'home.heroCtaSecondary': 'Hikâyemiz',
'home.featured': 'Öne Çıkanlar',
'home.featuredEyebrow': 'Seçkiler',
'home.storyTitle': 'Her ilmek elde, sevgiyle',
'home.storyBody': 'Aselovers, her parçayı tek tek örerek anlam katan küçük bir atölye. Kaliteli iplik, sabırlı işçilik ve özenli detaylar.',
'home.storyCta': 'Hakkımızda',
'home.categories': 'Koleksiyonlar',
'home.trustHandmade': 'El Yapımı',
'home.trustHandmadeSub': 'Her parça tek tek örülür',
'home.trustShip': 'Özenli Kargo',
'home.trustShipSub': 'Türkiye ve ABD’ye gönderim',
'home.trustEtsy': 'Etsy’de Değerli',
'home.trustEtsySub': 'Yüzlerce mutlu müşteri',
'home.newsletterTitle': 'Yeni koleksiyonlardan ilk sen haberdar ol',
'home.newsletterCta': 'Listeye Katıl',
'home.newsletterPlaceholder': 'E-posta adresin',
// en:
'home.heroEyebrow': 'Handmade Amigurumi',
'home.heroTitle': 'Handmade amigurumi, made to be loved',
'home.heroSub': 'Individually crocheted toys and accessories, made with premium yarn and patient hands.',
'home.heroCtaPrimary': 'Explore the collection',
'home.heroCtaSecondary': 'Our story',
'home.featured': 'Featured',
'home.featuredEyebrow': 'Selects',
'home.storyTitle': 'Every stitch by hand, with love',
'home.storyBody': 'Aselovers is a small studio that gives meaning to each piece by crocheting it one at a time — quality yarn, patient craft, careful detail.',
'home.storyCta': 'About us',
'home.categories': 'Collections',
'home.trustHandmade': 'Handmade',
'home.trustHandmadeSub': 'Each piece crocheted by hand',
'home.trustShip': 'Careful shipping',
'home.trustShipSub': 'Ships to Turkey and the US',
'home.trustEtsy': 'Loved on Etsy',
'home.trustEtsySub': 'Hundreds of happy customers',
'home.newsletterTitle': 'Be first to see new collections',
'home.newsletterCta': 'Join the list',
'home.newsletterPlaceholder': 'Your email address',
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test` → PASS.

- [ ] **Step 5: Write `src/components/home/Hero.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadProducts, localizedTitle } from '@lib/products';
import Button from '../Button.astro';
const { locale } = Astro.props as { locale: Locale };
const p = (tr: string, en: string) => (locale === 'tr' ? `/tr/${tr}` : `/en/${en}`);
const imgs = loadProducts().filter((x) => x.image).slice(0, 3);
---
<section class="hero">
  <div class="container hero__inner">
    <div class="hero__copy">
      <p class="eyebrow">{t('home.heroEyebrow', locale)}</p>
      <h1>{t('home.heroTitle', locale)}</h1>
      <p class="hero__sub">{t('home.heroSub', locale)}</p>
      <div class="hero__cta">
        <Button href={p('urunler', 'products')} variant="primary">{t('home.heroCtaPrimary', locale)}</Button>
        <Button href={p('hakkimizda', 'about')} variant="outline">{t('home.heroCtaSecondary', locale)}</Button>
      </div>
    </div>
    <div class="hero__grid">
      {imgs.map((x, i) => (
        <div class={`hero__cell hero__cell--${i}`}>
          <img src={x.image} alt={localizedTitle(x, locale)} loading="eager" />
        </div>
      ))}
    </div>
  </div>
</section>
<style>
  .hero { padding: var(--space-8) 0; }
  .hero__inner { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-7); align-items: center; }
  .hero__sub { font-size: 1.1rem; color: var(--muted); max-width: 42ch; }
  .hero__cta { display: flex; gap: var(--space-3); margin-top: var(--space-5); flex-wrap: wrap; }
  .hero__grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(2, 200px); gap: var(--space-3); }
  .hero__cell { overflow: hidden; border-radius: var(--radius); background: var(--section); }
  .hero__cell img { width: 100%; height: 100%; object-fit: cover; }
  .hero__cell--0 { grid-row: 1 / span 2; }
  @media (max-width: 900px) { .hero__inner { grid-template-columns: 1fr; } .hero__grid { grid-template-rows: repeat(2, 160px); } }
</style>
```

- [ ] **Step 6: Write `src/components/home/FeaturedProducts.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadProducts } from '@lib/products';
import SectionHeading from '../SectionHeading.astro';
import ProductCard from '../ProductCard.astro';
const { locale } = Astro.props as { locale: Locale };
const products = loadProducts().slice(0, 8);
---
<section class="section">
  <div class="container">
    <SectionHeading eyebrow={t('home.featuredEyebrow', locale)} title={t('home.featured', locale)} />
    <div class="grid">
      {products.map((p) => <ProductCard product={p} locale={locale} />)}
    </div>
  </div>
</section>
<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-6) var(--space-5); }
</style>
```

- [ ] **Step 7: Write `src/components/home/StoryStrip.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadProducts, localizedTitle } from '@lib/products';
import Button from '../Button.astro';
const { locale } = Astro.props as { locale: Locale };
const p = (tr: string, en: string) => (locale === 'tr' ? `/tr/${tr}` : `/en/${en}`);
const img = loadProducts().find((x) => x.image);
---
<section class="section section--tint">
  <div class="container story">
    <div class="story__media">{img && <img src={img.image} alt={localizedTitle(img, locale)} loading="lazy" />}</div>
    <div class="story__copy">
      <h2>{t('home.storyTitle', locale)}</h2>
      <p class="prose">{t('home.storyBody', locale)}</p>
      <Button href={p('hakkimizda', 'about')} variant="outline">{t('home.storyCta', locale)}</Button>
    </div>
  </div>
</section>
<style>
  .story { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-7); align-items: center; }
  .story__media { aspect-ratio: 5 / 4; overflow: hidden; border-radius: var(--radius); }
  .story__media img { width: 100%; height: 100%; object-fit: cover; }
  @media (max-width: 900px) { .story { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 8: Write `src/components/home/Categories.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadProducts, localizedTitle } from '@lib/products';
import SectionHeading from '../SectionHeading.astro';
const { locale } = Astro.props as { locale: Locale };
const products = loadProducts();
const catLabel: Record<string, { tr: string; en: string }> = {
  amigurumi: { tr: 'Amigurumi', en: 'Amigurumi' },
  bag: { tr: 'Çanta', en: 'Bags' },
  accessory: { tr: 'Aksesuar', en: 'Accessories' },
  decor: { tr: 'Dekor', en: 'Decor' },
};
const cats = [...new Set(products.map((p) => p.category))].map((c) => {
  const sample = products.find((p) => p.category === c && p.image);
  return { c, label: (catLabel[c] ?? { tr: c, en: c })[locale], img: sample?.image, alt: sample ? localizedTitle(sample, locale) : c };
});
const catalog = locale === 'tr' ? '/tr/urunler' : '/en/products';
---
<section class="section">
  <div class="container">
    <SectionHeading title={t('home.categories', locale)} />
    <div class="cats">
      {cats.map((cat) => (
        <a class="cat" href={`${catalog}?cat=${cat.c}`}>
          <div class="cat__media">{cat.img && <img src={cat.img} alt={cat.alt} loading="lazy" />}</div>
          <span class="cat__label">{cat.label}</span>
        </a>
      ))}
    </div>
  </div>
</section>
<style>
  .cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-5); }
  .cat { display: block; }
  .cat__media { aspect-ratio: 1 / 1; overflow: hidden; border-radius: var(--radius); background: var(--section); }
  .cat__media img { width: 100%; height: 100%; object-fit: cover; transition: transform 600ms var(--ease); }
  .cat:hover .cat__media img { transform: scale(1.05); }
  .cat__label { display: block; font-family: var(--font-display); font-size: 1.2rem; margin-top: var(--space-3); }
</style>
```

- [ ] **Step 9: Write `src/components/home/TrustBar.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
const { locale } = Astro.props as { locale: Locale };
const items = [
  { t: t('home.trustHandmade', locale), s: t('home.trustHandmadeSub', locale) },
  { t: t('home.trustShip', locale), s: t('home.trustShipSub', locale) },
  { t: t('home.trustEtsy', locale), s: t('home.trustEtsySub', locale) },
];
---
<section class="section section--tint">
  <div class="container trust">
    {items.map((i) => (
      <div class="trust__item">
        <h4>{i.t}</h4>
        <p>{i.s}</p>
      </div>
    ))}
  </div>
</section>
<style>
  .trust { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-6); text-align: center; }
  .trust__item h4 { font-family: var(--font-display); font-size: 1.3rem; margin-bottom: var(--space-1); }
  .trust__item p { color: var(--muted); margin: 0; }
  @media (max-width: 640px) { .trust { grid-template-columns: 1fr; gap: var(--space-5); } }
</style>
```

- [ ] **Step 10: Write `src/components/home/NewsletterCta.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
const { locale } = Astro.props as { locale: Locale };
---
<section class="section">
  <div class="container news">
    <h2>{t('home.newsletterTitle', locale)}</h2>
    <form class="news__form" onsubmit="return false;">
      <input type="email" required placeholder={t('home.newsletterPlaceholder', locale)} aria-label={t('home.newsletterPlaceholder', locale)} />
      <button type="submit">{t('home.newsletterCta', locale)}</button>
    </form>
  </div>
</section>
<style>
  .news { text-align: center; max-width: 620px; }
  .container.news { margin: 0 auto; }
  .news__form { display: flex; gap: var(--space-2); justify-content: center; margin-top: var(--space-4); flex-wrap: wrap; }
  .news__form input { flex: 1; min-width: 220px; padding: 13px 18px; border: 1px solid var(--line); border-radius: var(--radius-pill); font: inherit; background: var(--surface); }
  .news__form input:focus-visible { border-color: var(--accent); }
  .news__form button { padding: 13px 26px; border: none; border-radius: var(--radius-pill); background: var(--accent); color: #fff; font: inherit; font-weight: 500; cursor: pointer; transition: background var(--dur) var(--ease); }
  .news__form button:hover { background: var(--accent-ink); }
</style>
```

> NOTE: the newsletter form is presentational (Phase 3 wires the real subscribe endpoint). `onsubmit="return false;"` prevents navigation.

- [ ] **Step 11: Write `src/pages/tr/index.astro` (overwrite)**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import Hero from '../../components/home/Hero.astro';
import FeaturedProducts from '../../components/home/FeaturedProducts.astro';
import StoryStrip from '../../components/home/StoryStrip.astro';
import Categories from '../../components/home/Categories.astro';
import TrustBar from '../../components/home/TrustBar.astro';
import NewsletterCta from '../../components/home/NewsletterCta.astro';
---
<Base locale="tr" title="Aselovers — El Yapımı Amigurumi"
  description="Sevgiyle örülmüş, premium el yapımı amigurumi oyuncaklar ve aksesuarlar."
  pathSelf="" pathsAlt={{ tr: '', en: '' }}>
  <Nav locale="tr" />
  <main>
    <Hero locale="tr" />
    <FeaturedProducts locale="tr" />
    <StoryStrip locale="tr" />
    <Categories locale="tr" />
    <TrustBar locale="tr" />
    <NewsletterCta locale="tr" />
  </main>
  <Footer locale="tr" />
</Base>
```

- [ ] **Step 12: Write `src/pages/en/index.astro` (overwrite)**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import Hero from '../../components/home/Hero.astro';
import FeaturedProducts from '../../components/home/FeaturedProducts.astro';
import StoryStrip from '../../components/home/StoryStrip.astro';
import Categories from '../../components/home/Categories.astro';
import TrustBar from '../../components/home/TrustBar.astro';
import NewsletterCta from '../../components/home/NewsletterCta.astro';
---
<Base locale="en" title="Aselovers — Handmade Amigurumi"
  description="Lovingly crocheted, premium handmade amigurumi toys and accessories."
  pathSelf="" pathsAlt={{ tr: '', en: '' }}>
  <Nav locale="en" />
  <main>
    <Hero locale="en" />
    <FeaturedProducts locale="en" />
    <StoryStrip locale="en" />
    <Categories locale="en" />
    <TrustBar locale="en" />
    <NewsletterCta locale="en" />
  </main>
  <Footer locale="en" />
</Base>
```

- [ ] **Step 13: Build, test, preview**

Run: `npm test` → PASS.
Run: `npm run build` → PASS; `dist/tr/index.html` and `dist/en/index.html` exist.
Preview: `npm run dev`, open `http://localhost:4321/tr/` — confirm hero, featured grid, story, categories, trust, newsletter all render with the editorial styling (screenshot).

- [ ] **Step 14: Commit**

```
git add src/components/home src/pages/tr/index.astro src/pages/en/index.astro src/lib/i18n.ts src/lib/i18n.test.ts
git commit -m "feat(design): premium editorial home page"
```

---

### Task 5: Catalog page + category filter

**Files:**
- Create: `src/lib/catalog.ts`
- Create: `src/lib/catalog.test.ts`
- Create: `src/pages/tr/urunler.astro` (overwrite), `src/pages/en/products.astro` (overwrite)

**Interfaces:**
- Consumes: `loadProducts`, `type Product` (`@lib/products`).
- Produces: `filterByCategory(products: Product[], cat: string | null): Product[]` — returns all when `cat` is null/empty/'all', else those whose `category === cat`.

- [ ] **Step 1: Write failing test — `src/lib/catalog.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { filterByCategory } from '@lib/catalog';
import type { Product } from '@lib/products';

const mk = (id: string, category: string): Product => ({
  id, title_en: id, title_tr: id, description_en: '', description_tr: '',
  price: 1, currency: 'TRY', image: null, url: '', category, tags: [], isNew: false, isActive: true,
});
const list = [mk('1', 'amigurumi'), mk('2', 'bag'), mk('3', 'amigurumi')];

describe('filterByCategory', () => {
  it('returns all when cat is null', () => expect(filterByCategory(list, null)).toHaveLength(3));
  it('returns all when cat is "all"', () => expect(filterByCategory(list, 'all')).toHaveLength(3));
  it('filters by category', () => {
    const r = filterByCategory(list, 'amigurumi');
    expect(r.map((p) => p.id)).toEqual(['1', '3']);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test` → FAIL (cannot resolve `@lib/catalog`).

- [ ] **Step 3: Write `src/lib/catalog.ts`**

```ts
import type { Product } from './products';

export function filterByCategory(products: Product[], cat: string | null): Product[] {
  if (!cat || cat === 'all') return products;
  return products.filter((p) => p.category === cat);
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test` → PASS.

- [ ] **Step 5: Write `src/pages/tr/urunler.astro` (overwrite)**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import SectionHeading from '../../components/SectionHeading.astro';
import ProductCard from '../../components/ProductCard.astro';
import { loadProducts } from '@lib/products';
const products = loadProducts();
const cats = ['all', ...new Set(products.map((p) => p.category))];
const catLabel: Record<string, string> = { all: 'Tümü', amigurumi: 'Amigurumi', bag: 'Çanta', accessory: 'Aksesuar', decor: 'Dekor' };
---
<Base locale="tr" title="Ürünler — Aselovers"
  description="El yapımı amigurumi ürün koleksiyonu — oyuncaklar, çantalar, aksesuarlar."
  pathSelf="urunler" pathsAlt={{ tr: 'urunler', en: 'products' }}>
  <Nav locale="tr" />
  <main>
    <section class="section">
      <div class="container">
        <SectionHeading eyebrow="Koleksiyon" title="Ürünler" />
        <div class="filters" role="tablist">
          {cats.map((c) => <button class="filter" data-cat={c}>{catLabel[c] ?? c}</button>)}
        </div>
        <div class="grid" id="grid">
          {products.map((p) => <div class="grid__item" data-cat={p.category}><ProductCard product={p} locale="tr" /></div>)}
        </div>
      </div>
    </section>
  </main>
  <Footer locale="tr" />
  <style>
    .filters { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-6); }
    .filter { font: inherit; font-size: .9rem; padding: 8px 18px; border: 1px solid var(--line); background: var(--surface); border-radius: var(--radius-pill); cursor: pointer; transition: all var(--dur) var(--ease); }
    .filter:hover { border-color: var(--accent); color: var(--accent); }
    .filter[aria-selected="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-6) var(--space-5); }
    .grid__item[hidden] { display: none; }
  </style>
  <script>
    const params = new URLSearchParams(location.search);
    const initial = params.get('cat') || 'all';
    const filters = Array.from(document.querySelectorAll<HTMLButtonElement>('.filter'));
    const items = Array.from(document.querySelectorAll<HTMLElement>('.grid__item'));
    function apply(cat: string) {
      filters.forEach((f) => f.setAttribute('aria-selected', String(f.dataset.cat === cat)));
      items.forEach((it) => { it.hidden = !(cat === 'all' || it.dataset.cat === cat); });
    }
    filters.forEach((f) => f.addEventListener('click', () => apply(f.dataset.cat!)));
    apply(initial);
  </script>
</Base>
```

- [ ] **Step 6: Write `src/pages/en/products.astro` (overwrite)**

Same as Step 5 but locale `en`, catalog strings in English, `pathSelf="products"`, and `catLabel = { all: 'All', amigurumi: 'Amigurumi', bag: 'Bags', accessory: 'Accessories', decor: 'Decor' }`, heading eyebrow "Collection" title "Products", and `<ProductCard ... locale="en" />`. Reuse the identical `<style>` and `<script>` blocks from Step 5 verbatim.

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import SectionHeading from '../../components/SectionHeading.astro';
import ProductCard from '../../components/ProductCard.astro';
import { loadProducts } from '@lib/products';
const products = loadProducts();
const cats = ['all', ...new Set(products.map((p) => p.category))];
const catLabel: Record<string, string> = { all: 'All', amigurumi: 'Amigurumi', bag: 'Bags', accessory: 'Accessories', decor: 'Decor' };
---
<Base locale="en" title="Products — Aselovers"
  description="The handmade amigurumi collection — toys, bags, and accessories."
  pathSelf="products" pathsAlt={{ tr: 'urunler', en: 'products' }}>
  <Nav locale="en" />
  <main>
    <section class="section">
      <div class="container">
        <SectionHeading eyebrow="Collection" title="Products" />
        <div class="filters" role="tablist">
          {cats.map((c) => <button class="filter" data-cat={c}>{catLabel[c] ?? c}</button>)}
        </div>
        <div class="grid" id="grid">
          {products.map((p) => <div class="grid__item" data-cat={p.category}><ProductCard product={p} locale="en" /></div>)}
        </div>
      </div>
    </section>
  </main>
  <Footer locale="en" />
  <style>
    .filters { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-6); }
    .filter { font: inherit; font-size: .9rem; padding: 8px 18px; border: 1px solid var(--line); background: var(--surface); border-radius: var(--radius-pill); cursor: pointer; transition: all var(--dur) var(--ease); }
    .filter:hover { border-color: var(--accent); color: var(--accent); }
    .filter[aria-selected="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-6) var(--space-5); }
    .grid__item[hidden] { display: none; }
  </style>
  <script>
    const params = new URLSearchParams(location.search);
    const initial = params.get('cat') || 'all';
    const filters = Array.from(document.querySelectorAll<HTMLButtonElement>('.filter'));
    const items = Array.from(document.querySelectorAll<HTMLElement>('.grid__item'));
    function apply(cat: string) {
      filters.forEach((f) => f.setAttribute('aria-selected', String(f.dataset.cat === cat)));
      items.forEach((it) => { it.hidden = !(cat === 'all' || it.dataset.cat === cat); });
    }
    filters.forEach((f) => f.addEventListener('click', () => apply(f.dataset.cat!)));
    apply(initial);
  </script>
</Base>
```

> NOTE: `filterByCategory` (from `@lib/catalog`) is the tested source of truth for the filter rule; the inline client script mirrors it (`cat === 'all' || item === cat`) for progressive enhancement without a round-trip. Keep the two rules identical.

- [ ] **Step 7: Build, test, preview**

Run: `npm test` → PASS. Run: `npm run build` → PASS. Preview `/tr/urunler` — grid renders, clicking a filter chip narrows the grid; `?cat=amigurumi` pre-selects.

- [ ] **Step 8: Commit**

```
git add src/lib/catalog.ts src/lib/catalog.test.ts src/pages/tr/urunler.astro src/pages/en/products.astro
git commit -m "feat(design): editorial catalog with category filter"
```

---

### Task 6: Product detail page + JSON-LD

**Files:**
- Create: `src/lib/jsonld.ts`
- Create: `src/lib/jsonld.test.ts`
- Create: `src/pages/tr/urun/[slug].astro` (overwrite), `src/pages/en/product/[slug].astro` (overwrite)

**Interfaces:**
- Consumes: `type Product`, `localizedTitle`, `productSlug`, `loadProducts` (`@lib/products`), `type Locale` (`@lib/i18n`).
- Produces: `productJsonLd(product: Product, locale: Locale, url: string): string` — a JSON string of a schema.org Product with name, image, description, offers (price, priceCurrency, url, availability InStock).

- [ ] **Step 1: Write failing test — `src/lib/jsonld.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { productJsonLd } from '@lib/jsonld';
import type { Product } from '@lib/products';

const p: Product = {
  id: '9', title_en: 'Bunny', title_tr: 'Tavşan', description_en: 'A bunny', description_tr: 'Bir tavşan',
  price: 1912.5, currency: 'TRY', image: 'https://img/x.jpg', url: 'https://etsy/9', category: 'amigurumi', tags: [], isNew: true, isActive: true,
};

describe('productJsonLd', () => {
  const obj = JSON.parse(productJsonLd(p, 'en', 'https://aseloves.com/en/product/bunny-9'));
  it('is a schema.org Product', () => {
    expect(obj['@context']).toBe('https://schema.org');
    expect(obj['@type']).toBe('Product');
    expect(obj.name).toBe('Bunny');
  });
  it('has a correct offer', () => {
    expect(obj.offers['@type']).toBe('Offer');
    expect(obj.offers.price).toBe('1912.50');
    expect(obj.offers.priceCurrency).toBe('TRY');
    expect(obj.offers.availability).toBe('https://schema.org/InStock');
    expect(obj.offers.url).toBe('https://etsy/9');
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test` → FAIL (cannot resolve `@lib/jsonld`).

- [ ] **Step 3: Write `src/lib/jsonld.ts`**

```ts
import type { Product } from './products';
import { localizedTitle } from './products';
import type { Locale } from './i18n';

export function productJsonLd(product: Product, locale: Locale, url: string): string {
  const desc = locale === 'tr' ? product.description_tr : product.description_en;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: localizedTitle(product, locale),
    image: product.image ? [product.image] : [],
    description: desc,
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: product.currency,
      url: product.url,
      availability: 'https://schema.org/InStock',
    },
  };
  return JSON.stringify(data);
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test` → PASS.

- [ ] **Step 5: Write `src/pages/tr/urun/[slug].astro` (overwrite)**

```astro
---
import Base from '../../../layouts/Base.astro';
import Nav from '../../../components/Nav.astro';
import Footer from '../../../components/Footer.astro';
import Button from '../../../components/Button.astro';
import Badge from '../../../components/Badge.astro';
import ProductCard from '../../../components/ProductCard.astro';
import { loadProducts, localizedTitle, productSlug, type Product } from '@lib/products';
import { productJsonLd } from '@lib/jsonld';

export function getStaticPaths() {
  return loadProducts().map((p) => ({ params: { slug: productSlug(p, 'tr') }, props: { product: p } }));
}
const { product } = Astro.props as { product: Product };
const site = Astro.site!.toString().replace(/\/+$/, '');
const selfPath = `urun/${productSlug(product, 'tr')}`;
const enSlug = productSlug(product, 'en');
const title = localizedTitle(product, 'tr');
const price = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: product.currency }).format(product.price);
const related = loadProducts().filter((x) => x.category === product.category && x.id !== product.id).slice(0, 4);
const ld = productJsonLd(product, 'tr', `${site}/tr/${selfPath}`);
---
<Base locale="tr" title={`${title} — Aselovers`} description={product.description_tr || title}
  pathSelf={selfPath} pathsAlt={{ tr: selfPath, en: `product/${enSlug}` }} ogImage={product.image ?? undefined}>
  <Fragment slot="head"><script type="application/ld+json" set:html={ld} /></Fragment>
  <Nav locale="tr" />
  <main>
    <section class="section">
      <div class="container detail">
        <div class="detail__media">{product.image && <img src={product.image} alt={title} />}</div>
        <div class="detail__info">
          {product.isNew && <Badge>Yeni</Badge>}
          <h1>{title}</h1>
          <p class="detail__price">{price}</p>
          <p class="prose">{product.description_tr}</p>
          <Button href={product.url} variant="primary" external>Etsy'de Satın Al</Button>
          <div class="detail__ship">
            <h4>Kargo</h4>
            <p>Türkiye ve ABD'ye özenli gönderim. Her ürün siparişten sonra elde örülür.</p>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <div class="container detail__related">
          <h2>Benzer Ürünler</h2>
          <div class="grid">{related.map((r) => <ProductCard product={r} locale="tr" />)}</div>
        </div>
      )}
    </section>
  </main>
  <Footer locale="tr" />
  <style>
    .detail { display: grid; grid-template-columns: 1.1fr 1fr; gap: var(--space-7); align-items: start; }
    .detail__media { aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--radius); background: var(--section); position: sticky; top: 92px; }
    .detail__media img { width: 100%; height: 100%; object-fit: cover; }
    .detail__price { font-family: var(--font-display); font-size: 1.6rem; color: var(--accent-ink); margin: var(--space-3) 0 var(--space-4); }
    .detail__ship { border-top: 1px solid var(--line); margin-top: var(--space-6); padding-top: var(--space-4); }
    .detail__ship h4 { font-family: var(--font-body); font-size: var(--step-small); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: var(--space-2); }
    .detail__ship p { color: var(--muted); margin: 0; }
    .detail__related { margin-top: var(--space-8); }
    .detail__related .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-5); }
    @media (max-width: 900px) { .detail { grid-template-columns: 1fr; } .detail__media { position: static; } }
  </style>
</Base>
```

- [ ] **Step 6: Write `src/pages/en/product/[slug].astro` (overwrite)**

Identical to Step 5 with locale `en`: `getStaticPaths` uses `productSlug(p,'en')`; `selfPath = product/${productSlug(product,'en')}`; `trSlug = productSlug(product,'tr')`; `pathsAlt={{ tr: `urun/${trSlug}`, en: selfPath }}`; English strings — Badge "New", price `Intl.NumberFormat('en-US', ...)`, Buy button "Buy on Etsy", ship heading "Shipping" body "Carefully shipped to Turkey and the US. Each item is crocheted to order.", related heading "You may also like". Reuse the identical `<style>` block verbatim.

```astro
---
import Base from '../../../layouts/Base.astro';
import Nav from '../../../components/Nav.astro';
import Footer from '../../../components/Footer.astro';
import Button from '../../../components/Button.astro';
import Badge from '../../../components/Badge.astro';
import ProductCard from '../../../components/ProductCard.astro';
import { loadProducts, localizedTitle, productSlug, type Product } from '@lib/products';
import { productJsonLd } from '@lib/jsonld';

export function getStaticPaths() {
  return loadProducts().map((p) => ({ params: { slug: productSlug(p, 'en') }, props: { product: p } }));
}
const { product } = Astro.props as { product: Product };
const site = Astro.site!.toString().replace(/\/+$/, '');
const selfPath = `product/${productSlug(product, 'en')}`;
const trSlug = productSlug(product, 'tr');
const title = localizedTitle(product, 'en');
const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price);
const related = loadProducts().filter((x) => x.category === product.category && x.id !== product.id).slice(0, 4);
const ld = productJsonLd(product, 'en', `${site}/en/${selfPath}`);
---
<Base locale="en" title={`${title} — Aselovers`} description={product.description_en || title}
  pathSelf={selfPath} pathsAlt={{ tr: `urun/${trSlug}`, en: selfPath }} ogImage={product.image ?? undefined}>
  <Fragment slot="head"><script type="application/ld+json" set:html={ld} /></Fragment>
  <Nav locale="en" />
  <main>
    <section class="section">
      <div class="container detail">
        <div class="detail__media">{product.image && <img src={product.image} alt={title} />}</div>
        <div class="detail__info">
          {product.isNew && <Badge>New</Badge>}
          <h1>{title}</h1>
          <p class="detail__price">{price}</p>
          <p class="prose">{product.description_en}</p>
          <Button href={product.url} variant="primary" external>Buy on Etsy</Button>
          <div class="detail__ship">
            <h4>Shipping</h4>
            <p>Carefully shipped to Turkey and the US. Each item is crocheted to order.</p>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <div class="container detail__related">
          <h2>You may also like</h2>
          <div class="grid">{related.map((r) => <ProductCard product={r} locale="en" />)}</div>
        </div>
      )}
    </section>
  </main>
  <Footer locale="en" />
  <style>
    .detail { display: grid; grid-template-columns: 1.1fr 1fr; gap: var(--space-7); align-items: start; }
    .detail__media { aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--radius); background: var(--section); position: sticky; top: 92px; }
    .detail__media img { width: 100%; height: 100%; object-fit: cover; }
    .detail__price { font-family: var(--font-display); font-size: 1.6rem; color: var(--accent-ink); margin: var(--space-3) 0 var(--space-4); }
    .detail__ship { border-top: 1px solid var(--line); margin-top: var(--space-6); padding-top: var(--space-4); }
    .detail__ship h4 { font-family: var(--font-body); font-size: var(--step-small); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: var(--space-2); }
    .detail__ship p { color: var(--muted); margin: 0; }
    .detail__related { margin-top: var(--space-8); }
    .detail__related .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-5); }
    @media (max-width: 900px) { .detail { grid-template-columns: 1fr; } .detail__media { position: static; } }
  </style>
</Base>
```

- [ ] **Step 7: Build, test, preview**

Run: `npm test` → PASS. Run: `npm run build` → PASS; product pages generated. Preview a product page — two-column layout, price, buy button, shipping, related grid; view-source shows `<script type="application/ld+json">` with the Product object and hreflang alternates.

- [ ] **Step 8: Commit**

```
git add src/lib/jsonld.ts src/lib/jsonld.test.ts src/pages/tr/urun/[slug].astro src/pages/en/product/[slug].astro
git commit -m "feat(design): editorial product detail + Product JSON-LD"
```

---

### Task 7: About, Blog, Contact editorial pages

**Files:**
- Create (overwrite): `src/pages/tr/hakkimizda.astro`, `src/pages/en/about.astro`, `src/pages/tr/blog.astro`, `src/pages/en/blog.astro`, `src/pages/tr/iletisim.astro`, `src/pages/en/contact.astro`

**Interfaces:**
- Consumes: `Base.astro`, `Nav.astro`, `Footer.astro`.
- Produces: six editorial content pages, cross-linked via hreflang.

- [ ] **Step 1: Write `src/pages/tr/hakkimizda.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
---
<Base locale="tr" title="Hakkımızda — Aselovers"
  description="Aselovers'ın hikâyesi: el yapımı amigurumiye adanmış küçük bir atölye."
  pathSelf="hakkimizda" pathsAlt={{ tr: 'hakkimizda', en: 'about' }}>
  <Nav locale="tr" />
  <main>
    <section class="section">
      <div class="container prose">
        <p class="eyebrow">Hikâyemiz</p>
        <h1>Her ilmek elde, sevgiyle</h1>
        <p>Aselovers, her parçayı tek tek örerek anlam katan küçük bir atölyedir. Premium iplikler, sabırlı işçilik ve özenli detaylarla; sevilmek için yapılmış amigurumi oyuncaklar ve aksesuarlar üretiyoruz.</p>
        <p>Ürünlerimizi hem Türkiye'de hem de dünyada müşterilerimizle buluşturuyoruz. Her sipariş, sizin için özenle örülür.</p>
      </div>
    </section>
  </main>
  <Footer locale="tr" />
</Base>
```

- [ ] **Step 2: Write `src/pages/en/about.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
---
<Base locale="en" title="About — Aselovers"
  description="The Aselovers story: a small studio devoted to handmade amigurumi."
  pathSelf="about" pathsAlt={{ tr: 'hakkimizda', en: 'about' }}>
  <Nav locale="en" />
  <main>
    <section class="section">
      <div class="container prose">
        <p class="eyebrow">Our story</p>
        <h1>Every stitch by hand, with love</h1>
        <p>Aselovers is a small studio that gives meaning to each piece by crocheting it one at a time. With premium yarn, patient craft, and careful detail, we make amigurumi toys and accessories that are made to be loved.</p>
        <p>We ship to customers in Turkey and around the world. Every order is crocheted with care, just for you.</p>
      </div>
    </section>
  </main>
  <Footer locale="en" />
</Base>
```

- [ ] **Step 3: Write `src/pages/tr/blog.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
---
<Base locale="tr" title="Blog — Aselovers"
  description="Amigurumi ipuçları, atölyeden hikâyeler ve yenilikler."
  pathSelf="blog" pathsAlt={{ tr: 'blog', en: 'blog' }}>
  <Nav locale="tr" />
  <main>
    <section class="section">
      <div class="container prose">
        <p class="eyebrow">Günlük</p>
        <h1>Blog</h1>
        <p>Yakında: amigurumi bakım ipuçları, atölyeden hikâyeler ve yeni koleksiyon duyuruları.</p>
      </div>
    </section>
  </main>
  <Footer locale="tr" />
</Base>
```

- [ ] **Step 4: Write `src/pages/en/blog.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
---
<Base locale="en" title="Blog — Aselovers"
  description="Amigurumi tips, studio stories, and news."
  pathSelf="blog" pathsAlt={{ tr: 'blog', en: 'blog' }}>
  <Nav locale="en" />
  <main>
    <section class="section">
      <div class="container prose">
        <p class="eyebrow">Journal</p>
        <h1>Blog</h1>
        <p>Coming soon: amigurumi care tips, stories from the studio, and new collection announcements.</p>
      </div>
    </section>
  </main>
  <Footer locale="en" />
</Base>
```

- [ ] **Step 5: Write `src/pages/tr/iletisim.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import Button from '../../components/Button.astro';
---
<Base locale="tr" title="İletişim — Aselovers"
  description="Aselovers ile iletişime geçin — Etsy ve sosyal medya."
  pathSelf="iletisim" pathsAlt={{ tr: 'iletisim', en: 'contact' }}>
  <Nav locale="tr" />
  <main>
    <section class="section">
      <div class="container prose">
        <p class="eyebrow">İletişim</p>
        <h1>Bize ulaşın</h1>
        <p>Sorularınız, özel siparişleriniz ve iş birlikleri için Etsy mağazamızdan veya sosyal medyadan bize yazabilirsiniz.</p>
        <p><Button href="https://www.etsy.com/shop/aselovers" variant="primary" external>Etsy Mağazamız</Button></p>
      </div>
    </section>
  </main>
  <Footer locale="tr" />
</Base>
```

- [ ] **Step 6: Write `src/pages/en/contact.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import Button from '../../components/Button.astro';
---
<Base locale="en" title="Contact — Aselovers"
  description="Get in touch with Aselovers — Etsy and social media."
  pathSelf="contact" pathsAlt={{ tr: 'iletisim', en: 'contact' }}>
  <Nav locale="en" />
  <main>
    <section class="section">
      <div class="container prose">
        <p class="eyebrow">Contact</p>
        <h1>Get in touch</h1>
        <p>For questions, custom orders, and collaborations, reach us through our Etsy shop or on social media.</p>
        <p><Button href="https://www.etsy.com/shop/aselovers" variant="primary" external>Our Etsy shop</Button></p>
      </div>
    </section>
  </main>
  <Footer locale="en" />
</Base>
```

- [ ] **Step 7: Build, test, preview**

Run: `npm test` → PASS. Run: `npm run build` → PASS; all six pages exist. Preview one TR and one EN page — editorial styling, readable measure, nav + footer present.

- [ ] **Step 8: Commit**

```
git add src/pages/tr/hakkimizda.astro src/pages/en/about.astro src/pages/tr/blog.astro src/pages/en/blog.astro src/pages/tr/iletisim.astro src/pages/en/contact.astro
git commit -m "feat(design): editorial about, blog, contact pages"
```

---

### Task 8: Cleanup, OG image, full verification

**Files:**
- Delete: `public/style.css`
- Create: `public/og-default.svg`
- Modify: `src/layouts/Base.astro` (point default OG at the new asset for non-product pages)

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: a clean, fully-styled build with no dead CSS and a branded default OG image.

- [ ] **Step 1: Confirm the old stylesheet is unreferenced, then delete it**

Run: `git grep -n "style.css"` — Expected: NO references in `src/` (the new `Base.astro` links Google Fonts + imports token/global CSS, not `/style.css`). If clean:
```
git rm public/style.css
```

- [ ] **Step 2: Create `public/og-default.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#FBFAF7"/><rect x="40" y="40" width="1120" height="550" rx="18" fill="none" stroke="#E3DACE" stroke-width="2"/><text x="600" y="315" font-family="Georgia, serif" font-size="86" font-weight="600" text-anchor="middle" fill="#22201E">aselovers</text><text x="600" y="380" font-family="Inter, sans-serif" font-size="30" text-anchor="middle" fill="#B85C38" letter-spacing="6">HANDMADE AMIGURUMI</text></svg>
```

- [ ] **Step 3: Point Base default OG at the new asset**

In `src/layouts/Base.astro`, replace the OG image block so a branded default is always present. Change:
```astro
    {ogImage && <meta property="og:image" content={ogImage} />}
    <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
```
to:
```astro
    <meta property="og:image" content={ogImage ?? `${site}/og-default.svg`} />
    <meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 4: Full build + test + preview sweep**

Run: `npm test` → Expected: all pass (baseline 18 + i18n additions + catalog(3) + jsonld(2) — confirm the printed total and that it is green).
Run: `npm run build` → Expected: PASS; `dist/` contains home, catalog, product, about/blog/contact for both locales, `dist/sitemap.xml`, `dist/robots.txt`, `dist/_worker.js`, `dist/og-default.svg`; NO `dist/style.css`.
Preview (`npm run dev`): walk `/tr/`, `/tr/urunler`, a product page, `/tr/hakkimizda`, and the `/en/` equivalents. Confirm: consistent editorial styling, no unstyled/overflowing elements, nav sticky, footer dark, hover transitions, filter works. Resize to mobile width — nav collapses, grids reflow, no horizontal scroll. Take screenshots of home + catalog + product (desktop and mobile) as evidence.

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "chore(design): drop legacy style.css, add branded default OG image"
```

---

## Self-Review

**Spec coverage (vs. design doc §2–§6):**
- §2 tokens → Task 1 (`tokens.css`, `global.css`). ✓
- §3 components (Nav, Footer, Button, ProductCard, SectionHeading, Badge, home sections) → Tasks 2, 3, 4. ✓
- §4 pages (home, catalog, product+JSON-LD, about/blog/contact) → Tasks 4, 5, 6, 7. ✓
- §5 responsive + a11y → media queries + `:focus-visible` + `prefers-reduced-motion` in Task 1 global CSS; per-component breakpoints; alt text via `localizedTitle`. Verified in Task 8 sweep. ✓
- §6 preserved/changed → lib untouched; `Base.astro` keeps SEO logic; `public/style.css` removed in Task 8; favicon Task 1; og-default Task 8. ✓

**Placeholder scan:** No TBD/TODO. The two EN pages that mirror TR (catalog Step 6, product Step 6) include full verbatim code, not "similar to". The newsletter form and mobile hamburger are intentionally presentational/deferred and labeled as such (not placeholders — the shipped behavior is defined).

**Type consistency:** `filterByCategory(products, cat)`, `productJsonLd(product, locale, url)`, `Base` prop contract `{locale,title,description,pathSelf,pathsAlt,ogImage?}`, and reused lib signatures (`loadProducts`, `localizedTitle`, `productSlug`, `t`, `canonical`, `alternates`) are used identically across tasks. Component props (`Button {href,variant,external}`, `ProductCard {product,locale}`, `SectionHeading {eyebrow,title}`) match every call site.

**Note:** Strict unit-TDD applies only to new logic (i18n keys, `filterByCategory`, `productJsonLd`); `.astro` visual tasks are gated on build success + browser-preview screenshots + the unchanged 18 lib tests staying green, which is the appropriate verification for presentational code.
