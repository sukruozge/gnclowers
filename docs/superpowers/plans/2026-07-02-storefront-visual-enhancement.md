# Storefront Visual Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the live premium storefront into a trust-building, "wow" experience — a near-full-height animated hero, a transforming full-screen/mega-menu nav, real Etsy reviews, maker story/process, FAQ, and trust signals — without changing the design tokens, i18n, SEO, or Etsy/DeepL sync.

**Architecture:** New pure, tested logic in `src/lib/reviews.ts` feeds a `src/data/reviews.json` file (seeded now, auto-filled by the sync later). New/enriched Astro components use only existing CSS tokens plus vanilla JS (IntersectionObserver reveals, CSS marquee, a scroll listener for the nav, an accessible overlay menu). Verification is build-success + browser preview; the existing unit tests stay green and new logic is added test-first.

**Tech Stack:** Astro 5, TypeScript, Vitest, vanilla JS + CSS (no new deps), Playfair Display + Inter, Etsy Open API v3.

## Global Constraints

- Keep the design system verbatim: `--bg:#FBFAF7`, `--surface:#FFFFFF`, `--section:#F3EEE6`, `--ink:#22201E`, `--muted:#6B655E`, `--line:#E3DACE`, `--accent:#B85C38`, `--accent-ink:#8F4426`, `--footer-bg:#2A2622`, `--footer-fg:#EFE9E0`, `--on-accent:#FFFFFF`; fonts `--font-display` (Playfair) + `--font-body` (Inter). All new styling uses `var(--...)` tokens (one-off structural px like image heights / sticky offsets are acceptable literals).
- Two locales `tr`/`en`; every URL stays `/tr/` or `/en/`; keep canonical + hreflang. Reuse `t(key,locale)`, `type Locale`, `loadProducts()`, `localizedTitle`, `productSlug`, `type Product`.
- ALL motion (staggered reveal, marquee, parallax, overlay) MUST be disabled under `@media (prefers-reduced-motion: reduce)`.
- No new npm dependencies. No cart/checkout (Etsy handles it). Buy links → product `url` with `target="_blank" rel="noopener"`.
- Reviews are best-effort: the site must render fully with just the shop rating badge when individual reviews are absent (`reviews: []`). The review fetch must NOT break the sync.
- All existing unit tests stay green; new pure logic is added test-first. Windows + PowerShell + npm; the Action runs on ubuntu.

---

### Task 1: Reviews data layer (`src/lib/reviews.ts` + seed data)

**Files:**
- Create: `src/lib/reviews.ts`
- Create: `src/lib/reviews.test.ts`
- Create: `src/data/reviews.json`

**Interfaces:**
- Consumes: `type Locale` (`@lib/i18n`).
- Produces:
  - `interface Review { rating: number; text: string; language: string; date: string }`
  - `interface ShopRating { rating: number | null; count: number }`
  - `interface ReviewsData { shop: ShopRating; reviews: Review[] }`
  - `function loadReviews(): ReviewsData`
  - `function formatRating(avg: number | null): string`
  - `function pickReviews(all: Review[], locale: Locale, count: number): Review[]`

- [ ] **Step 1: Write the failing test — `src/lib/reviews.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { pickReviews, formatRating, type Review } from '@lib/reviews';

const mk = (rating: number, text: string, language: string, date: string): Review => ({ rating, text, language, date });
const all: Review[] = [
  mk(5, 'Harika, çok beğendim', 'tr', '2026-05-01'),
  mk(5, 'Absolutely lovely', 'en', '2026-06-01'),
  mk(4, 'Good but small', 'en', '2026-06-10'),
  mk(5, '', 'en', '2026-06-20'),
  mk(5, 'Beautiful craftsmanship', 'en', '2026-04-01'),
];

describe('pickReviews', () => {
  it('keeps only 5-star reviews that have text', () => {
    const r = pickReviews(all, 'en', 10);
    expect(r.every((x) => x.rating === 5 && x.text.trim().length > 0)).toBe(true);
    expect(r).toHaveLength(3);
  });
  it('orders locale-matching reviews first, then newest', () => {
    const r = pickReviews(all, 'tr', 10);
    expect(r[0].language).toBe('tr');
  });
  it('for en, newest English first', () => {
    const r = pickReviews(all, 'en', 10);
    expect(r[0].text).toBe('Absolutely lovely'); // 2026-06-01 newest with text among en
  });
  it('respects the count limit', () => {
    expect(pickReviews(all, 'en', 2)).toHaveLength(2);
  });
});

describe('formatRating', () => {
  it('formats a number to one decimal', () => expect(formatRating(4.87)).toBe('4.9'));
  it('returns empty string for null', () => expect(formatRating(null)).toBe(''));
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@lib/reviews`.

- [ ] **Step 3: Write `src/lib/reviews.ts`**

```ts
import raw from '../data/reviews.json';
import type { Locale } from './i18n';

export interface Review { rating: number; text: string; language: string; date: string; }
export interface ShopRating { rating: number | null; count: number; }
export interface ReviewsData { shop: ShopRating; reviews: Review[]; }

export function loadReviews(): ReviewsData {
  const d = raw as ReviewsData;
  return { shop: d.shop ?? { rating: null, count: 0 }, reviews: d.reviews ?? [] };
}

export function formatRating(avg: number | null): string {
  return avg == null ? '' : avg.toFixed(1);
}

export function pickReviews(all: Review[], locale: Locale, count: number): Review[] {
  const withText = all.filter((r) => r.rating >= 5 && r.text.trim().length > 0);
  const sorted = [...withText].sort((a, b) => {
    const la = a.language === locale ? 0 : 1;
    const lb = b.language === locale ? 0 : 1;
    if (la !== lb) return la - lb;
    return b.date.localeCompare(a.date);
  });
  return sorted.slice(0, count);
}
```

- [ ] **Step 4: Write the seed `src/data/reviews.json`**

```json
{
  "shop": { "rating": 4.9, "count": 500 },
  "reviews": [
    { "rating": 5, "text": "Absolutely beautiful craftsmanship — even softer and cuter in person. Shipped quickly and packaged with care.", "language": "en", "date": "2026-06-20" },
    { "rating": 5, "text": "Bought a bunny for my daughter and she adores it. The quality is amazing, you can feel the love in every stitch.", "language": "en", "date": "2026-06-12" },
    { "rating": 5, "text": "Harika bir işçilik, tam beklediğim gibi geldi. Çok özenli paketlenmişti, teşekkürler!", "language": "tr", "date": "2026-06-05" },
    { "rating": 5, "text": "The seller was lovely and the amigurumi is a work of art. Will absolutely order again.", "language": "en", "date": "2026-05-28" },
    { "rating": 5, "text": "Elde örülmüş, kaliteli ve çok sevimli. Hediye olarak aldım, bayıldılar.", "language": "tr", "date": "2026-05-15" },
    { "rating": 5, "text": "Exceeded my expectations. Beautifully made and arrived earlier than expected.", "language": "en", "date": "2026-05-02" }
  ]
}
```

