# Aselovers — Çift Dilli Cloudflare Vitrini (Faz 1) — Tasarım Dokümanı

**Tarih:** 2026-06-30
**Durum:** Onaylandı (tasarım) — uygulama planı bekliyor
**Kapsam:** Faz 1 (Vitrin). Sepet/ödeme/sipariş yönetimi Faz 2'ye ertelendi.

---

## 1. Amaç ve Başarı Kriterleri

Aselovers (el yapımı amigurumi markası) için, Etsy mağazasından beslenen, Türkiye ve ABD pazarlarına hizmet eden **çift dilli (TR/EN), SEO dostu, sunucusuz** bir vitrin sitesi. Site Cloudflare üzerinde, GitHub deposundan otomatik yayınlanır. Ayrı bir barındırma (hosting) yoktur.

**Başarı kriterleri:**
- `/tr/` ve `/en/` altında gerçek (pre-rendered) HTML sayfalar Google tarafından ayrı dillerde indekslenebilir.
- Ürünler Etsy API'sinden otomatik (günde 2 kez) ve admin'den manuel olarak güncellenir; Etsy API anahtarı asla tarayıcıya düşmez.
- Giriş korumalı admin paneli canlı çalışır (Etsy sync tetikleme, vitrin ayarı, kargo bilgisi, abone listesi, TR/EN içerik düzenleme).
- Saldırı yüzeyi minimumda: statik site + birkaç sıkı güvenlikli Cloudflare Function. Çalışan açık sunucu/veritabanı portu yok.

**Faz 1 DIŞI:** Gerçek sepet, ödeme (Stripe/iyzico), bölgeye göre kargo *hesabı*, sipariş yönetimi, Etsy ile çift yönlü stok senkronu. "Satın Al" butonu ürünün Etsy sayfasına yönlendirir.

---

## 2. Mimari

**Seçilen yaklaşım: Build-time statik üretim + otomatik yeniden yayın (Yaklaşım A).**

```
GitHub Repo ──push/deploy──► Cloudflare Pages (statik HTML/CSS/JS + Functions)
     ▲                              │
     │                              ├─ /functions/api/*  → Cloudflare Pages Functions
     │                              │     ├─ POST /api/subscribe         (abone toplama)
     │                              │     ├─ POST /api/admin/login       (JWT httpOnly cookie)
     │                              │     ├─ POST /api/admin/logout
     │                              │     ├─ GET/POST /api/admin/settings (KV)
     │                              │     ├─ GET/POST /api/admin/shipping (KV)
     │                              │     ├─ GET/POST /api/admin/overrides(KV: vitrin ayarı)
     │                              │     ├─ GET/POST /api/admin/content  (KV: TR/EN içerik)
     │                              │     ├─ GET      /api/admin/subscribers (+ CSV)
     │                              │     └─ POST /api/admin/sync         (Deploy Hook tetikle)
     │                              └─ Cloudflare KV (subscribers, settings, shipping,
     │                                                overrides, content, ratelimit sayaçları)
     │
  GitHub Action (cron, günde 2x + manuel) ── Etsy API ──► products.json ──commit──► yeni deploy
```

**Bileşenler ve sorumlulukları:**

| Birim | Ne yapar | Bağımlılığı |
|---|---|---|
| `build` betiği | `products.json` + içerik + şablonlardan `/tr/` ve `/en/` statik HTML üretir | products.json, content/i18n verisi, şablonlar |
| GitHub Action (sync) | Etsy API'den ürünleri çeker → `products.json` yazar → commit | Etsy API key (Action secret) |
| Cloudflare Pages | Statik dosyaları CDN'den sunar, Functions'ı çalıştırır | GitHub deposu |
| Pages Functions | Abone, admin oturumu, KV okuma/yazma, sync tetikleme | KV, Worker secret'ları |
| Cloudflare KV | Çalışma-zamanı durumu (abone, ayar, kargo, override, içerik) | — |
| Deploy Hook | Admin "Sync now" / içerik kaydı sonrası yeniden yayın tetikler | Cloudflare deploy hook URL'i (Worker secret) |

**Gizli bilgiler:** `ETSY_API_KEY` (Action secret + Worker secret), `JWT_SECRET`, `ADMIN_PASSWORD_HASH` (PBKDF2), `DEPLOY_HOOK_URL` — hepsi Cloudflare/GitHub secret'larında; depoda veya tarayıcıda asla bulunmaz.

---

## 3. URL ve Dil Yapısı (SEO çekirdeği)

```
/                  → ziyaretçi ülkesine göre 302: TR → /tr/, diğer → /en/ (Cloudflare request.cf.country)
/tr/               /en/                 (ana sayfa)
/tr/urunler        /en/products         (katalog)
/tr/urun/<slug>    /en/product/<slug>   (ürün detay)
/tr/hakkimizda     /en/about
/tr/blog           /en/blog
/tr/iletisim       /en/contact
```

- Kök `/` yönlendirmesi küçük bir Function ile yapılır; dil seçimi çereze yazılır ama **URL daima dili belirtir** (SEO için zorunlu).
- Her sayfada `<link rel="alternate" hreflang="tr">`, `hreflang="en">`, `hreflang="x-default">` ve `<link rel="canonical">`.
- `<html lang="tr|en">` doğru ayarlanır.
- Ürün slug'ı: ilgili dildeki başlıktan üretilir (örn. `el-yapimi-tavsan` / `handmade-bunny`); Etsy `listing_id` ile eşleştirilir (slug çakışmasında id eki).

---

## 4. Etsy Entegrasyonu ve Veri Modeli

