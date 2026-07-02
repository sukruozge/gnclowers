# Brand, Polish & Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Weave the Aselovers brand identity (moon+baby logo, tagline, soft blush tone) into the storefront, make the catalog premium with prominent prices, add a fixed WhatsApp button and a Home nav link, and fill About/Contact/Blog with real premium bilingual content.

**Architecture:** A new `Logo.astro` (SVG mark + script wordmark) and `WhatsAppFab.astro` are wired site-wide via `Base.astro`/`Nav.astro`/`Footer.astro`. A tested `src/lib/blog.ts` + bilingual post data feeds a blog index and dynamic post pages. Everything reuses the existing token system (adding one blush tone) and i18n/SEO; the approved home page, product gallery, reviews, and the Etsy/DeepL/reviews sync are untouched. Logic (blog, i18n) is added test-first; visual work is gated on build + browser preview.

**Tech Stack:** Astro 5, TypeScript, Vitest, vanilla CSS + tokens, Google Fonts (add Dancing Script), no new npm deps.

## Global Constraints

- Keep the design system: `--bg:#FBFAF7`, `--surface:#FFFFFF`, `--section:#F3EEE6`, `--ink:#22201E`, `--muted:#6B655E`, `--line:#E3DACE`, `--accent:#B85C38`, `--accent-ink:#8F4426`, `--on-accent:#FFFFFF`, footer tones; Playfair (`--font-display`) + Inter (`--font-body`). All new styling via `var(--...)` tokens (one-off structural px OK).
- NEW token: `--blush: #C6ABA1` (logo taupe, secondary tone). Script font **Dancing Script** is used ONLY in the logo wordmark.
- Two locales tr/en; every URL `/tr/` or `/en/`; canonical + hreflang preserved; reuse `t(key,locale)`, `type Locale`, `loadProducts`, `localizedTitle`, `productSlug`, `loadReviews`.
- WhatsApp number: `0506 792 76 85` → `https://wa.me/905067927685`. External links `target="_blank" rel="noopener"`.
- ALL motion disabled under `@media (prefers-reduced-motion: reduce)`. No new npm dependencies. No cart (Etsy).
- Existing unit tests stay green; new logic added test-first. Windows + PowerShell + npm.

---

### Task 1: Brand foundation — blush token, script font, Logo component, favicon, footer logo

**Files:**
- Modify: `src/styles/tokens.css` (add `--blush`)
- Modify: `src/layouts/Base.astro` (add Dancing Script to the Google Fonts link)
- Create: `src/components/Logo.astro`
- Overwrite: `public/favicon.svg`
- Modify: `src/components/Footer.astro` (use `<Logo>` for the footer brand)

**Interfaces:**
- Produces: `Logo.astro` props `{ mode?: 'full' | 'mark'; class?: string }` — `mark` renders only the SVG emblem; `full` renders emblem + "Aselovers" wordmark (Dancing Script) + "Personalized Baby Gifts" tagline.

- [ ] **Step 1: Add the blush token**

In `src/styles/tokens.css`, inside `:root { ... }`, after the `--on-accent` line add:
```css
  --blush: #C6ABA1;
```

- [ ] **Step 2: Add Dancing Script to the font link in `src/layouts/Base.astro`**

Find the Google Fonts stylesheet `<link>` and add the Dancing Script family. Change the `href` to:
```
https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&family=Dancing+Script:wght@600;700&display=swap
```

- [ ] **Step 3: Write `src/components/Logo.astro`**

```astro
---
interface Props { mode?: 'full' | 'mark'; class?: string; }
const { mode = 'full', class: cls = '' } = Astro.props;
---
<span class={`logo logo--${mode} ${cls}`}>
  <svg class="logo__mark" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aselovers">
    <circle cx="60" cy="60" r="56" fill="var(--blush)" />
    <!-- crescent moon carved out of the disc -->
    <mask id="crescent"><rect width="120" height="120" fill="#fff" /><circle cx="74" cy="46" r="30" fill="#000" /></mask>
    <circle cx="58" cy="60" r="34" fill="var(--bg)" mask="url(#crescent)" />
    <!-- sleeping baby nestled on the crescent -->
    <g fill="var(--bg)">
      <circle cx="49" cy="66" r="9" />
      <path d="M56 71c7 0 13 2.5 17 7.5 2 2.5-.6 5.4-3.6 4.4-4.3-1.5-8.7-2.4-13.4-2.4-5 0-7.6-3.2-7.6-5.8 0-2 3.2-3.7 7.6-3.7z" />
    </g>
  </svg>
  {mode === 'full' && (
    <span class="logo__type">
      <span class="logo__word">Aselovers</span>
      <span class="logo__tag">Personalized Baby Gifts</span>
    </span>
  )}
</span>
<style>
  .logo { display: inline-flex; align-items: center; gap: var(--space-3); }
  .logo__mark { width: 40px; height: 40px; flex: none; }
  .logo__type { display: flex; flex-direction: column; line-height: 1; }
  .logo__word { font-family: 'Dancing Script', cursive; font-weight: 700; font-size: 1.7rem; color: var(--ink); }
  .logo__tag { font-size: .58rem; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); margin-top: 2px; }
</style>
```