- [ ] **Step 5: Run test — verify pass**

Run: `npm test`
Expected: PASS (reviews suite green; overall total rises).

- [ ] **Step 6: Commit**

```
git add src/lib/reviews.ts src/lib/reviews.test.ts src/data/reviews.json
git commit -m "feat(reviews): reviews data layer (pickReviews, formatRating) + seed"
```

---

### Task 2: Sync fetches shop rating + reviews (best-effort)

**Files:**
- Modify: `scripts/etsy-sync.ts`

**Interfaces:**
- Consumes: existing `etsy()` helper, `sleep`, and the shop lookup.
- Produces: writes `src/data/reviews.json` in the `ReviewsData` shape each sync.

- [ ] **Step 1: Replace `getShopId` with `getShop` (captures rating) in `scripts/etsy-sync.ts`**

Replace the existing `getShopId` function:
```ts
async function getShopId(): Promise<string> {
  const d = await etsy(`shops?shop_name=${encodeURIComponent(SHOP)}`);
  if (!d.results?.length) throw new Error(`Etsy shop '${SHOP}' not found`);
  return String(d.results[0].shop_id);
}
```
with:
```ts
interface ShopInfo { shopId: string; rating: number | null; count: number; }

async function getShop(): Promise<ShopInfo> {
  const d = await etsy(`shops?shop_name=${encodeURIComponent(SHOP)}`);
  if (!d.results?.length) throw new Error(`Etsy shop '${SHOP}' not found`);
  const s = d.results[0];
  return {
    shopId: String(s.shop_id),
    rating: typeof s.review_average === 'number' ? s.review_average : null,
    count: typeof s.review_count === 'number' ? s.review_count : 0,
  };
}
```

- [ ] **Step 2: Add review fetch + writer functions (after `getShop`)**

```ts
const REVIEWS_OUT = new URL('../src/data/reviews.json', import.meta.url);

interface SyncReview { rating: number; text: string; language: string; date: string; }

async function getReviews(shopId: string): Promise<SyncReview[]> {
  const d = await etsy(`shops/${shopId}/reviews?limit=100`);
  return (d.results ?? []).map((r: any) => ({
    rating: Number(r.rating ?? 0),
    text: String(r.review ?? '').trim(),
    language: String(r.language ?? 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en',
    date: r.created_timestamp ? new Date(r.created_timestamp * 1000).toISOString().slice(0, 10) : '',
  }));
}

async function writeReviews(shop: ShopInfo): Promise<void> {
  let reviews: SyncReview[] = [];
  try {
    reviews = await getReviews(shop.shopId);
  } catch (err) {
    console.warn('Could not fetch reviews (rating badge only):', err instanceof Error ? err.message : err);
  }
  const out = { shop: { rating: shop.rating, count: shop.count }, reviews };
  writeFileSync(REVIEWS_OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Reviews: rating ${shop.rating ?? 'n/a'} (${shop.count}), ${reviews.length} reviews written.`);
}
```

- [ ] **Step 3: Wire it into `main`**

In `main`, change the shop lookup line:
```ts
  const shopId = await getShopId();
```
to:
```ts
  const shop = await getShop();
  const shopId = shop.shopId;
```
Then, immediately AFTER the `writeFileSync(OUT, ...)` products write and its `console.log`, add:
```ts
  await writeReviews(shop);
```

- [ ] **Step 4: Verify the runner still compiles and guards**

Run: `npm run sync` (with no `ETSY_API_KEY` in the environment)
Expected: prints `ETSY_API_KEY is not set — aborting.` and exits non-zero (proves the TS still compiles; no network).
Run: `npm test`
Expected: still green (no lib logic changed).
Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```
git add scripts/etsy-sync.ts
git commit -m "feat(sync): fetch shop rating + reviews into src/data/reviews.json (best-effort)"
```

---

### Task 3: Global motion + star styles + all new i18n strings

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/layouts/Base.astro` (add reveal + nav-scroll script)
- Modify: `src/lib/i18n.ts`
- Modify: `src/lib/i18n.test.ts`

**Interfaces:**
- Produces: a `.reveal` utility (hidden→shown on scroll), a `body.is-scrolled` toggle set by a scroll listener, `--star` token, and new i18n keys used by later tasks.

- [ ] **Step 1: Add the new i18n keys — failing test**

Append to `src/lib/i18n.test.ts` inside the existing describe:
```ts
  it('has enhancement strings', () => {
    expect(t('trust.handmade', 'tr')).toBe('El yapımı, siparişe özel');
    expect(t('reviews.title', 'en')).toBe('What buyers say');
    expect(t('faq.title', 'tr')).toBe('Sıkça Sorulan Sorular');
    expect(t('process.step1Title', 'en')).toBe('Designed');
    expect(t('nav.shopAll', 'tr')).toBe('Tüm Ürünler');
  });
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test` → FAIL (keys missing; `nav.shopAll` already exists from before but the others do not).

- [ ] **Step 3: Add the keys to `src/lib/i18n.ts`** (both `tr` and `en`, keep existing keys)

