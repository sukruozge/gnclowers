# Tedarikçi Üretim Bilgi Portalı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-10-27-tedarikci-portali-design.md`

**Goal:** Tedarikçilerin giriş yapıp ürün bazında iplik/renk kodu/tarif PDF/dikkat notu girdiği,
adminin tek tablodan izleyip CSV aldığı portal.

**Architecture:** Veriler Cloudflare KV'de (`ADMIN_KV`), kimlik mevcut `@lib/admin/auth`
(PBKDF2 + HS256 JWT) ile ayrı `aselovers_supplier` çerezi. Saf mantık (`validate`, `csv`,
`store`) `src/lib/supplier/` altında test edilebilir modüller; HTTP katmanı
`src/pages/api/supplier/[...action].ts`; arayüz `src/pages/tedarikci/index.astro` (vanilla JS);
admin tarafı `public/admin/suppliers.js` + dashboard.html'e nav/page eklemesi.

**Tech Stack:** Astro 5 (output static, API rotaları `prerender=false`), Cloudflare Pages + KV,
Vitest, vanilla JS, site CSS token'ları.

## Global Constraints

- Yanıt dili ve tüm arayüz metinleri Türkçe.
- Yeni bağımlılık eklenmez; yeni ortam değişkeni yok (`JWT_SECRET`, `ADMIN_KV` mevcut).
- Admin API dosyası (`[...action].ts`, 835 satır) büyütülmez; yalnızca `isAuthed` rol düzeltmesi.
- Tüm kullanıcı metinleri sunucuda `clip()` ile kesilir, istemcide `esc()` ile kaçışlanır.
- PDF yalnız kimlikli uçlardan iner; `public/`'e asla yazılmaz. Maks 6 MB, `%PDF-` imzası şart.
- Her görev sonunda `npm test` yeşil; görev commit'leri conventional commits.