- [ ] **Step 4: Overwrite `public/favicon.svg` with the emblem**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#C6ABA1"/><mask id="c"><rect width="120" height="120" fill="#fff"/><circle cx="74" cy="46" r="30" fill="#000"/></mask><circle cx="58" cy="60" r="34" fill="#FBFAF7" mask="url(#c)"/><g fill="#FBFAF7"><circle cx="49" cy="66" r="9"/><path d="M56 71c7 0 13 2.5 17 7.5 2 2.5-.6 5.4-3.6 4.4-4.3-1.5-8.7-2.4-13.4-2.4-5 0-7.6-3.2-7.6-5.8 0-2 3.2-3.7 7.6-3.7z"/></g></svg>
```

- [ ] **Step 5: Use `<Logo>` in the footer brand — `src/components/Footer.astro`**

Add `import Logo from './Logo.astro';` to the frontmatter. Replace the footer logo line `<span class="foot__logo">aselovers</span>` with:
```astro
      <Logo mode="full" class="foot__brandlogo" />
```
Add to the Footer `<style>`:
```css
  .foot__brandlogo :global(.logo__word), .foot__brandlogo :global(.logo__tag) { color: var(--footer-fg); }
```
(This keeps the wordmark legible on the dark footer.)

- [ ] **Step 6: Build & preview**

Run: `npm run build` → exit 0.
Preview `/tr/`: the footer shows the moon+baby emblem + "Aselovers" script + tagline; the browser tab favicon shows the emblem. Zoom the emblem — it must clearly read as a **crescent moon with a sleeping baby**. If it doesn't, adjust the mask circle position (`cx/cy/r` of `#crescent`) and the baby `path`/`circle` until it's unmistakably a sleeping baby on a crescent, keeping it minimal and elegant. Screenshot as evidence.

- [ ] **Step 7: Commit**

```
git add src/styles/tokens.css src/layouts/Base.astro src/components/Logo.astro public/favicon.svg src/components/Footer.astro
git commit -m "feat(brand): moon+baby SVG logo, blush token, Dancing Script wordmark, footer logo"
```

---

### Task 2: i18n strings (nav home, WhatsApp, contact, blog)

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/lib/i18n.test.ts`

**Interfaces:**
- Produces: i18n keys `nav.home`, `wa.aria`, `wa.msg`, `contact.*`, `blog.*` used by later tasks.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/i18n.test.ts` inside the existing describe:
```ts
  it('has brand/polish strings', () => {
    expect(t('nav.home', 'tr')).toBe('Anasayfa');
    expect(t('nav.home', 'en')).toBe('Home');
    expect(t('wa.msg', 'en')).toBe("Hi! I'd like to ask about your products.");
    expect(t('blog.readMore', 'tr')).toBe('Devamını oku');
    expect(t('contact.title', 'en')).toBe('Get in touch');
  });
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test` → FAIL (keys missing).

- [ ] **Step 3: Add the keys to `src/lib/i18n.ts`** (both locales, keep existing)

```ts
// tr:
'nav.home': 'Anasayfa',
'wa.aria': 'WhatsApp ile yazın',
'wa.msg': 'Merhaba, ürünleriniz hakkında bilgi almak istiyorum.',
'contact.eyebrow': 'İletişim',
'contact.title': 'Bize ulaşın',
'contact.body': 'Sorularınız, özel siparişleriniz ve iş birlikleri için WhatsApp’tan, Etsy mağazamızdan veya sosyal medyadan bize yazın. Her sipariş sizin için tek tek elde örülür.',
'contact.whatsapp': 'WhatsApp’tan yaz',
'contact.etsy': 'Etsy Mağazamız',
'blog.eyebrow': 'Günlük',
'blog.title': 'Blog',
'blog.intro': 'Kişiye özel bebek hediyeleri, el yapımı örgü ve atölyemizden küçük hikâyeler.',
'blog.readMore': 'Devamını oku',
'blog.back': '← Tüm yazılar',
// en:
'nav.home': 'Home',
'wa.aria': 'Chat on WhatsApp',
'wa.msg': "Hi! I'd like to ask about your products.",
'contact.eyebrow': 'Contact',
'contact.title': 'Get in touch',
'contact.body': 'For questions, custom orders, and collaborations, message us on WhatsApp, through our Etsy shop, or on social media. Every order is crocheted by hand, just for you.',
'contact.whatsapp': 'Message on WhatsApp',
'contact.etsy': 'Our Etsy shop',
'blog.eyebrow': 'Journal',
'blog.title': 'Blog',
'blog.intro': 'Personalized baby gifts, handmade crochet, and little stories from our studio.',
'blog.readMore': 'Read more',
'blog.back': '← All posts',
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```
git add src/lib/i18n.ts src/lib/i18n.test.ts
git commit -m "feat(i18n): nav.home, WhatsApp, contact, blog strings"
```

---

### Task 3: Fixed WhatsApp button

**Files:**
- Create: `src/components/WhatsAppFab.astro`
- Modify: `src/layouts/Base.astro` (render it once, site-wide)

**Interfaces:**
- Consumes: `t`, `type Locale` (`@lib/i18n`).
- Produces: `WhatsAppFab.astro` props `{ locale: Locale }`.

- [ ] **Step 1: Write `src/components/WhatsAppFab.astro`**

```astro
---
import { t, type Locale } from '@lib/i18n';
const { locale } = Astro.props as { locale: Locale };
const href = `https://wa.me/905067927685?text=${encodeURIComponent(t('wa.msg', locale))}`;
---
<a class="wa" href={href} target="_blank" rel="noopener" aria-label={t('wa.aria', locale)}>
  <svg viewBox="0 0 32 32" aria-hidden="true" width="30" height="30"><path fill="currentColor" d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.1 1.6 5.9L4 29l8.3-1.6c1.7.9 3.6 1.4 5.7 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-4.9 1 1-4.8-.3-.4A9.8 9.8 0 0 1 6.2 15c0-5.4 4.4-9.8 9.8-9.8s9.8 4.4 9.8 9.8-4.4 9.8-9.8 9.8zm5.4-7.3c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.2s-.8 1-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>