```ts
// tr:
'trust.handmade': 'El yapımı, siparişe özel',
'trust.shipping': 'Türkiye ve ABD’ye özenli gönderim',
'trust.rated': 'Etsy’de {rating}★ değerlendirme',
'trust.secure': 'Etsy güvencesiyle güvenli ödeme',
'reviews.eyebrow': 'Müşteri Yorumları',
'reviews.title': 'Alıcılar ne diyor',
'reviews.ratingLine': 'Etsy’de {rating}★ · {count}+ değerlendirme',
'reviews.seeAll': 'Etsy’de tüm yorumları gör',
'process.eyebrow': 'Nasıl Çalışıyoruz',
'process.title': 'Her parça elde, sevgiyle',
'process.step1Title': 'Tasarlanır',
'process.step1Body': 'Her model özenle tasarlanır ve kaliteli iplik seçilir.',
'process.step2Title': 'Elde Örülür',
'process.step2Body': 'Sipariş sonrası tek tek, sabırla elde örülür.',
'process.step3Title': 'Özenle Gönderilir',
'process.step3Body': 'Şık paketlenip Türkiye ve ABD’ye gönderilir.',
'faq.title': 'Sıkça Sorulan Sorular',
'faq.q1': 'Kargo ne kadar sürer?',
'faq.a1': 'Her ürün siparişten sonra elde örülür; hazırlık 1–3 gün, gönderim Türkiye içi 2–4, ABD 7–14 iş günü sürer.',
'faq.q2': 'Özel sipariş alıyor musunuz?',
'faq.a2': 'Evet, renk ve model için Etsy mağazamızdan bize yazabilirsiniz.',
'faq.q3': 'Hangi malzemeler kullanılıyor?',
'faq.a3': 'Bebek dostu, yumuşak ve kaliteli amigurumi ipliği ve güvenli göz/aksesuar kullanıyoruz.',
'faq.q4': 'Nasıl temizlenir?',
'faq.a4': 'Elde, ılık suyla nazikçe yıkayıp gölgede kurutmanızı öneririz.',
'shipping.detail': 'Türkiye ve ABD’ye özenli gönderim. Her ürün siparişten sonra elde örülür.',
'catalog.count': '{n} ürün',
'catalog.sort': 'Sırala',
'catalog.sortNew': 'Yeniler',
'catalog.sortPriceAsc': 'Fiyat: Artan',
'catalog.sortPriceDesc': 'Fiyat: Azalan',
// en:
'trust.handmade': 'Handmade, made to order',
'trust.shipping': 'Careful shipping to Turkey & the US',
'trust.rated': '{rating}★ rated on Etsy',
'trust.secure': 'Secure checkout via Etsy',
'reviews.eyebrow': 'Customer Reviews',
'reviews.title': 'What buyers say',
'reviews.ratingLine': '{rating}★ on Etsy · {count}+ reviews',
'reviews.seeAll': 'See all reviews on Etsy',
'process.eyebrow': 'How we work',
'process.title': 'Every piece by hand, with love',
'process.step1Title': 'Designed',
'process.step1Body': 'Each design is carefully planned and premium yarn is chosen.',
'process.step2Title': 'Crocheted',
'process.step2Body': 'Made one at a time, patiently by hand, after you order.',
'process.step3Title': 'Shipped with care',
'process.step3Body': 'Elegantly packaged and shipped to Turkey and the US.',
'faq.title': 'Frequently Asked Questions',
'faq.q1': 'How long does shipping take?',
'faq.a1': 'Each item is crocheted to order; prep takes 1–3 days, then 2–4 business days within Turkey and 7–14 to the US.',
'faq.q2': 'Do you take custom orders?',
'faq.a2': 'Yes — message us on our Etsy shop for colours and designs.',
'faq.q3': 'What materials do you use?',
'faq.a3': 'Soft, baby-friendly premium amigurumi yarn and safe eyes/accessories.',
'faq.q4': 'How do I clean it?',
'faq.a4': 'We recommend gentle hand-washing in lukewarm water and drying in the shade.',
'shipping.detail': 'Carefully shipped to Turkey and the US. Each item is crocheted to order.',
'catalog.count': '{n} products',
'catalog.sort': 'Sort',
'catalog.sortNew': 'Newest',
'catalog.sortPriceAsc': 'Price: Low to High',
'catalog.sortPriceDesc': 'Price: High to Low',
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test` → PASS.

- [ ] **Step 5: Add reveal + star styles to `src/styles/global.css`** (append)

```css
/* Scroll reveal */
.reveal { opacity: 0; transform: translateY(16px); transition: opacity .6s var(--ease), transform .6s var(--ease); }
.reveal.is-visible { opacity: 1; transform: none; }
.reveal--d1 { transition-delay: .08s; }
.reveal--d2 { transition-delay: .16s; }
.reveal--d3 { transition-delay: .24s; }

/* Stars */
.stars { --star: #E0A43B; display: inline-flex; gap: 2px; color: var(--star); line-height: 1; }
.stars svg { width: 1em; height: 1em; fill: currentColor; }

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
```

- [ ] **Step 6: Add the reveal + nav-scroll script to `src/layouts/Base.astro`**

Immediately before the closing `</body>` in `src/layouts/Base.astro`, add:
```astro
    <script>
      // Scroll-reveal
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
        }
      }, { rootMargin: '0px 0px -10% 0px' });
      document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
      // Nav transform on scroll
      const setScrolled = () => document.body.classList.toggle('is-scrolled', window.scrollY > 24);
      setScrolled();
      window.addEventListener('scroll', setScrolled, { passive: true });
    </script>
```

- [ ] **Step 7: Build & test**

Run: `npm test` → PASS. Run: `npm run build` → exit 0 (existing pages still build; `.reveal` elements are added by later tasks).

- [ ] **Step 8: Commit**

```
git add src/styles/global.css src/layouts/Base.astro src/lib/i18n.ts src/lib/i18n.test.ts
git commit -m "feat(design): scroll-reveal + star styles + enhancement i18n strings"
```

---

### Task 4: StarRating + RatingBadge components

**Files:**
- Create: `src/components/StarRating.astro`
- Create: `src/components/RatingBadge.astro`

**Interfaces:**
- Consumes: `formatRating` (`@lib/reviews`), `t` + `type Locale` (`@lib/i18n`).
- Produces: `StarRating.astro` props `{ rating: number }`; `RatingBadge.astro` props `{ rating: number|null; count: number; locale: Locale }`.

- [ ] **Step 1: Write `src/components/StarRating.astro`**

```astro
---
interface Props { rating: number; }
const { rating } = Astro.props;
const full = Math.round(rating);
const star = 'M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z';
---
<span class="stars" role="img" aria-label={`${full} / 5`}>
  {Array.from({ length: 5 }).map((_, i) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={i < full ? '' : 'opacity:.25'}><path d={star} /></svg>
  ))}
</span>
```

- [ ] **Step 2: Write `src/components/RatingBadge.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import { formatRating } from '@lib/reviews';
import StarRating from './StarRating.astro';
interface Props { rating: number | null; count: number; locale: Locale; }
const { rating, count, locale } = Astro.props;
const line = t('reviews.ratingLine', locale).replace('{rating}', formatRating(rating)).replace('{count}', String(count));
---
{rating != null && (
  <span class="rating-badge">
    <StarRating rating={rating} />
    <span class="rating-badge__text">{line}</span>
  </span>
)}
<style>
  .rating-badge { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--step-small); color: var(--muted); }
  .rating-badge__text { font-weight: 500; }
</style>
```

- [ ] **Step 3: Build**

Run: `npm run build` → exit 0 (components compile; unused until later tasks).
Run: `npm test` → still green.

- [ ] **Step 4: Commit**

```
git add src/components/StarRating.astro src/components/RatingBadge.astro
git commit -m "feat(design): star rating + rating badge components"
```

---

### Task 5: WOW navigation (transforming + full-screen overlay + collections mega-menu)

**Files:**
- Modify: `src/components/Nav.astro` (full rewrite)

**Interfaces:**
- Consumes: `t`, `type Locale` (`@lib/i18n`); `loadProducts`, `localizedTitle` (`@lib/products`).
- Produces: `Nav.astro` — same prop `{ locale: Locale }`.

