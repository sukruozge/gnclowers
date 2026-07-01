# Aselovers — Etsy Sync Automation (Plan 2) — Design Doc

**Tarih:** 2026-07-01
**Durum:** Onaylandı (tasarım) — uygulama planı bekliyor
**Kapsam:** Ürün kataloğunu Etsy'den otomatik güncelleyen bir GitHub Actions iş akışı. Sitenin görünen katmanı ve altyapısı (Astro, i18n, SEO, `/` yönlendirme, Cloudflare deploy) değişmez; yalnızca `src/data/products.json` artık otomatik beslenir.

---

## 1. Amaç ve Başarı Kriterleri

Aselovers'ın ürünleri şu an el ile hazırlanmış `src/data/products.json` seed'inden geliyor. Bu plan, ürünleri **Etsy mağazasından (aselovers) otomatik** çekip günlük olarak siteye yansıtan bir otomasyon kurar.

**Başarı kriterleri:**
- Bir GitHub Actions iş akışı günde bir kez (ve elle) Etsy'den aktif ürünleri çeker, sitenin beklediği şekle dönüştürüp `src/data/products.json`'a yazar, değiştiyse commit'ler; Cloudflare Pages push üzerine otomatik yeniden yayınlar.
- Etsy API anahtarı yalnızca bir **GitHub Actions secret** olarak durur; depoda veya tarayıcıda asla bulunmaz.
- Transient bir Etsy hatasında veya 0 ürün dönüşünde katalog **kazara boşaltılmaz** (dosya korunur).
- Ürün eşleme mantığı (`mapListing`) saf ve **birim-test edilir**.
- Mevcut testler (redesign sonrası 27) kırılmaz.

**Kapsam DIŞI:** Ürün JSON-LD (redesign Task 6'da yapıldı), OAuth'lu Etsy akışı (API-key yeterli; OAuth ayrı iş), sepet/ödeme (Faz 2), admin (Plan 3).

---

## 2. Mimari

```
GitHub Actions (cron günlük + workflow_dispatch)
  → node scripts/etsy-sync.mjs
      → Etsy v3 API (x-api-key):  shops?shop_name=aselovers  → shop_id
                                   shops/{id}/listings/active (+Images,+Translations)
      → mapListing() her listing → Product
      → guard: products.length > 0 değilse ÇIK (yazma yok)
      → src/data/products.json'a yaz (shape: { lastSync, shopId, shopName, total, products[] })
  → git diff: değiştiyse commit + push origin main
  → (push) Cloudflare Pages otomatik build + deploy
```

**Gizli/ayar:** `ETSY_API_KEY` (Actions secret), `ETSY_SHOP=aselovers` (workflow env). Kullanıcı secret'ı bir kez elle ekler (Settings → Secrets and variables → Actions).

---

## 3. Bileşenler

- **`scripts/etsy-sync.mjs`** (yeni; mevcut kök `sync.js`'in yerine geçer, ESM + Node 20 yerleşik `fetch`):
  - `mapListing(listing) → Product` — saf fonksiyon: Etsy listing'i sitenin `Product` şekline dönüştürür (`id, title_en/tr, description_en/tr, price, currency, image, url, category, tags, isNew, isActive`). TR çevirisi varsa `title_tr/description_tr` ondan; yoksa EN'e düşer. `category` `detectCategory` ile.
  - `detectCategory(listing) → string` — başlık/etiketlerden kategori (amigurumi/bag/accessory/decor); saf, test edilebilir.
  - Orkestrasyon: shop_id al → tüm aktif listing'leri sayfalayarak çek → `mapListing` → guard → `src/data/products.json` yaz.
  - `ETSY_API_KEY` yoksa net hata verip çıkar (exit 1).
- **`scripts/etsy-sync.test.ts`** — `mapListing` ve `detectCategory` için birim testler (sabit örnek listing'lerle; ağ yok).
- **`.github/workflows/etsy-sync.yml`** — cron + workflow_dispatch; Node 20; `npm ci`; `node scripts/etsy-sync.mjs`; değişiklik varsa commit/push.
- **Kaldırılır:** kök `sync.js` (eski, kök `products.json`'a yazan CommonJS sürüm).
- **Test uyarlaması:** `src/lib/products.test.ts`'teki "pasif ürünü dışla" testi, canlı `src/data/products.json`'daki `inactive-fixture-0`'a bağlı olmaktan çıkarılır; onun yerine `filterByCategory`/filtre mantığı zaten `src/lib/catalog.test.ts`'te mock veriyle test edildiği için, products testinde canlı-veriye bağlı iddia kaldırılır ve `loadProducts()`'ın yalnızca aktif ürün döndürdüğü, dosyadan bağımsız bir mock ile doğrulanacak şekilde güncellenir. (Detay uygulama planında.)

---

## 4. Veri Akışı ve Şekil

Çıktı dosyası `src/data/products.json`:
```json
{ "lastSync": "<ISO8601>", "shopId": "<id>", "shopName": "aselovers",
  "total": <n>, "products": [ { /* Product */ } ] }
```
Site `loadProducts()` yalnızca `.products` dizisini okur ve `isActive` filtreler — mevcut sözleşme korunur.

---

## 5. Hata Yönetimi ve Güvenlik Önlemleri

- **Boş/başarısız çekim koruması:** Etsy çağrısı hata verirse script exit 1 ile durur (Action kırmızı olur, dosya değişmez). Çekim başarılı ama `products.length === 0` ise: uyarı basıp **yazmadan** çık (mevcut katalog korunur).
- **Yalnızca değişiklikte commit:** iş akışı `git diff --quiet src/data/products.json` ile kontrol eder; değişiklik yoksa commit atmaz (gereksiz rebuild yok).
- **Rate limit:** günde 1 çağrı seti; Etsy app kotasının çok altında.
- **Secret sızıntısı yok:** anahtar sadece Action ortamında; loglara basılmaz.
- **Etsy erişim riski:** v3 `getListingsByShop` (state=active) API-key ile public erişilebilir; Etsy tarafında kısıt çıkarsa Action görünür şekilde hata verir → OAuth'lu varyant ayrı bir plan olur (bu kapsamda değil).

---

## 6. Test Stratejisi

- `mapListing`/`detectCategory` saf fonksiyon → Vitest birim testleri (RED→GREEN), sabit örnek listing'lerle; ağ çağrısı yok.
- Orkestrasyon/HTTP kısmı birim-test edilmez (ağ); Action'ın kendisi elle `workflow_dispatch` ile bir kez çalıştırılıp doğrulanır (ilk gerçek sync).
- Tüm mevcut testler yeşil kalır; toplam test sayısı `mapListing`/`detectCategory` testleriyle artar.

---

## 7. Kullanıcının Elle Adımı (bir kez)

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
- Name: `ETSY_API_KEY`, Value: Etsy uygulamanızın keystring'i.
Sonra Actions sekmesinden iş akışı elle bir kez çalıştırılıp (workflow_dispatch) ilk gerçek sync doğrulanır.

---

## 8. Bu Kapsamda DEĞİL
Ürün JSON-LD (yapıldı), OAuth akışı, sepet/ödeme (Faz 2), admin/KV/güvenlik (Plan 3), Etsy→site ters stok senkronu.