</a>
<style>
  .wa { position: fixed; right: 20px; bottom: 20px; z-index: 30; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: #25D366; color: #fff; box-shadow: 0 8px 24px rgba(37,211,102,.4); transition: transform var(--dur) var(--ease); animation: waIn .4s var(--ease) .6s both; }
  .wa:hover { transform: scale(1.08); }
  @keyframes waIn { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { .wa { animation: none; } .wa:hover { transform: none; } }
</style>
```

- [ ] **Step 2: Render it in `src/layouts/Base.astro`**

Add `import WhatsAppFab from '../components/WhatsAppFab.astro';` to the frontmatter. Then, inside `<body>`, right after `<slot />` (and before the reveal `<script>`), add:
```astro
    <WhatsAppFab locale={locale} />
```
(`locale` is already a Base prop.)

- [ ] **Step 3: Build & preview**

Run: `npm run build` → exit 0. Run: `npm test` → still green.
Preview `/tr/` and a product page: a green WhatsApp circle sits fixed at bottom-right on every page; clicking opens `wa.me/905067927685` with the prefilled message; it doesn't overlap the footer content awkwardly. Screenshot.

- [ ] **Step 4: Commit**

```
git add src/components/WhatsAppFab.astro src/layouts/Base.astro
git commit -m "feat(contact): fixed WhatsApp button site-wide"
```

---

### Task 4: Nav — Home link + logo

**Files:**
- Modify: `src/components/Nav.astro`

**Interfaces:**
- Consumes: `Logo.astro` (Task 1), `t` (`nav.home`, Task 2).

- [ ] **Step 1: Add the Home link and the Logo to `src/components/Nav.astro`**

Add `import Logo from './Logo.astro';` to the frontmatter. Add a Home entry at the FRONT of the `links` array:
```ts
const links = [
  { href: `/${locale}`, label: t('nav.home', locale) },
  { href: p('urunler', 'products'), label: t('nav.products', locale) },
  { href: p('hakkimizda', 'about'), label: t('nav.about', locale) },
  { href: p('blog', 'blog'), label: t('nav.blog', locale) },
  { href: p('iletisim', 'contact'), label: t('nav.contact', locale) },
];
```
Replace the brand anchor `<a class="nav__brand" href={`/${locale}`}>aselovers</a>` with:
```astro
    <a class="nav__brand" href={`/${locale}`} aria-label="Aselovers"><Logo mode="full" /></a>
```
Update the mega-menu block: it currently assumes `links[0]` is Products. Change the mega trigger to use the Products link explicitly. Where the mega `<div class="nav__item nav__item--mega"><a href={links[0].href}>{links[0].label}</a>` appears, change it to reference the products link:
```astro
      <div class="nav__item nav__item--mega">
        <a href={p('urunler', 'products')} aria-haspopup="true">{t('nav.products', locale)}</a>
```
And the trailing desktop links map (which was `links.slice(1)`) becomes the non-products links. Replace the `{links.slice(1).map(...)}` line with an explicit list that renders Home, About, Blog, Contact (i.e., every link whose href is not the products link):
```astro
      {links.filter((l) => l.href !== p('urunler', 'products')).map((l) => <a class="nav__item" href={l.href}>{l.label}</a>)}
```
Reorder so Home appears first visually: since `links` starts with Home, and Products is rendered as the mega item, put the mega item AFTER Home. Concretely, structure `.nav__links` as: Home link, then the mega Products item, then About/Blog/Contact. Implement by rendering Home explicitly first, the mega item second, then the rest:
```astro
    <nav class="nav__links" aria-label="Primary">
      <a class="nav__item" href={`/${locale}`}>{t('nav.home', locale)}</a>
      <div class="nav__item nav__item--mega">
        <a href={p('urunler', 'products')} aria-haspopup="true">{t('nav.products', locale)}</a>
        <div class="mega">
          {collections.map((col) => (
            <a class="mega__card" href={`${catalog}?cat=${encodeURIComponent(col.c)}`}>
              <span class="mega__media"><img src={col.img} alt={col.alt} loading="lazy" /></span>
              <span class="mega__label">{col.c}</span>
            </a>
          ))}
        </div>
      </div>
      <a class="nav__item" href={p('hakkimizda', 'about')}>{t('nav.about', locale)}</a>
      <a class="nav__item" href={p('blog', 'blog')}>{t('nav.blog', locale)}</a>
      <a class="nav__item" href={p('iletisim', 'contact')}>{t('nav.contact', locale)}</a>
    </nav>
```
In the mobile overlay, add Home as the first link:
```astro
      <a class={`overlay__link overlay__link--0`} href={`/${locale}`}>{t('nav.home', locale)}</a>
```
(placed before the existing `{links.map(...)}` — and change that map to skip Home to avoid duplication, e.g. iterate the About/Blog/Contact/Products set, or simply build a `mobileLinks` array = `[Home, Products, About, Blog, Contact]` and map it. Keep the staggered `overlay__link--{i}` indices contiguous.)
Keep `.nav__brand` styling but drop its old font-size rule if it conflicts with the Logo (the Logo provides its own type). Ensure the brand `::after` underline does not apply to the logo (the `.nav__links a::after` rule targets links inside `.nav__links`, not `.nav__brand`, so it's fine).

- [ ] **Step 2: Build & preview**

Run: `npm run build` → exit 0. Run: `npm test` → green.
Preview `/tr/`: nav shows the logo (emblem + script wordmark) at left; nav links read **Anasayfa · Ürünler · Hakkımızda · Blog · İletişim**; hovering Ürünler still opens the mega-menu; the mobile overlay lists Anasayfa first and animates in. Screenshot desktop + mobile.

- [ ] **Step 3: Commit**

```
git add src/components/Nav.astro
git commit -m "feat(nav): Home link + brand logo in navigation"
```

---

### Task 5: Premium catalog chips + prominent prices

**Files:**
- Modify: `src/pages/tr/urunler.astro`, `src/pages/en/products.astro` (chip styles + mobile scroll)
- Modify: `src/components/ProductCard.astro` (price prominence)

**Interfaces:**
- Consumes: existing catalog markup/scripts (filter + sort) — unchanged behavior.

- [ ] **Step 1: Restyle the filter chips in BOTH catalog pages**

In `src/pages/tr/urunler.astro` AND `src/pages/en/products.astro`, replace the existing `.filters` / `.filter` / `.filter:hover` / `.filter[aria-selected="true"]` rules in the page `<style>` with:
```css
    .filters { display: flex; flex-wrap: nowrap; gap: var(--space-2); overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; margin-bottom: 0; }
    .filters::-webkit-scrollbar { display: none; }
    .filter { flex: none; font: inherit; font-size: .9rem; padding: 9px 18px; border: 1px solid transparent; background: color-mix(in srgb, var(--blush) 22%, transparent); color: var(--ink); border-radius: var(--radius-pill); cursor: pointer; white-space: nowrap; transition: background var(--dur) var(--ease), color var(--dur) var(--ease), transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease); }
    .filter:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--blush) 34%, transparent); }
    .filter[aria-selected="true"] { background: var(--accent); color: var(--on-accent); box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 32%, transparent); }