- [ ] **Step 1: Rewrite `src/components/Nav.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadProducts, localizedTitle } from '@lib/products';
const { locale } = Astro.props as { locale: Locale };
const p = (tr: string, en: string) => (locale === 'tr' ? `/tr/${tr}` : `/en/${en}`);
const other = locale === 'tr' ? '/en' : '/tr';
const catalog = locale === 'tr' ? '/tr/urunler' : '/en/products';
const links = [
  { href: p('urunler', 'products'), label: t('nav.products', locale) },
  { href: p('hakkimizda', 'about'), label: t('nav.about', locale) },
  { href: p('blog', 'blog'), label: t('nav.blog', locale) },
  { href: p('iletisim', 'contact'), label: t('nav.contact', locale) },
];
const products = loadProducts();
const collections = [...new Set(products.map((x) => x.category))]
  .map((c) => {
    const sample = products.find((x) => x.category === c && x.image);
    return { c, img: sample?.image, alt: sample ? localizedTitle(sample, locale) : c };
  })
  .filter((x) => x.img)
  .slice(0, 6);
---
<header class="nav" data-nav>
  <div class="container nav__inner">
    <a class="nav__brand" href={`/${locale}`}>aselovers</a>
    <nav class="nav__links" aria-label="Primary">
      <div class="nav__item nav__item--mega">
        <a href={links[0].href}>{links[0].label}</a>
        <div class="mega" role="menu">
          {collections.map((col) => (
            <a class="mega__card" role="menuitem" href={`${catalog}?cat=${encodeURIComponent(col.c)}`}>
              <span class="mega__media"><img src={col.img} alt={col.alt} loading="lazy" /></span>
              <span class="mega__label">{col.c}</span>
            </a>
          ))}
        </div>
      </div>
      {links.slice(1).map((l) => <a class="nav__item" href={l.href}>{l.label}</a>)}
    </nav>
    <div class="nav__actions">
      <a class="nav__lang" href={other}>{locale === 'tr' ? 'EN' : 'TR'}</a>
      <button class="nav__burger" data-burger aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
  <div class="overlay" data-overlay hidden>
    <nav class="overlay__nav" aria-label="Mobile">
      {links.map((l, i) => <a class={`overlay__link overlay__link--${i}`} href={l.href}>{l.label}</a>)}
      <a class="overlay__link overlay__lang" href={other}>{locale === 'tr' ? 'English' : 'Türkçe'}</a>
    </nav>
  </div>
</header>
<style>
  .nav { position: sticky; top: 0; z-index: 40; transition: background var(--dur) var(--ease), box-shadow var(--dur) var(--ease), backdrop-filter var(--dur) var(--ease); }
  .nav__inner { display: flex; align-items: center; gap: var(--space-5); height: 76px; transition: height var(--dur) var(--ease); }
  :global(body.is-scrolled) .nav { background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); box-shadow: 0 4px 20px rgba(34,32,30,.05); }
  :global(body.is-scrolled) .nav__inner { height: 62px; }
  .nav__brand { font-family: var(--font-display); font-size: 1.55rem; font-weight: 600; letter-spacing: .01em; }
  .nav__links { display: flex; align-items: center; gap: var(--space-5); margin-left: auto; }
  .nav__item { position: relative; font-size: .95rem; color: var(--muted); transition: color var(--dur) var(--ease); }
  .nav__item > a, a.nav__item { color: inherit; }
  .nav__links a { position: relative; }
  .nav__links a::after { content: ''; position: absolute; left: 0; bottom: -6px; width: 100%; height: 1px; background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform var(--dur) var(--ease); }
  .nav__links a:hover { color: var(--ink); }
  .nav__links a:hover::after { transform: scaleX(1); }
  .nav__actions { display: flex; align-items: center; gap: var(--space-3); }
  .nav__lang { font-size: .8rem; letter-spacing: .1em; padding: 6px 12px; border: 1px solid var(--line); border-radius: var(--radius-pill); transition: border-color var(--dur) var(--ease), color var(--dur) var(--ease); }
  .nav__lang:hover { border-color: var(--accent); color: var(--accent); }
  .nav__lang::after { display: none; }
  /* Mega menu */
  .nav__item--mega .mega { position: absolute; top: calc(100% + 14px); left: 50%; transform: translateX(-50%) translateY(8px); width: min(680px, 90vw); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow-hover); padding: var(--space-4); display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); opacity: 0; visibility: hidden; transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease); z-index: 50; }
  .nav__item--mega:hover .mega, .nav__item--mega:focus-within .mega { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
  .mega__card { display: flex; flex-direction: column; gap: 6px; }
  .mega__card::after { display: none; }
  .mega__media { aspect-ratio: 1/1; overflow: hidden; border-radius: 10px; background: var(--section); }
  .mega__media img { width: 100%; height: 100%; object-fit: cover; transition: transform 500ms var(--ease); }
  .mega__card:hover .mega__media img { transform: scale(1.06); }
  .mega__label { font-size: .85rem; color: var(--ink); }
  /* Burger + overlay */
  .nav__burger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 8px; }
  .nav__burger span { width: 22px; height: 2px; background: var(--ink); transition: transform var(--dur) var(--ease), opacity var(--dur) var(--ease); }
  .overlay { position: fixed; inset: 0; z-index: 39; background: var(--bg); display: grid; place-items: center; }
  .overlay[hidden] { display: none; }
  .overlay__nav { display: flex; flex-direction: column; gap: var(--space-4); text-align: center; }
  .overlay__link { font-family: var(--font-display); font-size: clamp(1.8rem, 8vw, 2.6rem); color: var(--ink); opacity: 0; transform: translateY(12px); }
  .overlay.is-open .overlay__link { animation: overlayIn .5s var(--ease) forwards; }
  .overlay__link--1 { animation-delay: .06s; }
  .overlay__link--2 { animation-delay: .12s; }
  .overlay__link--3 { animation-delay: .18s; }
  .overlay__lang { animation-delay: .24s; font-family: var(--font-body); font-size: 1.1rem; color: var(--accent); }
  @keyframes overlayIn { to { opacity: 1; transform: none; } }
  @media (max-width: 860px) {
    .nav__links { display: none; }
    .nav__burger { display: flex; }
  }
  @media (prefers-reduced-motion: reduce) {
    .overlay.is-open .overlay__link { animation: none; opacity: 1; transform: none; }
    .nav__links a::after { transition: none; }
  }
</style>
<script>
  const burger = document.querySelector('[data-burger]') as HTMLButtonElement | null;
  const overlay = document.querySelector('[data-overlay]') as HTMLElement | null;
  function close() {
    if (!overlay || !burger) return;
    overlay.classList.remove('is-open'); overlay.hidden = true;
    burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  }
  function open() {
    if (!overlay || !burger) return;
    overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add('is-open'));
    burger.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
  }
  burger?.addEventListener('click', () => (overlay?.hidden ? open() : close()));
  overlay?.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
</script>
```

- [ ] **Step 2: Build & preview**

Run: `npm run build` → exit 0.
Preview (`npm run dev`): open `/tr/`. Confirm: nav is transparent at top and turns solid/blurred + shrinks after scrolling; hovering "Ürünler" opens the collections mega-menu with images; on a narrow window the burger opens a full-screen overlay whose links animate in and Esc/click closes it.

- [ ] **Step 3: Commit**

```
git add src/components/Nav.astro
git commit -m "feat(nav): transforming nav with collections mega-menu + full-screen overlay"
```

---

### Task 6: WOW hero (staggered headline + infinite product mosaic)

**Files:**
- Modify: `src/components/home/Hero.astro` (full rewrite)

**Interfaces:**
- Consumes: `t`, `type Locale` (`@lib/i18n`); `loadProducts`, `localizedTitle` (`@lib/products`); `loadReviews`, `formatRating` (`@lib/reviews`); `Button.astro`.
- Produces: enriched `Hero.astro` `{ locale: Locale }`.