---

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/lib/supplier/types.ts` | `SupplierAccount`, `YarnLine`, `ProductSpec`, `StoredFile`, `KvLike` tipleri |
| `src/lib/supplier/validate.ts` | `clip`, `normalizeUsername`, `validateNewAccount`, `normalizeSpec`, `validatePdf` |
| `src/lib/supplier/csv.ts` | `csvCell` (kaçışlama + formül koruması), `specsToCsv` |
| `src/lib/supplier/store.ts` | KV erişimi: hesap CRUD, spec get/put/list, file get/put/delete |
| `src/lib/admin/session.ts` | `isAdminPayload`, `isSupplierPayload` — rol ayrımı tek yerde |
| `src/pages/api/supplier/[...action].ts` | Router + handler'lar (tedarikçi ve `admin/*`) |
| `src/pages/tedarikci/index.astro` | Portal sayfası (giriş / liste / form), inline script |
| `public/admin/suppliers.js` | Dashboard "Tedarikçiler" sayfasının JS'i |
| `public/admin/dashboard.html` | Nav butonu, `page-suppliers` div'i, script tag, `showPage` kancası |
| `public/robots.txt` | `Disallow: /tedarikci/` |
| `src/pages/api/admin/[...action].ts` | `isAuthed` → `isAdminPayload` kullanır |

---

### Task 1: Tipler + doğrulama modülü (TDD)

**Files:** Create `src/lib/supplier/types.ts`, `src/lib/supplier/validate.ts`,
Test `src/lib/supplier/validate.test.ts`

**Interfaces (Produces):**
```ts
clip(v: unknown, max: number): string                       // kontrol karakterleri sil, trim, kes
normalizeUsername(v: unknown): string | null                 // küçük harf, /^[a-z0-9._-]{3,32}$/ değilse null
validateNewAccount(b: unknown): { ok: true; name: string; username: string; password: string } | { ok: false; error: string }
  // name 2..80, password ≥ 8
normalizeSpec(b: unknown, ids: { productId: string; supplierId: string }, prev?: ProductSpec): ProductSpec
  // yarns ≤ 30, her alan ≤ 120; notes ≤ 4000; patternUrl yalnız http(s) ≤ 500; isComplete boolean;
  // hasFile/fileName/createdAt prev'den korunur; updatedAt = now ISO
validatePdf(filename: unknown, base64: unknown): { ok: true; filename: string; bytes: Uint8Array } | { ok: false; error: string }
  // filename ≤ 120, .pdf ile bitmeli; base64 decode; ilk 5 byte "%PDF-"; ≤ 6*1024*1024
```

- [ ] Test yaz: clip kontrol karakteri/uzunluk; normalizeUsername büyük harf→küçük, geçersiz karakter→null, uzunluk sınırları; validateNewAccount kısa şifre hata; normalizeSpec 31 iplik→30, uzun notes kesilir, patternUrl `javascript:`→'' , prev.hasFile korunur; validatePdf imzasız→hata, 6 MB üstü→hata, geçerli→bytes.
- [ ] `npx vitest run src/lib/supplier/validate.test.ts` → FAIL (modül yok)
- [ ] Modülleri yaz → PASS
- [ ] Commit: `feat(supplier): tipler ve doğrulama modülü`

### Task 2: CSV modülü (TDD)

**Files:** Create `src/lib/supplier/csv.ts`, Test `src/lib/supplier/csv.test.ts`

**Interfaces:**
```ts
csvCell(v: unknown): string   // "..." ile sar, " → "", başı =+-@ ise önüne ' koy
specsToCsv(rows: Array<{ spec: ProductSpec; supplierName: string; productTitle: string }>): string
  // BOM + başlık satırı; ayraç ';'; iplikler "marka adı renkKodu renkAdı (kullanım, miktar) | ..." ; CRLF
```

- [ ] Test: `;`/`"`/`\n` içeren hücre kaçışlanır; `=SUM()` başı `'` alır; satır sayısı = kayıt + 1; BOM ile başlar.
- [ ] FAIL → yaz → PASS → Commit: `feat(supplier): CSV dışa aktarım`

### Task 3: Store (KV) modülü (TDD, sahte KV ile)

**Files:** Create `src/lib/supplier/store.ts`, Test `src/lib/supplier/store.test.ts`

**Interfaces:**
```ts
interface KvLike { get(k: string): Promise<string|null>; put(k: string, v: string, o?: {expirationTtl?: number}): Promise<void>;
                   delete(k: string): Promise<void>; list(o: {prefix: string; cursor?: string}): Promise<{keys: {name: string}[]; list_complete: boolean; cursor?: string}> }
createStore(kv: KvLike) → {
  listAccounts(): Promise<SupplierAccount[]>
  createAccount(input: {name; username; passwordHash}): Promise<SupplierAccount>   // username çakışırsa throw Error('username-taken')
  updateAccount(id, patch: Partial<Pick<SupplierAccount,'name'|'isActive'|'passwordHash'|'lastLoginAt'>>): Promise<SupplierAccount|null>
  deleteAccount(id): Promise<boolean>
  findByUsername(username): Promise<SupplierAccount|null>
  getAccount(id): Promise<SupplierAccount|null>
  getSpec(productId, supplierId): Promise<ProductSpec|null>
  putSpec(spec: ProductSpec): Promise<void>
  deleteSpec(productId, supplierId): Promise<void>            // dosyayı da siler
  listSpecs(filter?: {supplierId?: string}): Promise<ProductSpec[]>   // list(prefix) + get; sayfalama cursor ile
  getFile(productId, supplierId): Promise<StoredFile|null>
  putFile(productId, supplierId, f: StoredFile): Promise<void>  // spec.hasFile/fileName günceller (spec yoksa iskelet oluşturur)
  deleteFile(productId, supplierId): Promise<void>             // spec.hasFile=false
}
```

- [ ] Test (Map tabanlı sahte KV): hesap oluştur/listele; aynı username → throw; update isActive; delete; spec put/get/list filtreli; putFile → hasFile true; deleteFile → false; deleteSpec dosyayı da siler.
- [ ] FAIL → yaz → PASS → Commit: `feat(supplier): KV store`

### Task 4: Admin/supplier rol ayrımı (güvenlik düzeltmesi)

**Files:** Create `src/lib/admin/session.ts`, Test `src/lib/admin/session.test.ts`,
Modify `src/pages/api/admin/[...action].ts` (`isAuthed`, satır ~132-139)

**Interfaces:**
```ts
isAdminPayload(p: Record<string,unknown>|null): boolean     // p?.sub === 'admin'
isSupplierPayload(p): p is { role: 'supplier'; sid: string; name: string }
```
- [ ] Test: `{sub:'admin'}` → true; `{role:'supplier', sid:'x'}` → false; null → false; supplier payload tanınır.
- [ ] FAIL → yaz → admin `isAuthed` içinde `return isAdminPayload(payload)` → PASS
- [ ] Commit: `fix(admin): tedarikçi JWT'si admin oturumu olarak kabul edilmez`

### Task 5: Tedarikçi API rotası

**Files:** Create `src/pages/api/supplier/[...action].ts`

Spec'teki tüm uçlar. Yardımcılar admin API'den kopyalanır (json, parseCookie, readBody — body
limiti dosya için 9 MB, diğer uçlar 256 KB). Ürün kataloğu: `import productsFile from
'../../../data/products.json'` → aktif id seti. JWT payload `{ role:'supplier', sid, name }`,
7 gün. Login: rate limit `sup:rl:{ip}` 10/15dk, `findByUsername`, `isActive`, `verifyPassword`,
`lastLoginAt` güncelle. Her korumalı uçta hesap tekrar okunur ve `isActive` değilse 401.
`admin/*` uçları `aselovers_admin` çerezi + `isAdminPayload`.

- [ ] Rota yaz. `npm run build` ile tip/derleme doğrula.
- [ ] Commit: `feat(supplier): tedarikçi ve admin API uçları`

### Task 6: Portal sayfası `/tedarikci/`

**Files:** Create `src/pages/tedarikci/index.astro`; Modify `public/robots.txt`

Kendi `<html>` iskeleti (Base kullanılmaz: Nav/Footer/Chat/analitik istenmiyor), `tokens.css`
+ `global.css` import, Google Fonts linki Base'dekiyle aynı, `<meta name="robots"
content="noindex,nofollow">`. Üç `section` (`#view-login`, `#view-list`, `#view-form`), hash
router. Ürünler `/products.json` → `isActive` filtreli; kayıt özetleri `/api/supplier/specs`.
Form: iplik satırları (6 sütun), diğer alanlar, PDF dropzone (FileReader → base64 → POST),
kaydet. 401'de login'e dön ve `sessionStorage['sup_draft']`'a formu yaz; girişten sonra geri yükle.

- [ ] Sayfa yaz; `npm run build` → `dist/tedarikci/index.html` üretildiğini doğrula.
- [ ] robots.txt'e her User-agent bloğuna `Disallow: /tedarikci/` ekle (AI botları `*` bloğunu kalıtlamaz).
- [ ] Commit: `feat(supplier): tedarikçi portal sayfası`

### Task 7: Admin dashboard "Tedarikçiler" sayfası

**Files:** Create `public/admin/suppliers.js`; Modify `public/admin/dashboard.html`
(nav ~satır 780 öncesi, page div `page-settings`'ten önce, `showPage` titles + loader, `<script src>`)

`suppliers.js` global fonksiyonlar: `loadSuppliersPage()`, `supTab(name, btn)`,
`supCreateAccount()`, `supGenPassword()`, `supToggleActive(id, on)`, `supResetPassword(id)`,
`supDeleteAccount(id)`, `supShowSpec(pid, sid)`, `supDeleteSpec(pid, sid)`, `supExportCsv()`,
`supFilter()`. Mevcut `toast`, `esc`, `openModal`, `ADM_HDR` kullanılır. Ürün adları
`/products.json`'dan fetch edilir.

- [ ] Yaz; dashboard.html'e 4 küçük ekleme.
- [ ] Commit: `feat(admin): tedarikçi hesapları ve üretim bilgileri sayfası`

### Task 8: Doğrulama ve yayın

- [ ] `npm test` tümü yeşil; `npm run build` başarılı.
- [ ] `git push gnc main`; canlıda smoke: `/tedarikci/` 200, `/api/supplier/me` 401.
- [ ] Memory'ye `supplier-portal` notu (nasıl hesap açılır, KV anahtarları).
