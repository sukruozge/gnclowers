# Etsy Sync Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily GitHub Action that pulls active listings from the Etsy shop into `src/data/products.json` and commits on change, so Cloudflare auto-redeploys the catalog.

**Architecture:** Pure, unit-tested mapping logic lives in `src/lib/etsy.ts` (`mapListing`, `detectCategory`). A thin runner `scripts/etsy-sync.ts` (run via `tsx`) does the Etsy HTTP fetch + file write with an empty-result guard. A workflow `.github/workflows/etsy-sync.yml` runs it on a daily cron + manual dispatch and commits `src/data/products.json` only when it changed. The site's `loadProducts()` contract (`{ products: [...] }`, `isActive` filter) is unchanged.

**Tech Stack:** TypeScript, Vitest, `tsx` (TS runner), Node 20, GitHub Actions, Etsy Open API v3 (x-api-key).

## Global Constraints

- Etsy shop name is `aselovers`; sync writes ONLY to `src/data/products.json` in the shape `{ lastSync, shopId, shopName, total, products: [...] }`.
- The produced object per listing MUST match the existing `Product` interface in `src/lib/products.ts` exactly: `id, title_en, title_tr, description_en, description_tr, price, currency, image, url, category, tags, isNew, isActive` (no extra fields like `views`).
- Etsy API key comes only from the `ETSY_API_KEY` env var (a GitHub Actions secret) — never hardcoded, never logged.
- Empty-result guard: if the fetch succeeds but yields 0 products, do NOT overwrite `products.json` (keep the existing catalog); exit 0. Fetch errors exit 1 (red build).
- The workflow commits `src/data/products.json` only when `git diff` shows a change.
- All existing unit tests (27 after the redesign) must stay green; new tests are added test-first.
- Windows + PowerShell + npm for local commands; the Action runs on ubuntu-latest.

---

### Task 1: Pure Etsy mapping module (`src/lib/etsy.ts`)

**Files:**
- Create: `src/lib/etsy.ts`
- Create: `src/lib/etsy.test.ts`

**Interfaces:**
- Consumes: `type Product` from `./products`.
- Produces:
  - `interface EtsyListing` (minimal shape used by the mapper).
  - `function detectCategory(listing: EtsyListing): string`
  - `function isNewListing(listing: EtsyListing, now?: number): boolean`
  - `function mapListing(listing: EtsyListing, now?: number): Product`

- [ ] **Step 1: Write the failing test — `src/lib/etsy.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mapListing, detectCategory, type EtsyListing } from '@lib/etsy';

const base: EtsyListing = {
  listing_id: 4511067258,
  title: 'Personalized Crochet Bunny Plush Doll',
  description: 'Removable dress rabbit.\nSecond line.',
  price: { amount: 191250, divisor: 100, currency_code: 'TRY' },
  url: 'https://www.etsy.com/listing/4511067258/',
  tags: ['bunny', 'amigurumi'],
  state: 'active',
  creation_timestamp: 1000,
  images: [{ url_570xN: 'https://img/570.jpg', url_fullxfull: 'https://img/full.jpg' }],
  translations: [{ language: 'tr', title: 'Örgü Tavşan Bebek', description: 'Çıkarılabilir elbise.\nİkinci.' }],
};

describe('detectCategory', () => {
  it('maps a bunny/plush listing to amigurumi', () => expect(detectCategory(base)).toBe('amigurumi'));
  it('maps a tote bag to bag', () =>
    expect(detectCategory({ ...base, title: 'Handmade tote bag', tags: [], description: '' })).toBe('bag'));
  it('defaults to amigurumi when nothing matches', () =>
    expect(detectCategory({ ...base, title: 'zzz', tags: [], description: '' })).toBe('amigurumi'));
});

describe('mapListing', () => {
  const p = mapListing(base, Date.UTC(2020, 0, 1));
  it('produces the Product shape with a string id', () => {
    expect(p.id).toBe('4511067258');
    expect(typeof p.id).toBe('string');
  });
  it('uses the Turkish translation for tr fields, English for en', () => {
    expect(p.title_tr).toBe('Örgü Tavşan Bebek');
    expect(p.title_en).toBe('Personalized Crochet Bunny Plush Doll');
    expect(p.description_en).toBe('Removable dress rabbit.');
    expect(p.description_tr).toBe('Çıkarılabilir elbise.');
  });
  it('computes price from amount/divisor and reads currency', () => {
    expect(p.price).toBe(1912.5);
    expect(p.currency).toBe('TRY');
  });
  it('prefers url_570xN for the image and marks active', () => {
    expect(p.image).toBe('https://img/570.jpg');
    expect(p.isActive).toBe(true);
  });
  it('falls back to English when there is no tr translation', () => {
    const q = mapListing({ ...base, translations: [] }, Date.UTC(2020, 0, 1));
    expect(q.title_tr).toBe(q.title_en);
    expect(q.description_tr).toBe(q.description_en);
  });
  it('marks isActive false for non-active state', () => {
    expect(mapListing({ ...base, state: 'inactive' }).isActive).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@lib/etsy`.