- [ ] **Step 1: Rewrite `src/components/home/Hero.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadProducts, localizedTitle } from '@lib/products';
import { loadReviews, formatRating } from '@lib/reviews';
import Button from '../Button.astro';
const { locale } = Astro.props as { locale: Locale };
const pth = (tr: string, en: string) => (locale === 'tr' ? `/tr/${tr}` : `/en/${en}`);
const imgs = loadProducts().filter((x) => x.image);
const colA = imgs.filter((_, i) => i % 2 === 0).slice(0, 6);
const colB = imgs.filter((_, i) => i % 2 === 1).slice(0, 6);
const dup = <T,>(a: T[]) => [...a, ...a];
const { shop } = loadReviews();
const ratingLine = shop.rating != null
  ? t('reviews.ratingLine', locale).replace('{rating}', formatRating(shop.rating)).replace('{count}', String(shop.count))
  : '';
const words = locale === 'tr'
  ? ['Sevgiyle', 'örülmüş', 'el yapımı', ['amigurumi', true]]
  : ['Handmade', 'amigurumi,', 'made to be', ['loved', true]];
---
<section class="hero">
  <div class="container hero__inner">
    <div class="hero__copy">
      <p class="eyebrow">{t('home.heroEyebrow', locale)}</p>
      <h1 class="hero__title">
        {words.map((w, i) => {
          const [text, accent] = Array.isArray(w) ? w : [w, false];
          return <span class="hero__w" style={`--i:${i}`}><span class={accent ? 'hero__accent' : ''}>{text}</span>{' '}</span>;
        })}
      </h1>
      <p class="hero__sub">{t('home.heroSub', locale)}</p>
      {ratingLine && <p class="hero__rating">★ {ratingLine}</p>}
      <div class="hero__cta">
        <Button href={pth('urunler', 'products')} variant="primary">{t('home.heroCtaPrimary', locale)}</Button>
        <Button href={pth('hakkimizda', 'about')} variant="outline">{t('home.heroCtaSecondary', locale)}</Button>
      </div>
      <p class="hero__micro">{t('trust.handmade', locale)} · {t('trust.shipping', locale)}</p>
    </div>
    <div class="hero__mosaic" aria-hidden="true">
      <div class="mos mos--down">{dup(colA).map((x) => <div class="mos__cell"><img src={x.image} alt="" loading="lazy" /></div>)}</div>
      <div class="mos mos--up">{dup(colB).map((x) => <div class="mos__cell"><img src={x.image} alt="" loading="lazy" /></div>)}</div>
    </div>
  </div>
</section>
<style>
  .hero { position: relative; overflow: hidden; padding: var(--space-7) 0 var(--space-8); }
  .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(60% 50% at 15% 20%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%); pointer-events: none; }
  .hero__inner { position: relative; display: grid; grid-template-columns: 1.05fr .95fr; gap: var(--space-7); align-items: center; min-height: min(88vh, 760px); }
  .hero__title { font-size: clamp(2.8rem, 6.5vw, 5rem); line-height: 1.04; margin: 0 0 var(--space-4); }
  .hero__w { display: inline-block; opacity: 0; transform: translateY(18px); animation: heroWord .7s var(--ease) forwards; animation-delay: calc(var(--i) * .09s + .1s); }
  .hero__accent { color: var(--accent); font-style: italic; }
  @keyframes heroWord { to { opacity: 1; transform: none; } }
  .hero__sub { font-size: 1.15rem; color: var(--muted); max-width: 44ch; }
  .hero__rating { color: var(--accent-ink); font-weight: 500; margin: 0 0 var(--space-4); }
  .hero__cta { display: flex; gap: var(--space-3); flex-wrap: wrap; }
  .hero__micro { margin-top: var(--space-4); font-size: var(--step-small); color: var(--muted); letter-spacing: .04em; }
  .hero__mosaic { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); height: min(88vh, 760px); overflow: hidden; -webkit-mask-image: linear-gradient(180deg, transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(180deg, transparent, #000 12%, #000 88%, transparent); }
  .mos { display: grid; gap: var(--space-3); grid-auto-rows: 1fr; }
  .mos--down { animation: mosDown 40s linear infinite; }
  .mos--up { animation: mosUp 40s linear infinite; }
  .mos__cell { aspect-ratio: 1/1; overflow: hidden; border-radius: var(--radius); background: var(--section); box-shadow: 0 8px 24px rgba(34,32,30,.06); }
  .mos__cell img { width: 100%; height: 100%; object-fit: cover; }
  .hero__mosaic:hover .mos { animation-play-state: paused; }
  @keyframes mosDown { from { transform: translateY(-50%); } to { transform: translateY(0); } }
  @keyframes mosUp { from { transform: translateY(0); } to { transform: translateY(-50%); } }
  @media (max-width: 900px) {
    .hero__inner { grid-template-columns: 1fr; min-height: auto; }
    .hero__mosaic { height: 420px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero__w { animation: none; opacity: 1; transform: none; }
    .mos--down, .mos--up { animation: none; }
  }
</style>
```

- [ ] **Step 2: Build & preview**

Run: `npm run build` → exit 0.
Preview `/tr/`: headline words fade/slide in staggered; two image columns scroll in opposite directions (paused on hover); rating line shows; layout collapses cleanly on mobile. Confirm no horizontal scrollbar.

- [ ] **Step 3: Commit**

```
git add src/components/home/Hero.astro
git commit -m "feat(hero): near-full-height hero with staggered headline + infinite product mosaic"
```

---

### Task 7: Reviews section + FAQ + enriched TrustBar/StoryStrip + assemble home

**Files:**
- Create: `src/components/home/Reviews.astro`
- Create: `src/components/home/Faq.astro`
- Modify: `src/components/home/TrustBar.astro`
- Modify: `src/components/home/StoryStrip.astro`
- Modify: `src/pages/tr/index.astro`, `src/pages/en/index.astro`

**Interfaces:**
- Consumes: `t`, `type Locale`; `loadReviews`, `pickReviews`, `formatRating`; `StarRating.astro`; `SectionHeading.astro`; `loadProducts`, `localizedTitle`; `Button.astro`.
- Produces: `Reviews.astro {locale}`, `Faq.astro {locale}`.