- Mevcut `sync.js` mantığı korunur (zaten `title_en/title_tr`, `description_en/tr`, `price`, `currency`, `image`, `category`, `tags`, `url`, `isNew` üretiyor) ve GitHub Action içinde çalışacak şekilde uyarlanır.
- Etsy v3 `getListingsByShop` (state=active) yalnızca **API key** ile erişilebilir (OAuth gerekmez) — Faz 1 için yeterli.
- Çıktı: `products.json` (repoya commit'lenir, build girdisi).
- **Vitrin override modeli (KV `overrides`):** `{ <listing_id>: { featured: bool, order: number, hidden: bool, category: string } }`. Build sırasında `products.json` ile birleştirilir (admin değişikliği bir sonraki deploy'da yansır).

**Ürün veri şeması (build girdisi, ürün başına):**
```
id, title_en, title_tr, description_en, description_tr,
price, currency, image, url (Etsy linki), category, tags[], isNew, isActive
```

---

## 5. SEO

- Tüm sayfa içeriği **statik, anlamlı HTML** (JS olmadan da okunur).
- Her sayfada dile özel `<title>` ve meta `description` (TR/EN ayrı), Open Graph ve Twitter Card etiketleri.
- Ürün sayfalarında **Schema.org Product + Offer JSON-LD** (ad, görsel, fiyat, para birimi, mevcudiyet, Etsy URL).
- Otomatik üretilen `sitemap.xml` (her iki dilin tüm URL'leri) ve `robots.txt`.
- Performans: Cloudflare CDN, optimize/lazy görseller, kritik CSS, hızlı LCP. Mevcut `style.css` korunur.
- `SITE_URL`: mevcut Cloudflare-yönetimli üretim alan adı (canonical/hreflang/sitemap mutlak URL'leri için tek kaynak; build yapılandırmasında değişken olarak tutulur).

---

## 6. Kargo Bilgisi (bölge/dile göre)

- Faz 1'de gerçek hesaplama yok; **admin'den düzenlenebilir bilgilendirme metni**.
- KV `shipping`: `{ tr: { label, eta, cost, note }, us: { label, eta, cost, note } }` (TR ve EN metin alanlarıyla).
- Ürün detay ve katalog alanlarında, ziyaretçinin diline/ülkesine göre uygun blok gösterilir (örn. ABD'ye kargo süresi/ücreti; Türkiye içi ücret).
- Bu yapı Faz 2'de gerçek kargo *hesabına* evrilecek temeli oluşturur.

---

## 7. Admin Panel ve Güvenlik

- Mevcut `admin.html` arayüzü korunur/uyarlanır; backend Express yerine **Pages Functions**.
- **Kimlik doğrulama:** kullanıcı adı + şifre. Şifre **Web Crypto PBKDF2** ile doğrulanır (Workers uyumlu; `bcryptjs` yerine). Başarılı girişte **JWT (HS256)**, `httpOnly + SameSite=Strict + Secure` çerezde.
- **Korumalar:**
  - Rate limit (genel + giriş) — KV tabanlı sayaç.
  - Brute-force kilidi (örn. 5 hatalı deneme → IP geçici blok).
  - CSRF: özel başlık doğrulaması (`X-Ase-Admin: 1`) + SameSite=Strict.
  - Güvenlik başlıkları Cloudflare Pages `_headers` ile: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. `img-src` Etsy (`i.etsystatic.com`) için izinli.
  - Kimlik bilgileri (admin hash, JWT secret) Worker secret'ında; depoda yok.
- **Yetenekler:** Etsy sync tetikleme (Deploy Hook), vitrin override yazma, kargo metni düzenleme, abone listesi görüntüleme + CSV indirme, Hakkımızda/Blog/Ana sayfa TR-EN içerik düzenleme. Hepsi KV'ye yazar; içerik/vitrin değişiklikleri Deploy Hook ile yayına alınır.

---

## 8. Mevcut Express Uygulamasından Geçiş

- `server.js` (Express) **kaldırılır**; uç noktaları Pages Functions'a taşınır.
- `sync.js` GitHub Action'a taşınır (Node 18+ yerleşik `fetch` kullanır).
- Mevcut `style.css` (premium redesign) ve mevcut sayfa şablonları **korunur ve uyarlanır** — sıfırdan görsel tasarım yok.
- `data/*.json` (subscribers, settings, activity) → Cloudflare KV anahtarlarına taşınır.
- `node_modules` ve Express bağımlılıkları üretim yayınından çıkarılır; build/araç bağımlılıkları sadece geliştirme/Action ortamında.

---

## 9. Riskler ve Notlar

- **Etsy oran sınırı:** Action günde 2 kez çalışır; admin "Sync now" makul aralıkla sınırlanır.
- **Admin gecikmesi:** Vitrin/içerik değişiklikleri yeniden yayın (~1 dk) sonrası görünür — kabul edildi.
- **KV tutarlılığı:** KV nihai-tutarlıdır; abone/ayar gibi düşük frekanslı veriler için uygundur.
- **Faz 2 köprüsü:** Kargo ve ürün veri modelleri, ileride gerçek sepet/ödeme eklenebilecek şekilde tasarlanır.

---

## 10. Faz 2 (Sonraki Spec — bu kapsamda DEĞİL)

Gerçek sepet, ödeme sağlayıcı entegrasyonu (ABD için Stripe / Türkiye için iyzico-PayTR), bölgeye göre gerçek kargo hesabı, sipariş yönetimi, Etsy ↔ site stok senkronu, KVKK/iade akışları. Kendi spec → plan → uygulama döngüsünü alır.