- [ ] **Step 3: Write `src/lib/etsy.ts`**

```ts
import type { Product } from './products';

export interface EtsyImage { url_570xN?: string; url_fullxfull?: string; }
export interface EtsyTranslation { language: string; title?: string; description?: string; }
export interface EtsyListing {
  listing_id: number | string;
  title?: string;
  description?: string;
  price?: { amount?: number; divisor?: number; currency_code?: string };
  url?: string;
  tags?: string[];
  state?: string;
  creation_timestamp?: number;
  images?: EtsyImage[];
  translations?: EtsyTranslation[];
}

const CATEGORY_MAP: Record<string, string> = {
  amigurumi: 'amigurumi', toy: 'amigurumi', plush: 'amigurumi', doll: 'amigurumi',
  stuffed: 'amigurumi', bunny: 'amigurumi', bear: 'amigurumi', giraffe: 'amigurumi',
  duck: 'amigurumi', flamingo: 'amigurumi',
  bag: 'bag', tote: 'bag', purse: 'bag',
  tieback: 'decor', curtain: 'decor', nursery: 'decor',
  clip: 'accessory', hair: 'accessory', brooch: 'accessory', accessory: 'accessory',
};

export function detectCategory(listing: EtsyListing): string {
  const text = `${listing.title ?? ''} ${listing.description ?? ''} ${(listing.tags ?? []).join(' ')}`.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) return cat;
  }
  return 'amigurumi';
}

export function isNewListing(listing: EtsyListing, now: number = Date.now()): boolean {
  if (!listing.creation_timestamp) return false;
  const createdMs = listing.creation_timestamp * 1000;
  return createdMs > now - 30 * 24 * 60 * 60 * 1000;
}

export function mapListing(listing: EtsyListing, now: number = Date.now()): Product {
  const image = listing.images && listing.images.length > 0
    ? (listing.images[0].url_570xN ?? listing.images[0].url_fullxfull ?? null)
    : null;
  const tr = listing.translations?.find((t) => t.language === 'tr') ?? null;
  const title_en = listing.title ?? '';
  const title_tr = tr?.title ?? title_en;
  const desc_en = (listing.description ?? '').split('\n')[0].substring(0, 200);
  const desc_tr = tr ? (tr.description ?? '').split('\n')[0].substring(0, 200) : desc_en;
  return {
    id: String(listing.listing_id),
    title_en,
    title_tr,
    description_en: desc_en,
    description_tr: desc_tr,
    price: parseFloat(String(listing.price?.amount ?? 0)) / (listing.price?.divisor ?? 100),
    currency: listing.price?.currency_code ?? 'TRY',
    image,
    url: listing.url ?? `https://www.etsy.com/listing/${listing.listing_id}/`,
    category: detectCategory(listing),
    tags: listing.tags ?? [],
    isNew: isNewListing(listing, now),
    isActive: listing.state === 'active',
  };
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test`
Expected: PASS (all `etsy.test.ts` cases green; overall total rises by the new suite).

- [ ] **Step 5: Commit**

```
git add src/lib/etsy.ts src/lib/etsy.test.ts
git commit -m "feat(sync): pure Etsy listing mapper (mapListing, detectCategory)"
```

---

### Task 2: Decouple the inactive-exclusion test from live data

**Files:**
- Modify: `src/lib/products.ts` (add `activeOnly`, use it in `loadProducts`)
- Modify: `src/lib/products.test.ts` (replace the live-data inactive test with a mock-based one)

**Interfaces:**
- Consumes: `type Product`.
- Produces: `function activeOnly(products: Product[]): Product[]` — returns only `isActive` items. `loadProducts()` returns `activeOnly(raw.products)`.

**Why:** the current `src/lib/products.test.ts` "excludes inactive products" test asserts a hardcoded `inactive-fixture-0` is absent from `loadProducts()`. Once the Etsy sync owns `src/data/products.json`, that fixture disappears and the test would fail. Extracting the pure `activeOnly` filter lets the exclusion be tested against a mock, independent of the synced file.

- [ ] **Step 1: Update the failing test — `src/lib/products.test.ts`**

Replace the existing test block:
```ts
  it('excludes inactive products', () => {
    expect(all.some((p) => p.id === 'inactive-fixture-0')).toBe(false);
  });