```
(Keep the `.toolbar`, `.toolbar__right`, `.toolbar__count`, `.sort`, `.grid`, `.grid__item[hidden]` rules as they are.)

- [ ] **Step 2: Make prices prominent in `src/components/ProductCard.astro`**

Replace the `.card__price` rule:
```css
  .card__price { font-family: var(--font-body); color: var(--muted); }
```
with:
```css
  .card__price { font-family: var(--font-body); color: var(--accent-ink); font-weight: 600; font-size: 1.05rem; }
```

- [ ] **Step 3: Build & preview**

Run: `npm run build` → exit 0. Run: `npm test` → green.
Preview `/tr/urunler`: category chips are soft-blush pills; the active chip is a filled terracotta pill with a soft shadow; on a narrow width the chip row scrolls horizontally without a visible scrollbar; product prices are clearly terracotta and bold (not faint gray). Clicking a chip still filters; sort still works. Screenshot desktop + mobile.

- [ ] **Step 4: Commit**

```
git add src/pages/tr/urunler.astro src/pages/en/products.astro src/components/ProductCard.astro
git commit -m "feat(catalog): blush/terracotta filter chips + prominent prices"
```

---

### Task 6: Blog data + helpers (`src/lib/blog.ts`)

**Files:**
- Create: `src/lib/blog.ts`
- Create: `src/lib/blog.test.ts`

**Interfaces:**
- Produces:
  - `interface Post { slug: string; date: string; title_tr: string; title_en: string; excerpt_tr: string; excerpt_en: string; bodyHtml_tr: string; bodyHtml_en: string }`
  - `function loadPosts(): Post[]` — newest first (by `date` desc)
  - `function postSlug(post: Post): string` — returns `post.slug`

- [ ] **Step 1: Write the failing test — `src/lib/blog.test.ts`**

```ts
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
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test` → FAIL (cannot resolve `@lib/blog`).

- [ ] **Step 3: Write `src/lib/blog.ts`** (4 real bilingual posts)

```ts
export interface Post {
  slug: string;
  date: string;
  title_tr: string;
  title_en: string;
  excerpt_tr: string;
  excerpt_en: string;
  bodyHtml_tr: string;
  bodyHtml_en: string;
}

