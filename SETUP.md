# Aselovers — E-ticaret Kurulum Rehberi

Site kod olarak hazır. Canlı satış için aşağıdaki **kullanıcı adımlarının** tamamlanması gerekir.
Deploy: Cloudflare Pages, `gnc` remote'una push ile otomatik build. KV binding: `ADMIN_KV`
(wrangler.toml, id `1cddf58babc04fc79efbceb3544481ab`) — hazır.

## 1. Cloudflare Pages ortam değişkenleri (Settings → Environment variables)

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `PAYTR_MERCHANT_ID` | Ödeme için | PayTR mağaza panelinden. |
| `PAYTR_MERCHANT_KEY` | Ödeme için | PayTR mağaza panelinden (gizli). |
| `PAYTR_MERCHANT_SALT` | Ödeme için | PayTR mağaza panelinden (gizli). |
| `PAYTR_TEST_MODE` | Opsiyonel | Test için `1`, **canlı için `0`**. Ayarlanmazsa `1` (test). |
| `SITE_URL` | Evet | `https://aseloves.com` — PayTR dönüş URL'leri için. |
| `GITHUB_TOKEN` | Admin için | Admin'in ürün/blog/ayar (öne çıkanlar dahil) kaydetmesi buna bağlı. Repo `contents:write` yetkili PAT. **Yoksa admin kaydetme 501 verir.** |
| `GITHUB_REPO` | Opsiyonel | Varsayılan `sukruozge/gnclowers`. |
| `JWT_SECRET` | Evet | Admin oturum imzası (uzun rastgele değer). |
| `ADMIN_PASSWORD_HASH` | Evet | Admin şifresinin bcrypt hash'i. |

> **Not:** PayTR anahtarları girilmezse kod `test_*` dummy değerlere düşer — gerçek ödeme
> başarısız olur ama site çökmez. Hesap açıp anahtarları girince ödeme çalışır.

## 2. PayTR paneli

1. PayTR mağaza başvurusu onaylanınca `MERCHANT_ID/KEY/SALT`'ı yukarıdaki env'lere girin.
2. PayTR panelinde **Bildirim (Callback) URL**'sini şu şekilde tanımlayın:
   `https://aseloves.com/api/payment/paytr/callback`
3. Önce `PAYTR_TEST_MODE=1` ile test kartıyla deneyin; sorunsuzsa `0` yapıp canlıya geçin.

Akış: sepet → checkout (adres + bölge) → sunucu fiyatı+kargoyu hesaplar → PayTR iframe →
ödeme → callback siparişi KV'ye tam (müşteri+kalem) yazar → admin **Siparişler** sekmesinde görünür.

## 3. Öne çıkan ürünler ve kargo (admin)

- **Öne çıkanlar:** Admin → Ürünler → ⭐ ile seç. `settings.json`'a yazılır, ana sayfadaki
  "Öne Çıkanlar" ilk 6'yı sıralı gösterir. (Kaydetme `GITHUB_TOKEN` gerektirir.)
- **Kargo ücreti:** `src/data/settings.json` → `shipping` bölümü. Varsayılan 0 (ücretsiz).
  Bölgeye göre ayarlayın, örn:
  ```json
  "shipping": { "tr": { "fee": 0, "freeOver": 0 }, "intl": { "fee": 350 } }
  ```
  `freeOver > 0` ise, TR'de o tutarın üstü ücretsiz olur. Sunucu bu değeri esas alır
  (client fiyatına güvenilmez).

## 4. Yasal sayfalar — DOLDURULACAK

`src/lib/legal.ts` içindeki `SELLER` alanlarını gerçek işletme bilgilerinizle değiştirin:
`legalName, address, taxOffice, taxNo, mersis, phone` (köşeli parantezli `[…]` alanlar).
`kullanim-kosullari` içindeki `[İL]` yetkili mahkeme ilini de girin.
Metinler taslaktır; **canlıya almadan bir hukukçuya kontrol ettirin.**

Sayfalar (footer'da "Yasal" sütunu): Gizlilik, Kullanım Koşulları, Mesafeli Satış Sözleşmesi,
KVKK Aydınlatma, İade ve İptal, Teslimat ve Kargo (TR+EN).

## 5. Pinterest API

Pinterest'in istediği public URL'ler artık mevcut:
- Gizlilik: `https://aseloves.com/en/privacy` (veya `/tr/gizlilik`)
- Kullanım: `https://aseloves.com/en/terms` (veya `/tr/kullanim-kosullari`)

Bunları Pinterest developer başvurusundaki Privacy Policy / Terms of Service alanlarına girin.

## 6. Kapsam dışı (sonraya)

Stok takibi yok (siparişe özel). Ürün varyantı, sipariş e-postası/bildirim, envanter düşümü
ileride eklenebilir. `server.js` yalnızca yerel-dev kopyasıdır; canlı Cloudflare `src/pages/api/**`
kullanır (ödeme mantığı orada güncel).