```
with an import of `activeOnly` (add to the existing import from `@lib/products`) and this mock-based test:
```ts
  it('activeOnly excludes inactive products', () => {
    const mock = [
      { ...all[0], id: 'x-active', isActive: true },
      { ...all[0], id: 'x-inactive', isActive: false },
    ];
    const result = activeOnly(mock);
    expect(result.map((p) => p.id)).toEqual(['x-active']);
  });
```
(Keep the other existing tests — "loads at least one active product", title localization, slug — unchanged. Update the top import line to `import { loadProducts, localizedTitle, productSlug, activeOnly } from '@lib/products';`.)

- [ ] **Step 2: Run — verify it fails**

Run: `npm test`
Expected: FAIL — `activeOnly` is not exported yet.

- [ ] **Step 3: Add `activeOnly` to `src/lib/products.ts`**

Add the export and use it in `loadProducts`:
```ts
export function activeOnly(products: Product[]): Product[] {
  return products.filter((p) => p.isActive);
}

export function loadProducts(): Product[] {
  const list = (raw as { products: Product[] }).products ?? [];
  return activeOnly(list);
}
```
(Replace the existing `loadProducts` body's `.filter((p) => p.isActive)` with the `activeOnly(list)` call; keep the rest of the file — `localizedTitle`, `productSlug`, the `Product` interface — unchanged.)

- [ ] **Step 4: Run — verify pass**

Run: `npm test`
Expected: PASS. The exclusion is now proven against a mock, independent of `src/data/products.json`.

- [ ] **Step 5: Commit**

```
git add src/lib/products.ts src/lib/products.test.ts
git commit -m "refactor(products): extract activeOnly; decouple exclusion test from synced data"
```

---

### Task 3: Etsy sync runner + npm wiring

**Files:**
- Create: `scripts/etsy-sync.ts`
- Modify: `package.json` (add `tsx` devDependency + `sync` script)
- Delete: `sync.js` (legacy CommonJS root-`products.json` version)

**Interfaces:**
- Consumes: `mapListing`, `type EtsyListing` from `../src/lib/etsy`.
- Produces: `npm run sync` — writes `src/data/products.json` from live Etsy data (given `ETSY_API_KEY`).

- [ ] **Step 1: Add `tsx` and the `sync` script to `package.json`**

Run: `npm install -D tsx@^4`
Then add to the `scripts` block: `"sync": "tsx scripts/etsy-sync.ts"`.
(Keep the existing `dev`/`build`/`preview`/`test`/`test:watch` scripts.)

- [ ] **Step 2: Write `scripts/etsy-sync.ts`**

```ts
import { writeFileSync } from 'node:fs';
import { mapListing, type EtsyListing } from '../src/lib/etsy';

const API_KEY = process.env.ETSY_API_KEY ?? '';
const SHOP = process.env.ETSY_SHOP ?? 'aselovers';
const OUT = new URL('../src/data/products.json', import.meta.url);
const LIMIT = 100;

async function etsy(endpoint: string): Promise<any> {
  const res = await fetch(`https://openapi.etsy.com/v3/application/${endpoint}`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!res.ok) throw new Error(`Etsy API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getShopId(): Promise<string> {
  const d = await etsy(`shops?shop_name=${encodeURIComponent(SHOP)}`);
  if (!d.results?.length) throw new Error(`Etsy shop '${SHOP}' not found`);
  return String(d.results[0].shop_id);
}

async function getListings(shopId: string): Promise<EtsyListing[]> {
  const all: EtsyListing[] = [];
  let offset = 0;
  for (;;) {
    const d = await etsy(
      `shops/${shopId}/listings/active?limit=${LIMIT}&offset=${offset}&includes[]=Images&includes[]=Translations`,
    );
    const results: EtsyListing[] = d.results ?? [];
    all.push(...results);
    if (results.length < LIMIT) break;
    offset += LIMIT;
  }
  return all;
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('ETSY_API_KEY is not set — aborting.');
    process.exit(1);
  }
  const shopId = await getShopId();
  const listings = await getListings(shopId);
  const products = listings.map((l) => mapListing(l));
  if (products.length === 0) {
    console.warn('Etsy returned 0 products — keeping existing products.json (no overwrite).');
    process.exit(0);
  }
  const out = {
    lastSync: new Date().toISOString(),
    shopId,
    shopName: SHOP,
    total: products.length,
    products,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Synced ${products.length} products to src/data/products.json`);
}

