# E-ticaret + PayTR Altyapısı — Tamamlama & Sağlamlaştırma

Tarih: 2026-07-06 · Durum: onaylı (kullanıcı otonomi verdi) · Marka: Aselovers

## Bağlam / bulgu

Kapsamlı tarama sonucu: e-ticaret iskeleti **zaten uçtan uca kurulu** (sepet, checkout,
PayTR token endpoint, callback/webhook, başarılı/başarısız sayfaları, admin sipariş listesi).
İş sıfırdan kurmak değil; **eksikleri kapatmak, güvenilirliği artırmak ve admin'i düzeltmek.**

## Kararlar (kullanıcı onayı)

- PayTR hesabı henüz yok → kod hazır, anahtarlar sonra Cloudflare env'e. Test-mode güvenli.
- Kargo: **bölgeye göre** (TR / yurt dışı), admin'den ayarlanabilir.
- Stok/envanter takibi **yok** (siparişe özel örülüyor).
- Yasal sayfalar: **tam TR e-ticaret seti** (TR+EN); işletme-özel alanlar işaretli placeholder.

## Fazlar

### Faz 1 — Öne çıkan ürünler (admin → sunucu → vitrin) [kullanıcının bildirdiği bug]
Bugün admin'deki ⭐ yalnızca `localStorage`'a yazıyor, vitrin hiç okumuyor; `FeaturedProducts`
ilk 6 aktif ürünü gösteriyor. Çözüm: `settings.json` içine `featured: [id...]` (Etsy sync'i
survive eder). Admin `PUT /api/admin/settings` bunu kaydeder; `FeaturedProducts.astro` bu
listeyi okur (sıralı, aktif), boşsa ilk-6 fallback. Admin ⭐ toggle sunucuya yazar.

### Faz 2 — Sipariş bütünlüğü & güvenilirlik
- `paytr.ts` (init): ödeme başlarken `pending_order:{oid}` KV kaydı (müşteri + sepet kalemleri
  + tutar + kargo + dil).
- `callback.ts`: başarıda `pending_order`'ı okuyup **tam sipariş** oluşturur; **idempotensi**
  (aynı `orderId` varsa tekrar eklemez — PayTR retry'lerine karşı); müşteri/kalem bilgisiyle
  `orders` dizisine yazar; `pending_order`'ı siler.
- Admin sipariş sayfası: müşteri adı/adres/telefon + sipariş kalemleri detayını gösterir.

### Faz 3 — Bölgeye göre kargo
- `settings.json` → `shipping: { tr:{fee,freeOver}, intl:{fee} }` (admin ayarlanabilir,
  varsayılan 0 = sürpriz ücret yok).
- Checkout'a **ülke/bölge seçimi** (Türkiye / Yurt dışı). Kargo sunucuda hesaplanır ve
  toplama eklenir (client fiyatına güvenilmez); sepet/checkout kargo satırını gösterir.

### Faz 4 — Yasal sayfalar (tam set, TR+EN)
Gizlilik, Kullanım Koşulları, Mesafeli Satış Sözleşmesi, KVKK Aydınlatma, İade & İptal,
Teslimat & Kargo. Ortak sade layout, footer linkleri, i18n anahtarları. İşletme unvanı/adres/
vergi no gibi alanlar `[DOLDURULACAK]` işaretli (kullanıcı tamamlar). Pinterest API'nin istediği
public Gizlilik + Kullanım URL'lerini de karşılar.

### Faz 5 — Konfig & kurulum rehberi
`SETUP.md`: gerekli env (PAYTR_MERCHANT_ID/KEY/SALT, PAYTR_TEST_MODE, GITHUB_TOKEN, JWT_SECRET,
ADMIN_PASSWORD_HASH, SITE_URL), PayTR panelinde callback URL (`/api/payment/paytr/callback`),
Pinterest için yasal URL'ler.

## Kapsam dışı (YAGNI / sonraya)
Stok takibi, ürün varyantları, sipariş e-postası/bildirim, `server.js` (yerel-dev kopyası)
ödeme paritesi, KV per-order key + atomik index refactor'ı (düşük hacim için `orders` dizisi +
idempotensi yeterli).

## Doğrulama
Her faz sonrası `npm run build` + `npm test`. PayTR canlı ödeme, hesap açılıp anahtarlar
girilince kullanıcı tarafından test edilecek (bende hesap yok).