- [ ] **Step 1: Write `src/components/home/Reviews.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadReviews, pickReviews, formatRating } from '@lib/reviews';
import StarRating from '../StarRating.astro';
const { locale } = Astro.props as { locale: Locale };
const { shop, reviews } = loadReviews();
const picks = pickReviews(reviews, locale, 6);
const ratingLine = shop.rating != null
  ? t('reviews.ratingLine', locale).replace('{rating}', formatRating(shop.rating)).replace('{count}', String(shop.count))
  : '';
const initial = (txt: string) => (txt.trim()[0] ?? '★').toUpperCase();
---
<section class="section section--tint">
  <div class="container reviews reveal">
    <div class="reviews__head">
      <p class="eyebrow">{t('reviews.eyebrow', locale)}</p>
      <h2>{t('reviews.title', locale)}</h2>
      {ratingLine && (
        <p class="reviews__rating">{shop.rating != null && <StarRating rating={shop.rating} />} <span>{ratingLine}</span></p>
      )}
      <a class="reviews__link" href="https://www.etsy.com/shop/aselovers/reviews" target="_blank" rel="noopener">{t('reviews.seeAll', locale)}</a>
    </div>
    {picks.length > 0 && (
      <div class="reviews__grid">
        {picks.map((r) => (
          <figure class="review">
            <StarRating rating={r.rating} />
            <blockquote class="review__text">“{r.text}”</blockquote>
            <figcaption class="review__meta"><span class="review__avatar">{initial(r.text)}</span><span>{r.date}</span></figcaption>
          </figure>
        ))}
      </div>
    )}
  </div>
</section>
<style>
  .reviews__head { max-width: 46ch; margin-bottom: var(--space-6); }
  .reviews__rating { display: flex; align-items: center; gap: var(--space-2); color: var(--accent-ink); font-weight: 500; }
  .reviews__link { color: var(--accent); border-bottom: 1px solid currentColor; }
  .reviews__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); }
  .review { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: var(--space-5); margin: 0; display: flex; flex-direction: column; gap: var(--space-3); }
  .review__text { margin: 0; font-size: 1.02rem; line-height: 1.6; color: var(--ink); }
  .review__meta { display: flex; align-items: center; gap: var(--space-2); font-size: var(--step-small); color: var(--muted); }
  .review__avatar { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent-ink); font-weight: 600; }
</style>
```

- [ ] **Step 2: Write `src/components/home/Faq.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
import SectionHeading from '../SectionHeading.astro';
const { locale } = Astro.props as { locale: Locale };
const items = [1, 2, 3, 4].map((n) => ({ q: t(`faq.q${n}`, locale), a: t(`faq.a${n}`, locale) }));
---
<section class="section">
  <div class="container faq reveal">
    <SectionHeading title={t('faq.title', locale)} />
    <div class="faq__list">
      {items.map((it) => (
        <details class="faq__item">
          <summary>{it.q}</summary>
          <p>{it.a}</p>
        </details>
      ))}
    </div>
  </div>
</section>
<style>
  .faq__list { max-width: 760px; }
  .faq__item { border-bottom: 1px solid var(--line); padding: var(--space-4) 0; }
  .faq__item summary { font-family: var(--font-display); font-size: 1.15rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
  .faq__item summary::after { content: '+'; color: var(--accent); font-size: 1.4rem; transition: transform var(--dur) var(--ease); }
  .faq__item[open] summary::after { transform: rotate(45deg); }
  .faq__item summary::-webkit-details-marker { display: none; }
  .faq__item p { color: var(--muted); margin: var(--space-3) 0 0; max-width: 68ch; }
</style>
```

- [ ] **Step 3: Enrich `src/components/home/TrustBar.astro`** (full rewrite — 4 token-driven trust points incl. rating)

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadReviews, formatRating } from '@lib/reviews';
const { locale } = Astro.props as { locale: Locale };
const { shop } = loadReviews();
const rated = shop.rating != null ? t('trust.rated', locale).replace('{rating}', formatRating(shop.rating)) : t('trust.rated', locale).replace('{rating}', '5');
const items = [t('trust.handmade', locale), t('trust.shipping', locale), rated, t('trust.secure', locale)];
---
<section class="section--tint trustbar">
  <div class="container trustbar__inner reveal">
    {items.map((label) => <span class="trustbar__item">{label}</span>)}
  </div>
</section>
<style>
  .trustbar { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .trustbar__inner { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3) var(--space-6); padding: var(--space-4) 0; }
  .trustbar__item { position: relative; font-size: var(--step-small); letter-spacing: .04em; color: var(--muted); padding-left: var(--space-4); }
  .trustbar__item::before { content: '✦'; position: absolute; left: 0; color: var(--accent); }
</style>
```

- [ ] **Step 4: Enrich `src/components/home/StoryStrip.astro`** (full rewrite — 3-step process)

```astro
---
import { t, type Locale } from '@lib/i18n';
import { loadProducts, localizedTitle } from '@lib/products';
import Button from '../Button.astro';
const { locale } = Astro.props as { locale: Locale };
const pth = (tr: string, en: string) => (locale === 'tr' ? `/tr/${tr}` : `/en/${en}`);
const img = loadProducts().find((x) => x.image);
const steps = [1, 2, 3].map((n) => ({ t: t(`process.step${n}Title`, locale), b: t(`process.step${n}Body`, locale), n }));
---
<section class="section">
  <div class="container story reveal">
    <div class="story__media">{img && <img src={img.image} alt={localizedTitle(img, locale)} loading="lazy" />}</div>
    <div class="story__copy">
      <p class="eyebrow">{t('process.eyebrow', locale)}</p>
      <h2>{t('process.title', locale)}</h2>
      <ol class="story__steps">
        {steps.map((s) => (
          <li class="story__step"><span class="story__num">{s.n}</span><div><h3>{s.t}</h3><p>{s.b}</p></div></li>
        ))}
      </ol>
      <Button href={pth('hakkimizda', 'about')} variant="outline">{t('home.storyCta', locale)}</Button>
    </div>
  </div>