const POSTS: Post[] = [
  {
    slug: 'kisiye-ozel-bebek-hediyesi',
    date: '2026-06-25',
    title_tr: 'Kişiye Özel Bebek Hediyesi Neden Bu Kadar Özel?',
    title_en: 'Why a Personalized Baby Gift Means So Much',
    excerpt_tr: 'İsmi işlenmiş, elde örülmüş bir hediye; bir bebeğe “sen bekleniyordun” demenin en sıcak yolu.',
    excerpt_en: 'A hand-crocheted gift with a name on it is the warmest way to say “you were waited for.”',
    bodyHtml_tr: '<p>Bir bebek için seçtiğiniz hediye, çoğu zaman ilk anılardan birinin parçası olur. Kişiye özel, elde örülmüş bir amigurumi ya da isimli bir parça; mağaza rafındaki sıradan bir üründen çok daha fazlasını anlatır — zaman, emek ve sevgi.</p><p>Aselovers’ta her parça siparişten sonra tek tek örülür. Bebeğin adını, sevdiğiniz rengi ve küçük detayları ekleyerek, yıllarca saklanacak bir hatıra yaratırız. Baby shower, doğum ya da “sadece sevdiğim için” anları için tam da bu yüzden tercih ediliyoruz.</p>',
    bodyHtml_en: '<p>The gift you choose for a baby often becomes part of a first memory. A personalized, hand-crocheted amigurumi or a piece with a name on it says far more than something off a shelf — it says time, care, and love.</p><p>At Aselovers every piece is crocheted to order. We add the baby’s name, your favourite colours, and the little details that turn an object into a keepsake kept for years. That’s exactly why families choose us for baby showers, births, and “just because” moments.</p>',
  },
  {
    slug: 'amigurumi-bakimi',
    date: '2026-06-15',
    title_tr: 'El Örgüsü Amigurumi Nasıl Temizlenir ve Saklanır?',
    title_en: 'How to Clean and Care for a Handmade Amigurumi',
    excerpt_tr: 'Doğru bakımla el örgüsü oyuncaklar yıllarca ilk günkü gibi kalır. İşte birkaç nazik ipucu.',
    excerpt_en: 'With gentle care, handmade toys stay lovely for years. A few simple tips.',
    bodyHtml_tr: '<p>El örgüsü amigurumiler dayanıklıdır ama sevgiyle yapıldıkları gibi sevgiyle de bakılmayı sever. Temizlik için ılık su ve az miktarda hassas deterjanla nazikçe elde yıkamanızı öneririz; ovalamak yerine sıkmadan bastırarak durulayın.</p><p>Kurutmak için düz bir havlunun üzerine yayıp gölgede bekletin — makine ve doğrudan güneş liflerin şeklini bozabilir. Uzun süre saklarken nemden uzak, hava alan bir yerde tutun. Bu küçük özen, oyuncağın yıllarca yumuşak ve canlı kalmasını sağlar.</p>',
    bodyHtml_en: '<p>Handmade amigurumi are sturdy, but like anything made with love they prefer to be cared for gently. To clean, hand-wash in lukewarm water with a little mild detergent; press the water out rather than wringing or scrubbing.</p><p>Dry flat on a towel in the shade — machines and direct sun can distort the fibres. For long storage, keep them somewhere dry and airy. This small care keeps the toy soft and bright for years.</p>',
  },
  {
    slug: 'bir-parcanin-hikayesi',
    date: '2026-06-05',
    title_tr: 'Bir Parçanın Hikâyesi: İlk İlmekten Kapıya',
    title_en: 'The Story of a Piece: From First Stitch to Your Door',
    excerpt_tr: 'Sipariş verdiğiniz an ile kapınızda bir kutu arasında; iplik, sabır ve minik detaylar var.',
    excerpt_en: 'Between your order and the box at your door: yarn, patience, and tiny details.',
    bodyHtml_tr: '<p>Her sipariş boş bir tezgâhta başlar. Önce iplik ve renkler seçilir; sonra saatler süren, ilmek ilmek sabırlı bir işçilik gelir. Gözler, minik aksesuarlar ve isim detayları en sona, en büyük özenle eklenir.</p><p>Bitince her parça tek tek kontrol edilir, şık şekilde paketlenir ve Türkiye ile ABD’ye yola çıkar. Kapınıza gelen kutunun içinde sadece bir oyuncak değil; sizin için ayrılmış bir zaman var.</p>',
    bodyHtml_en: '<p>Every order begins at an empty table. First the yarn and colours are chosen; then come the hours of patient, stitch-by-stitch work. Eyes, tiny accessories, and name details are added last, with the greatest care.</p><p>When it’s done, each piece is checked one by one, packaged beautifully, and sent to Turkey and the US. Inside the box at your door is not just a toy — it’s time set aside just for you.</p>',
  },
  {
    slug: 'yeni-dogana-hediye-rehberi',
    date: '2026-05-20',
    title_tr: 'Yeni Doğana Anlamlı Hediye Rehberi',
    title_en: 'A Guide to Meaningful Gifts for a Newborn',
    excerpt_tr: 'Baby shower ya da hoş geldin bebek: akılda kalan, kişisel ve güvenli hediyeler için fikirler.',
    excerpt_en: 'Baby shower or welcome-baby: ideas for memorable, personal, and safe gifts.',
    bodyHtml_tr: '<p>En sevilen hediyeler genellikle en kişisel olanlardır. İsimli bir amigurumi, odası için yumuşak bir dekor ya da minik bir aksesuar seti; hem şık görünür hem de yıllarca saklanır.</p><p>Seçim yaparken güvenli malzemeleri ve bebek dostu detayları önceliklendirin. Emin değilseniz WhatsApp’tan yazın — renk, isim ve tema için birlikte en anlamlı hediyeyi seçelim.</p>',
    bodyHtml_en: '<p>The best-loved gifts are usually the most personal. A named amigurumi, a soft piece of décor for the nursery, or a little accessory set looks lovely and is kept for years.</p><p>When choosing, prioritise safe materials and baby-friendly details. Not sure? Message us on WhatsApp — we’ll pick the most meaningful gift together, from colour to name to theme.</p>',
  },
];