main().catch((err) => {
  console.error('Sync failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 3: Delete the legacy `sync.js`**

Run: `git rm sync.js`
(The old CommonJS script wrote to the root `products.json`, which the site no longer reads. `scripts/etsy-sync.ts` replaces it.)

- [ ] **Step 4: Verify the runner wires up (no network, no key)**

Run: `npm run sync`
Expected: prints `ETSY_API_KEY is not set — aborting.` and exits non-zero (the empty-key guard — this proves `tsx` runs the TS runner and it imports `mapListing` without error, without needing a real key or network).
Run: `npm test`
Expected: still all green (unchanged lib logic).
Run: `npm run build`
Expected: exit 0 (the new script under `scripts/` is not part of the Astro build; confirm nothing broke).

- [ ] **Step 5: Commit**

```
git add scripts/etsy-sync.ts package.json package-lock.json
git rm sync.js
git commit -m "feat(sync): tsx Etsy sync runner writing src/data/products.json; drop legacy sync.js"
```

---

### Task 4: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/etsy-sync.yml`

**Interfaces:**
- Consumes: `npm run sync` (Task 3) and the `ETSY_API_KEY` repo secret.
- Produces: a scheduled + manual workflow that syncs and commits on change.

- [ ] **Step 1: Write `.github/workflows/etsy-sync.yml`**

```yaml
name: Etsy product sync

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: etsy-sync
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Sync products from Etsy
        run: npm run sync
        env:
          ETSY_API_KEY: ${{ secrets.ETSY_API_KEY }}
          ETSY_SHOP: aselovers
      - name: Commit changes if any
        run: |
          if git diff --quiet -- src/data/products.json; then
            echo "No product changes — nothing to commit."
          else
            git config user.name "aselovers-bot"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add src/data/products.json
            git commit -m "chore(data): sync products from Etsy [automated]"
            git push
          fi
```

- [ ] **Step 2: Validate the workflow YAML parses**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/etsy-sync.yml','utf8'); if(!/on:|workflow_dispatch|npm run sync|ETSY_API_KEY/.test(y)) throw new Error('workflow missing key parts'); console.log('workflow OK')"`
Expected: prints `workflow OK`. (A full run happens only on GitHub; see Step 4.)

- [ ] **Step 3: Commit**

```
git add .github/workflows/etsy-sync.yml
git commit -m "ci(sync): daily + manual Etsy product sync workflow"
```

- [ ] **Step 4: Post-merge manual verification (user + controller)**

After this branch is merged to `main`:
1. The user adds the `ETSY_API_KEY` repository secret (GitHub → Settings → Secrets and variables → Actions → New repository secret; name `ETSY_API_KEY`).
2. In the GitHub **Actions** tab, open **"Etsy product sync"** → **Run workflow** (manual dispatch).
3. Confirm the run is green. If products changed vs the seed, it commits `src/data/products.json`, which triggers a Cloudflare Pages deploy; the live catalog then reflects the current Etsy shop.
4. If the run fails with an Etsy auth/permission error, the API-key-only path is insufficient for this shop → an OAuth variant is a separate plan (out of scope here).

---

## Self-Review

**Spec coverage (vs. design doc §2–§7):**
- §2/§3 workflow + runner + pure module → Tasks 1, 3, 4. ✓
- §3 `mapListing`/`detectCategory` pure + tested → Task 1. ✓
- §3 remove legacy `sync.js` → Task 3 Step 3. ✓
- §3 test adaptation (decouple inactive test) → Task 2. ✓
- §4 output shape `{ lastSync, shopId, shopName, total, products }` → Task 3 Step 2. ✓
- §5 empty-result guard + fetch-error exit codes + commit-only-on-change → Task 3 (`main` guard) + Task 4 (`git diff --quiet`). ✓
- §5 secret only via env, never logged → Task 3 (reads `process.env`, never prints the key) + Task 4 (`secrets.ETSY_API_KEY`). ✓
- §7 user secret step → Task 4 Step 4. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete. Task 4's "post-merge manual verification" is a genuine external step (a GitHub-hosted run needing the user's secret), not a placeholder — the local YAML validation in Step 2 is the automatable gate.

**Type consistency:** `mapListing(listing, now?)`, `detectCategory(listing)`, `EtsyListing`, `activeOnly(products)`, and the `Product` shape are used identically across Tasks 1–3. The runner imports `mapListing`/`EtsyListing` from `../src/lib/etsy` exactly as exported. `Product` has no `views` field, and `mapListing` does not emit one — matches the existing interface.

**Note:** The Etsy HTTP orchestration in `scripts/etsy-sync.ts` is not unit-tested (network IO); its correctness rests on the tested `mapListing` plus the real `workflow_dispatch` run in Task 4 Step 4. This is the appropriate boundary — pure logic is tested, IO is verified by one real run.