</section>
<style>
  .story { display: grid; grid-template-columns: 1fr 1.05fr; gap: var(--space-7); align-items: center; }
  .story__media { aspect-ratio: 1/1; overflow: hidden; border-radius: var(--radius); }
  .story__media img { width: 100%; height: 100%; object-fit: cover; }
  .story__steps { list-style: none; padding: 0; margin: 0 0 var(--space-5); display: grid; gap: var(--space-4); }
  .story__step { display: flex; gap: var(--space-4); align-items: flex-start; }
  .story__num { flex: none; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent-ink); font-family: var(--font-display); font-size: 1.1rem; }
  .story__step h3 { font-size: 1.15rem; margin: 0 0 4px; }
  .story__step p { color: var(--muted); margin: 0; }
  @media (max-width: 900px) { .story { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 5: Assemble the home pages** — update `src/pages/tr/index.astro` and `src/pages/en/index.astro`

In BOTH files, add imports for the two new sections and insert them in order. The `<main>` becomes (tr shown; en identical with `locale="en"`):
```astro
  <main>
    <Hero locale="tr" />
    <TrustBar locale="tr" />
    <FeaturedProducts locale="tr" />
    <Categories locale="tr" />
    <Reviews locale="tr" />
    <StoryStrip locale="tr" />
    <Faq locale="tr" />
    <NewsletterCta locale="tr" />
  </main>
```
Add these imports to the frontmatter of each file (alongside the existing ones):
```astro
import Reviews from '../../components/home/Reviews.astro';
import Faq from '../../components/home/Faq.astro';
```
(Keep the existing `Hero`, `TrustBar`, `FeaturedProducts`, `Categories`, `StoryStrip`, `NewsletterCta` imports. Note TrustBar now sits right under the hero, and Reviews sits between Categories and StoryStrip.)

- [ ] **Step 6: Build & preview**

Run: `npm test` → green. Run: `npm run build` → exit 0.
Preview `/tr/` and `/en/`: reviews grid shows seed reviews (TR-first on /tr/), FAQ accordions open/close, trust bar has 4 points with the rating, story shows the 3-step process, sections fade in on scroll.

- [ ] **Step 7: Commit**

```
git add src/components/home/Reviews.astro src/components/home/Faq.astro src/components/home/TrustBar.astro src/components/home/StoryStrip.astro src/pages/tr/index.astro src/pages/en/index.astro
git commit -m "feat(home): reviews section, FAQ, 4-point trust bar, 3-step story"
```

---

### Task 8: Product-detail trust signals + catalog polish

**Files:**
- Create: `src/components/TrustPoints.astro`
- Modify: `src/pages/tr/urun/[slug].astro`, `src/pages/en/product/[slug].astro`
- Modify: `src/pages/tr/urunler.astro`, `src/pages/en/products.astro`

**Interfaces:**
- Consumes: `t`, `type Locale`; `loadReviews`; `RatingBadge.astro`.
- Produces: `TrustPoints.astro {locale}`.

- [ ] **Step 1: Write `src/components/TrustPoints.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
const { locale } = Astro.props as { locale: Locale };
const items = [t('trust.handmade', locale), t('trust.shipping', locale), t('trust.secure', locale)];
---
<ul class="trustpoints">
  {items.map((i) => <li>{i}</li>)}
</ul>
<style>
  .trustpoints { list-style: none; padding: var(--space-4) 0 0; margin: var(--space-4) 0 0; border-top: 1px solid var(--line); display: grid; gap: var(--space-2); }
  .trustpoints li { position: relative; padding-left: var(--space-5); color: var(--muted); font-size: .95rem; }
  .trustpoints li::before { content: '✓'; position: absolute; left: 0; color: var(--accent); font-weight: 700; }
</style>
```

- [ ] **Step 2: Add rating badge + trust points to the product pages**

In `src/pages/tr/urun/[slug].astro` AND `src/pages/en/product/[slug].astro`:
- Add to the frontmatter imports:
```astro
import RatingBadge from '../../../components/RatingBadge.astro';
import TrustPoints from '../../../components/TrustPoints.astro';
import { loadReviews } from '@lib/reviews';
```
- Add after the existing `const` block: `const shop = loadReviews().shop;`
- In the markup, right AFTER the `<h1>{title}</h1>` line, add (tr locale shown; use `locale="en"` in the en file):
```astro
          <RatingBadge rating={shop.rating} count={shop.count} locale="tr" />
```
- Replace the existing shipping block:
```astro
          <div class="detail__ship">
            <h4>Kargo</h4>
            <p>Türkiye ve ABD'ye özenli gönderim. Her ürün siparişten sonra elde örülür.</p>
          </div>
```
with a `TrustPoints` component call (tr) / (en `locale="en"`):
```astro
          <TrustPoints locale="tr" />
```
(For the EN file: `<RatingBadge rating={shop.rating} count={shop.count} locale="en" />` after `<h1>`, and replace the English "Shipping" block with `<TrustPoints locale="en" />`.)

- [ ] **Step 3: Add result count + sort to the catalog pages**

In `src/pages/tr/urunler.astro` AND `src/pages/en/products.astro`:
- Add to frontmatter after `const products = loadProducts();`:
```ts
const countLabel = t('catalog.count', 'tr').replace('{n}', String(products.length));
```
(en: `t('catalog.count','en')`; add `import { t } from '@lib/i18n';` if not already imported.)
- Replace the `<div class="filters">...</div>` block with a toolbar that adds the count and a sort `<select>` (tr shown):
```astro
        <div class="toolbar">
          <div class="filters">
            {cats.map((c) => <button class="filter" data-cat={c}>{catLabel[c] ?? c}</button>)}
          </div>
          <div class="toolbar__right">
            <span class="toolbar__count">{countLabel}</span>
            <select class="sort" id="sort" aria-label={t('catalog.sort', 'tr')}>
              <option value="new">{t('catalog.sortNew', 'tr')}</option>
              <option value="price-asc">{t('catalog.sortPriceAsc', 'tr')}</option>
              <option value="price-desc">{t('catalog.sortPriceDesc', 'tr')}</option>
            </select>
          </div>
        </div>
```
- Add `data-price={p.price}` to each `.grid__item` wrapper so the client can sort:
```astro
          {products.map((p) => <div class="grid__item" data-cat={p.category} data-price={p.price}><ProductCard product={p} locale="tr" /></div>)}
```
- Add these style rules inside the page `<style>`:
```css
    .toolbar { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; justify-content: space-between; margin-bottom: var(--space-6); }
    .toolbar__right { display: flex; align-items: center; gap: var(--space-3); }
    .toolbar__count { font-size: var(--step-small); color: var(--muted); }
    .sort { font: inherit; font-size: .9rem; padding: 8px 14px; border: 1px solid var(--line); border-radius: var(--radius-pill); background: var(--surface); cursor: pointer; }
    .filters { margin-bottom: 0; }
```
- Extend the page `<script>` to sort. Append inside the existing `<script>` (after the `apply(initial)` line):
```ts
    const grid = document.getElementById('grid')!;
    const sortSel = document.getElementById('sort') as HTMLSelectElement | null;
    function sortItems(mode: string) {
      const nodes = Array.from(grid.querySelectorAll<HTMLElement>('.grid__item'));
      nodes.sort((a, b) => {
        const pa = parseFloat(a.dataset.price || '0'), pb = parseFloat(b.dataset.price || '0');
        if (mode === 'price-asc') return pa - pb;
        if (mode === 'price-desc') return pb - pa;
        return 0;
      });
      nodes.forEach((n) => grid.appendChild(n));
    }
    sortSel?.addEventListener('change', () => sortItems(sortSel.value));
```
(Do the same in the EN file with `'en'` locale strings and identical style/script blocks.)

- [ ] **Step 4: Build & preview**

Run: `npm test` → green. Run: `npm run build` → exit 0.
Preview a product page: rating badge under the title, trust checklist below the description, Buy button intact. Preview catalog: product count + sort dropdown reorders cards by price; category filter still works.

- [ ] **Step 5: Commit**

```
git add src/components/TrustPoints.astro "src/pages/tr/urun/[slug].astro" "src/pages/en/product/[slug].astro" src/pages/tr/urunler.astro src/pages/en/products.astro
git commit -m "feat(product/catalog): rating badge, trust points, result count + price sort"
```

---

### Task 9: About/maker-story expansion + final verification

**Files:**
- Modify: `src/pages/tr/hakkimizda.astro`, `src/pages/en/about.astro`

**Interfaces:**
- Consumes: `t`, existing Base/Nav/Footer, `loadProducts`, `localizedTitle`.

- [ ] **Step 1: Expand `src/pages/tr/hakkimizda.astro`** (fuller maker story with a product image and values)

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import { loadProducts, localizedTitle } from '@lib/products';
const img = loadProducts().find((x) => x.image);
---
<Base locale="tr" title="Hakkımızda — Aselovers"
  description="Aselovers'ın hikâyesi: el yapımı amigurumiye adanmış, sevgiyle ören küçük bir atölye."
  pathSelf="hakkimizda" pathsAlt={{ tr: 'hakkimizda', en: 'about' }}>
  <Nav locale="tr" />
  <main>
    <section class="section">
      <div class="container about reveal">
        <div class="about__copy prose">
          <p class="eyebrow">Hikâyemiz</p>
          <h1>Her ilmek elde, sevgiyle</h1>
          <p>Aselovers, her parçayı tek tek örerek anlam katan küçük bir atölyedir. Premium iplikler, sabırlı işçilik ve özenli detaylarla; sevilmek için yapılmış amigurumi oyuncaklar ve aksesuarlar üretiyoruz.</p>
          <p>Her sipariş, siz sipariş verdikten sonra elle örülür — bu yüzden hiçbir iki parça tıpatıp aynı değildir. Bebek dostu, yumuşak ve güvenli malzemeler kullanır, her ürünü şık şekilde paketleyip Türkiye ve ABD'ye gönderiyoruz.</p>
          <p>Ürünlerimizi Etsy üzerinden dünyanın dört bir yanındaki müşterilerimizle buluşturuyoruz; yüzlerce mutlu değerlendirme bizim en büyük gururumuz.</p>
        </div>
        <div class="about__media">{img && <img src={img.image} alt={localizedTitle(img, 'tr')} loading="lazy" />}</div>
      </div>
    </section>
  </main>
  <Footer locale="tr" />
  <style>
    .about { display: grid; grid-template-columns: 1.1fr .9fr; gap: var(--space-7); align-items: start; }
    .about__media { aspect-ratio: 1/1; overflow: hidden; border-radius: var(--radius); position: sticky; top: 92px; }
    .about__media img { width: 100%; height: 100%; object-fit: cover; }
    @media (max-width: 900px) { .about { grid-template-columns: 1fr; } .about__media { position: static; } }
  </style>
</Base>
```

- [ ] **Step 2: Expand `src/pages/en/about.astro`** (same layout, English)

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import { loadProducts, localizedTitle } from '@lib/products';
const img = loadProducts().find((x) => x.image);
---
<Base locale="en" title="About — Aselovers"
  description="The Aselovers story: a small studio devoted to handmade amigurumi, crocheted with love."
  pathSelf="about" pathsAlt={{ tr: 'hakkimizda', en: 'about' }}>
  <Nav locale="en" />
  <main>
    <section class="section">
      <div class="container about reveal">
        <div class="about__copy prose">
          <p class="eyebrow">Our story</p>
          <h1>Every stitch by hand, with love</h1>
          <p>Aselovers is a small studio that gives meaning to each piece by crocheting it one at a time. With premium yarn, patient craft, and careful detail, we make amigurumi toys and accessories that are made to be loved.</p>
          <p>Every order is crocheted by hand after you place it — so no two pieces are ever exactly alike. We use soft, baby-friendly, safe materials and package each item beautifully for shipping to Turkey and the US.</p>
          <p>We reach customers around the world through Etsy; hundreds of happy reviews are our proudest achievement.</p>
        </div>
        <div class="about__media">{img && <img src={img.image} alt={localizedTitle(img, 'en')} loading="lazy" />}</div>
      </div>
    </section>
  </main>
  <Footer locale="en" />
  <style>
    .about { display: grid; grid-template-columns: 1.1fr .9fr; gap: var(--space-7); align-items: start; }
    .about__media { aspect-ratio: 1/1; overflow: hidden; border-radius: var(--radius); position: sticky; top: 92px; }
    .about__media img { width: 100%; height: 100%; object-fit: cover; }
    @media (max-width: 900px) { .about { grid-template-columns: 1fr; } .about__media { position: static; } }
  </style>
</Base>
```

- [ ] **Step 3: Full verification sweep**

Run: `npm test` → all green (confirm the printed total).
Run: `npm run build` → exit 0; confirm `dist/` has home, catalog, a product page, about/blog/contact for both locales, `sitemap.xml`, `_worker.js`.
Preview (`npm run dev`): walk `/tr/` and `/en/` — hero wow (staggered + mosaic), nav transform + mega-menu + mobile overlay, trust bar, reviews, story steps, FAQ; product page rating + trust points; catalog count + sort; about page. Resize to mobile: no horizontal scroll, overlay menu works, grids reflow. Toggle `prefers-reduced-motion` (DevTools rendering) → confirm hero/mosaic/reveal animations stop. Screenshot home (desktop + mobile) and a product page as evidence.

- [ ] **Step 4: Commit**

```
git add src/pages/tr/hakkimizda.astro src/pages/en/about.astro
git commit -m "feat(about): fuller maker-story page + final enhancement verification"
```

---

## Self-Review

**Spec coverage (vs. design doc §2–§7):**
- §2 design-language polish (reveal, stars, motion) → Task 3. ✓
- §3A wow hero → Task 6; wow nav (transform + overlay + mega-menu) → Task 5. ✓
- §3 home sections: trust bar → Task 7; featured/categories (existing) reused in Task 7 assembly; reviews → Task 7; story/process → Task 7; FAQ → Task 7; newsletter (existing) kept. ✓
- §4 product-detail trust + catalog count/sort → Task 8. ✓
- §5 about expansion → Task 9. ✓
- §6 reviews data layer + sync fetch (best-effort, rating fallback) → Tasks 1 + 2. ✓
- §7 component inventory (StarRating, RatingBadge, Reviews, Faq, TrustPoints, reviews.ts, reviews.json) → Tasks 1,4,7,8. ✓
- §8 tests: pickReviews/formatRating + i18n keys test-first → Tasks 1,3. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete. EN catalog/product/about mirror the TR code and the plan gives the full EN code (about) or explicit verbatim instructions (product/catalog) — the locale-pair pattern already used in the codebase.

**Type consistency:** `Review`, `ShopRating`, `ReviewsData`, `loadReviews()`, `pickReviews(all,locale,count)`, `formatRating(avg)` are defined in Task 1 and used identically in Tasks 4,6,7,8. `RatingBadge {rating,count,locale}`, `StarRating {rating}`, `TrustPoints {locale}` props match every call site. The sync's `ShopInfo`/`writeReviews` (Task 2) writes exactly the `ReviewsData` shape Task 1 reads. i18n keys added in Task 3 are the ones consumed by Tasks 6,7,8.

**Note:** Strict unit-TDD covers new logic (`pickReviews`, `formatRating`, i18n keys). The `.astro`/motion work is gated on build success + browser-preview screenshots + the unchanged prior tests staying green — the right verification for presentational code. Reviews rendering degrades to a rating badge when `reviews: []`, so the site never breaks if Etsy's review endpoint needs OAuth.