export function loadPosts(): Post[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function postSlug(post: Post): string {
  return post.slug;
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```
git add src/lib/blog.ts src/lib/blog.test.ts
git commit -m "feat(blog): bilingual blog data + loadPosts/postSlug helpers"
```

---

### Task 7: Blog index + post pages + sitemap

**Files:**
- Overwrite: `src/pages/tr/blog.astro`, `src/pages/en/blog.astro` (index listing)
- Create: `src/pages/tr/blog/[slug].astro`, `src/pages/en/blog/[slug].astro`
- Modify: `src/lib/sitemap.ts` (add blog routes)
- Modify: `src/lib/sitemap.test.ts` if it exists (assert a blog URL); otherwise no test change

**Interfaces:**
- Consumes: `loadPosts`, `postSlug`, `type Post` (`@lib/blog`); `t` (`blog.*`), `type Locale`; Base/Nav/Footer.

- [ ] **Step 1: Overwrite `src/pages/tr/blog.astro` (index)**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import SectionHeading from '../../components/SectionHeading.astro';
import { t } from '@lib/i18n';
import { loadPosts } from '@lib/blog';
const posts = loadPosts();
---
<Base locale="tr" title="Blog — Aselovers" description="Kişiye özel bebek hediyeleri, el yapımı örgü ve atölyemizden hikâyeler."
  pathSelf="blog" pathsAlt={{ tr: 'blog', en: 'blog' }}>
  <Nav locale="tr" />
  <main>
    <section class="section">
      <div class="container reveal">
        <SectionHeading eyebrow={t('blog.eyebrow', 'tr')} title={t('blog.title', 'tr')} />
        <p class="prose">{t('blog.intro', 'tr')}</p>
        <div class="posts">
          {posts.map((post) => (
            <a class="post" href={`/tr/blog/${post.slug}`}>
              <span class="post__date">{post.date}</span>
              <h3 class="post__title">{post.title_tr}</h3>
              <p class="post__excerpt">{post.excerpt_tr}</p>
              <span class="post__more">{t('blog.readMore', 'tr')} →</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  </main>
  <Footer locale="tr" />
  <style>
    .posts { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-5); margin-top: var(--space-6); }
    .post { display: block; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: var(--space-5); transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease); }
    .post:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }
    .post__date { font-size: var(--step-small); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
    .post__title { font-size: 1.3rem; margin: var(--space-2) 0; }
    .post__excerpt { color: var(--muted); margin: 0 0 var(--space-3); }
    .post__more { color: var(--accent); font-weight: 500; }
  </style>
</Base>
```

- [ ] **Step 2: Overwrite `src/pages/en/blog.astro`** (same with `locale="en"`, `_en` fields, English meta)

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import SectionHeading from '../../components/SectionHeading.astro';
import { t } from '@lib/i18n';
import { loadPosts } from '@lib/blog';
const posts = loadPosts();
---
<Base locale="en" title="Blog — Aselovers" description="Personalized baby gifts, handmade crochet, and stories from our studio."
  pathSelf="blog" pathsAlt={{ tr: 'blog', en: 'blog' }}>
  <Nav locale="en" />
  <main>
    <section class="section">
      <div class="container reveal">
        <SectionHeading eyebrow={t('blog.eyebrow', 'en')} title={t('blog.title', 'en')} />
        <p class="prose">{t('blog.intro', 'en')}</p>
        <div class="posts">
          {posts.map((post) => (
            <a class="post" href={`/en/blog/${post.slug}`}>
              <span class="post__date">{post.date}</span>
              <h3 class="post__title">{post.title_en}</h3>
              <p class="post__excerpt">{post.excerpt_en}</p>
              <span class="post__more">{t('blog.readMore', 'en')} →</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  </main>
  <Footer locale="en" />
  <style>
    .posts { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-5); margin-top: var(--space-6); }
    .post { display: block; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: var(--space-5); transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease); }
    .post:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }
    .post__date { font-size: var(--step-small); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
    .post__title { font-size: 1.3rem; margin: var(--space-2) 0; }
    .post__excerpt { color: var(--muted); margin: 0 0 var(--space-3); }
    .post__more { color: var(--accent); font-weight: 500; }
  </style>
</Base>
```

- [ ] **Step 3: Create `src/pages/tr/blog/[slug].astro`**

```astro
---
import Base from '../../../layouts/Base.astro';
import Nav from '../../../components/Nav.astro';
import Footer from '../../../components/Footer.astro';
import { t } from '@lib/i18n';
import { loadPosts, postSlug, type Post } from '@lib/blog';
export function getStaticPaths() {
  return loadPosts().map((post) => ({ params: { slug: postSlug(post) }, props: { post } }));
}
const { post } = Astro.props as { post: Post };
const selfPath = `blog/${post.slug}`;
---
<Base locale="tr" title={`${post.title_tr} — Aselovers`} description={post.excerpt_tr}
  pathSelf={selfPath} pathsAlt={{ tr: selfPath, en: selfPath }}>
  <Nav locale="tr" />
  <main>
    <article class="section">
      <div class="container prose reveal">
        <a class="blogback" href="/tr/blog">{t('blog.back', 'tr')}</a>
        <p class="eyebrow">{post.date}</p>
        <h1>{post.title_tr}</h1>
        <div set:html={post.bodyHtml_tr} />
      </div>
    </article>
  </main>
  <Footer locale="tr" />
  <style>.blogback { display: inline-block; color: var(--accent); margin-bottom: var(--space-4); } .prose :global(p) { color: var(--muted); }</style>
</Base>
```

- [ ] **Step 4: Create `src/pages/en/blog/[slug].astro`** (same, English fields)

```astro
---
import Base from '../../../layouts/Base.astro';
import Nav from '../../../components/Nav.astro';
import Footer from '../../../components/Footer.astro';
import { t } from '@lib/i18n';
import { loadPosts, postSlug, type Post } from '@lib/blog';
export function getStaticPaths() {
  return loadPosts().map((post) => ({ params: { slug: postSlug(post) }, props: { post } }));
}
const { post } = Astro.props as { post: Post };
const selfPath = `blog/${post.slug}`;
---
<Base locale="en" title={`${post.title_en} — Aselovers`} description={post.excerpt_en}
  pathSelf={selfPath} pathsAlt={{ tr: selfPath, en: selfPath }}>
  <Nav locale="en" />
  <main>
    <article class="section">
      <div class="container prose reveal">
        <a class="blogback" href="/en/blog">{t('blog.back', 'en')}</a>
        <p class="eyebrow">{post.date}</p>
        <h1>{post.title_en}</h1>
        <div set:html={post.bodyHtml_en} />
      </div>
    </article>
  </main>
  <Footer locale="en" />
  <style>.blogback { display: inline-block; color: var(--accent); margin-bottom: var(--space-4); } .prose :global(p) { color: var(--muted); }</style>
</Base>
```

- [ ] **Step 5: Add blog routes to the sitemap**

Read `src/lib/sitemap.ts`. It builds `<url>` entries for static routes + product routes. Import `loadPosts` and, following the SAME pattern used for product routes, append two entries per post: `${site}/tr/blog/${post.slug}` and `${site}/en/blog/${post.slug}`. If `src/lib/sitemap.test.ts` exists, add an assertion:
```ts
  it('includes blog post urls', () => {
    const xml = buildSitemap('https://aseloves.com');
    expect(xml).toContain('/tr/blog/');
    expect(xml).toContain('/en/blog/');
  });
```
(Use the real exported function name/signature found in `sitemap.ts`; the existing tests show how it is called.)

- [ ] **Step 6: Build, test, preview**

Run: `npm test` → all pass (incl. blog + any sitemap assertion). Run: `npm run build` → exit 0; `dist/tr/blog/index.html`, `dist/en/blog/index.html`, and `dist/tr/blog/<slug>/index.html` for each post exist; `dist/sitemap.xml` contains `/tr/blog/`.
Preview `/tr/blog`: post cards list (newest first) with date, title, excerpt, "Devamını oku"; clicking opens the post with full body + "← Tüm yazılar"; hreflang pairs tr↔en. Screenshot.

- [ ] **Step 7: Commit**

```
git add src/pages/tr/blog.astro src/pages/en/blog.astro "src/pages/tr/blog/[slug].astro" "src/pages/en/blog/[slug].astro" src/lib/sitemap.ts src/lib/sitemap.test.ts
git commit -m "feat(blog): index + post pages + sitemap entries"
```

---

### Task 8: Premium About & Contact content

**Files:**
- Overwrite: `src/pages/tr/hakkimizda.astro`, `src/pages/en/about.astro`, `src/pages/tr/iletisim.astro`, `src/pages/en/contact.astro`

**Interfaces:**
- Consumes: Base/Nav/Footer, `t` (`contact.*`), `loadProducts`/`localizedTitle`, `Button.astro`.

> NOTE: About pages were already given a two-column maker-story layout in the prior enhancement. This task refreshes their COPY to the personalized-baby-gifts brand voice and rewrites the Contact pages to a premium layout with a WhatsApp CTA. Keep the existing About two-column structure (`.about`, `.about__media`, sticky image) and only update the prose copy as below.

- [ ] **Step 1: Update About copy — `src/pages/tr/hakkimizda.astro`**

Keep the file's structure; replace the three `<p>` paragraphs in `.about__copy` with:
```astro
          <p>Aselovers, kişiye özel el yapımı bebek hediyeleri hazırlayan küçük bir atölyedir. Her amigurumi, oyuncak ve aksesuar; premium ipliklerle, sabırla ve sevgiyle tek tek elde örülür.</p>
          <p>Yeni ebeveynler, baby shower hazırlığı yapanlar ve anlamlı bir hediye arayanlar için üretiyoruz. İsim, renk ve küçük detaylarla her parçayı kişiselleştiriyor; bebek dostu, yumuşak ve güvenli malzemeler kullanıyoruz.</p>
          <p>Her sipariş siz verdikten sonra örülür — bu yüzden hiçbir iki parça tıpatıp aynı değildir. Ürünlerimizi Türkiye ve ABD dâhil dünyanın dört bir yanına gönderiyor, Etsy’deki her mutlu değerlendirmeyle biraz daha gururlanıyoruz.</p>
```

- [ ] **Step 2: Update About copy — `src/pages/en/about.astro`**

Replace the three `<p>` paragraphs with:
```astro
          <p>Aselovers is a small studio making personalized, handmade baby gifts. Every amigurumi, toy, and accessory is crocheted one at a time with premium yarn, patience, and love.</p>
          <p>We make for new parents, baby-shower planners, and anyone looking for a gift that means something. We personalize each piece with a name, colours, and little details, using soft, baby-friendly, safe materials.</p>
          <p>Every order is crocheted after you place it — so no two pieces are ever quite alike. We ship worldwide, including Turkey and the US, and grow a little prouder with every happy review on Etsy.</p>
```

- [ ] **Step 3: Rewrite Contact — `src/pages/tr/iletisim.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import Button from '../../components/Button.astro';
import { t } from '@lib/i18n';
const wa = `https://wa.me/905067927685?text=${encodeURIComponent(t('wa.msg', 'tr'))}`;
---
<Base locale="tr" title="İletişim — Aselovers" description="Aselovers ile WhatsApp, Etsy ve sosyal medyadan iletişime geçin."
  pathSelf="iletisim" pathsAlt={{ tr: 'iletisim', en: 'contact' }}>
  <Nav locale="tr" />
  <main>
    <section class="section">
      <div class="container prose reveal">
        <p class="eyebrow">{t('contact.eyebrow', 'tr')}</p>
        <h1>{t('contact.title', 'tr')}</h1>
        <p>{t('contact.body', 'tr')}</p>
        <p class="contact__cta">
          <Button href={wa} variant="primary" external>{t('contact.whatsapp', 'tr')}</Button>
          <Button href="https://www.etsy.com/shop/aselovers" variant="outline" external>{t('contact.etsy', 'tr')}</Button>
        </p>
      </div>
    </section>
  </main>
  <Footer locale="tr" />
  <style>.contact__cta { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-5); }</style>
</Base>
```

- [ ] **Step 4: Rewrite Contact — `src/pages/en/contact.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import Button from '../../components/Button.astro';
import { t } from '@lib/i18n';
const wa = `https://wa.me/905067927685?text=${encodeURIComponent(t('wa.msg', 'en'))}`;
---
<Base locale="en" title="Contact — Aselovers" description="Get in touch with Aselovers via WhatsApp, Etsy, and social media."
  pathSelf="contact" pathsAlt={{ tr: 'iletisim', en: 'contact' }}>
  <Nav locale="en" />
  <main>
    <section class="section">
      <div class="container prose reveal">
        <p class="eyebrow">{t('contact.eyebrow', 'en')}</p>
        <h1>{t('contact.title', 'en')}</h1>
        <p>{t('contact.body', 'en')}</p>
        <p class="contact__cta">
          <Button href={wa} variant="primary" external>{t('contact.whatsapp', 'en')}</Button>
          <Button href="https://www.etsy.com/shop/aselovers" variant="outline" external>{t('contact.etsy', 'en')}</Button>
        </p>
      </div>
    </section>
  </main>
  <Footer locale="en" />
  <style>.contact__cta { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-5); }</style>
</Base>
```

- [ ] **Step 5: Build, test, preview**

Run: `npm test` → green. Run: `npm run build` → exit 0.
Preview `/tr/hakkimizda` and `/tr/iletisim` (+ en): About reads as the personalized-baby-gifts brand story; Contact shows the WhatsApp + Etsy CTAs (WhatsApp opens the prefilled chat). Screenshot.

- [ ] **Step 6: Commit**

```
git add src/pages/tr/hakkimizda.astro src/pages/en/about.astro src/pages/tr/iletisim.astro src/pages/en/contact.astro
git commit -m "feat(content): brand About copy + premium Contact with WhatsApp"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full sweep**

Run: `npm test` → all pass (confirm total, green).
Run: `npm run build` → exit 0. Confirm `dist/` has: home, catalog, a product page, `tr/blog/index.html` + a `tr/blog/<slug>/index.html`, about, contact for both locales, `sitemap.xml` (with `/tr/blog/`), `_worker.js`, `favicon.svg`.
Preview `/tr/` and `/en/`: logo in nav + footer; nav has Anasayfa/Home; WhatsApp button on every page (home, catalog, product, blog, about, contact); catalog chips premium + prices bold terracotta; blog lists posts and a post opens; About/Contact premium. Resize to mobile: WhatsApp button visible and not overlapping nav overlay; chips scroll; no horizontal overflow. Toggle `prefers-reduced-motion` → WhatsApp/reveal animations stop. Screenshot home + catalog + a blog post (desktop + mobile).

- [ ] **Step 2: Commit (if any verification tweaks were needed)**

```
git add -A
git commit -m "chore(brand): final verification tweaks"
```
(If nothing changed, skip.)

---

## Self-Review

**Spec coverage (vs. design doc §2–§7):**
- §2 brand: blush token + Dancing Script + Logo + favicon + footer logo → Task 1; moon glyph signature is realized via the Logo mark (favicon/nav/footer) — the generic-sparkle replacement is folded into brand usage, acceptable. ✓
- §3 catalog chips + price prominence → Task 5. ✓
- §4 WhatsApp FAB → Task 3. ✓
- §5 nav Home + logo → Task 4. ✓
- §6 About + Contact content → Task 8. ✓
- §7 Blog data + index + post pages + sitemap → Tasks 6, 7. ✓
- i18n strings → Task 2. Tests: blog helpers + i18n keys test-first (Tasks 2, 6). ✓

**Placeholder scan:** No TBD/TODO. The logo SVG ships as complete, working code with a concrete preview-refine acceptance criterion (the frontend-design process for a bespoke mark), not a placeholder. The sitemap edit references the file's existing product-route pattern with an exact test — the implementer reads the one file to mirror it.

**Type consistency:** `Post {slug,date,title_tr/en,excerpt_tr/en,bodyHtml_tr/en}`, `loadPosts()`, `postSlug(post)` are defined in Task 6 and used identically in Task 7. `Logo {mode,class}` (Task 1) is used in Tasks 4 (`mode="full"`) and 1 (footer). `WhatsAppFab {locale}` (Task 3) matches its Base call. i18n keys added in Task 2 are the ones consumed by Tasks 3,4,7,8. `--blush` (Task 1) is consumed by Task 5.

**Note:** New logic (blog helpers, i18n keys, sitemap blog entries) is unit-tested; `.astro`/visual/logo work is gated on build + browser-preview screenshots + unchanged prior tests staying green — the right verification for presentational/brand work. The moon+baby SVG is authored once (Logo + favicon share it) and refined via preview so it reads unmistakably.
