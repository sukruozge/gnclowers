# Tedarikçi Üretim Bilgi Portalı — Tasarım

**Tarih:** 2026-10-27 · **Durum:** Onaylı (kullanıcı "planını yap, işe koyul" dedi; kararlar
aşağıda gerekçeleriyle sabitlendi)

## Problem

Aselovers 195 aktif ürünü birden fazla tedarikçi (örgücü) ile üretiyor. Her sipariş öncesi
"bu ürün hangi iple, hangi renk koduyla, hangi tarifle yapılıyor, nelere dikkat edilmeli" soruları
WhatsApp'ta tekrar tekrar soruluyor; bilgi kimsenin elinde toplu değil. Amaç: tedarikçilerin
kendilerinin giriş yapıp **ürün bazında** üretim bilgisini (iplikler + renk kodları, tığ no, elyaf,
ölçü, PDF tarif, dikkat notları) doldurduğu bir portal; admin tarafında bunların hepsinin tek
tabloda görülüp CSV olarak dışa aktarılabilmesi.

## Kapsam

**Dahil**
- `/tedarikci/` — Türkçe, tek sayfalık portal (giriş → ürün listesi → ürün formu).
- Tedarikçi hesapları: admin dashboard'dan açılır/kapatılır, şifre sıfırlanır.
- Ürün başına, tedarikçi başına **bir** üretim kaydı (aynı ürünü iki tedarikçi yapıyorsa iki kayıt).
- PDF tarif yükleme (gizli; yalnız ilgili tedarikçi ve admin indirir).
- Admin dashboard'da yeni "Tedarikçiler" sayfası: hesaplar + üretim kayıtları tablosu + CSV.

**Hariç (YAGNI)**
- Tedarikçinin başka tedarikçinin kaydını görmesi. İngilizce arayüz. E-posta bildirimi.
- Ürün atama (tedarikçi listedeki her aktif ürünü doldurabilir; admin "kim doldurdu" görür).
- Sürüm geçmişi (son kayıt + güncelleme zamanı yeter).

## Mimari

Mevcut altyapıya oturur, yeni servis yok:

| Katman | Karar | Gerekçe |
|---|---|---|
| Depolama | Cloudflare KV `ADMIN_KV` | Siparişler/mesajlar zaten KV'de; GitHub commit'i tetiklemez, rebuild gerekmez |
| PDF | KV'de base64 (≤ 10 MB dosya) | Tarifler ticari sır; `public/`'e koyup herkese açmak olmaz. R2 binding'i yok, eklemek yeni altyapı |
| Kimlik | `src/lib/admin/auth.ts` (PBKDF2 + HS256 JWT), ayrı çerez `aselovers_supplier` | Kod yeniden kullanımı; JWT payload'ında `role: 'supplier'` |
| API | `src/pages/api/supplier/[...action].ts` | Admin API dosyası 835 satır, zaten şişkin; ayrı dosya |
| Arayüz | `src/pages/tedarikci/index.astro` (vanilla JS, site token'ları) | Astro statik çıktı; ürün listesi `/products.json`'dan (zaten public) |
| Admin UI | `public/admin/suppliers.js` + dashboard.html'e nav + page div | dashboard.html 4193 satır; JS ayrı dosyada |

### Güvenlik sınırı (kritik)
Admin API'nin `isAuthed` fonksiyonu bugün yalnızca "JWT geçerli mi" bakıyor. Tedarikçi token'ı da
aynı `JWT_SECRET` ile imzalandığı için, admin çerezine kopyalanınca admin yetkisi verirdi.
**Düzeltme:** admin `isAuthed`, payload `sub === 'admin'` değilse reddeder. Tedarikçi API'si de
`role === 'supplier'` + hesabın hâlâ aktif olmasını şart koşar (pasife alınan tedarikçi anında düşer).

## Veri modeli (KV)

```
sup:accounts                      → SupplierAccount[]
sup:spec:{productId}:{supplierId} → ProductSpec
sup:file:{productId}:{supplierId} → { filename, size, type, base64 }
sup:rl:{ip}                       → giriş deneme sayacı (15 dk TTL)
```

```ts
interface SupplierAccount {
  id: string;            // 'sup_' + 8 hex
  name: string;          // "Ayşe Hanım"
  username: string;      // küçük harf, [a-z0-9._-]{3,32}, benzersiz
  passwordHash: string;  // pbkdf2$...
  isActive: boolean;
  createdAt: string;     // ISO
  lastLoginAt?: string;
}

interface YarnLine {
  brand: string;         // "Alize", "Himalaya Dolphin Baby"
  name: string;          // iplik adı / türü
  colorCode: string;     // "55"
  colorName: string;     // "kirli beyaz"
  usage: string;         // "gövde", "kulaklar"
  amount: string;        // "1 yumak", "40 g" (serbest metin)
}

interface ProductSpec {
  productId: string;
  supplierId: string;
  yarns: YarnLine[];                 // 0..30
  hookSize: string;                  // "2.5 mm"
  fill: string;                      // elyaf / boncuk
  eyes: string;                      // "8 mm emniyetli göz"
  finishedSize: string;              // "yaklaşık 20 cm"
  productionHours: string;           // "6 saat"
  patternUrl: string;                // dış link (opsiyonel)
  notes: string;                     // dikkat edilmesi gerekenler (≤ 4000)
  isComplete: boolean;               // tedarikçi "bilgiler tam" dedi
  hasFile: boolean;                  // PDF var mı (file key'i okumadan listelemek için)
  fileName?: string;
  createdAt: string;
  updatedAt: string;
}
```
Tüm metin alanları `clip()` ile kontrol karakterlerinden arındırılıp uzunluk sınırına kesilir
(`messages.ts` deseni). Tüm render tarafı `esc()` ile kaçışlanır.

## API

**Tedarikçi (`/api/supplier/...`, çerez `aselovers_supplier`)**
| Metot | Yol | İş |
|---|---|---|
| POST | `login` | `{username,password}` → çerez (7 gün). IP başına 10 deneme / 15 dk |
| POST | `logout` | çerezi siler |
| GET | `me` | `{ok, name}` |
| GET | `specs` | kendi kayıtlarının özeti `{productId, isComplete, hasFile, updatedAt}[]` |
| GET | `spec/:productId` | kendi kaydı veya `null` |
| PUT | `spec/:productId` | doğrula + kaydet (ürün id aktif katalogda olmalı) |
| POST | `file/:productId` | `{filename, base64}` PDF; `%PDF-` imzası ve ≤ 10 MB zorunlu |
| GET | `file/:productId` | `application/pdf` indirir |
| DELETE | `file/:productId` | PDF'i siler, spec.hasFile=false |

**Admin (`/api/supplier/admin/...`, mevcut admin çerezi, `sub==='admin'`)**
| Metot | Yol | İş |
|---|---|---|
| GET/POST | `accounts` | listele / oluştur `{name, username, password}` → şifre hash'lenir |
| PUT | `accounts/:id` | `{name?, isActive?, newPassword?}` |
| DELETE | `accounts/:id` | hesabı siler (kayıtları kalır, tabloda "silinmiş hesap" görünür) |
| GET | `specs` | tüm kayıtlar + tedarikçi adı |
| GET | `spec/:productId/:supplierId` | tek kayıt |
| DELETE | `spec/:productId/:supplierId` | kayıt + dosya |
| GET | `file/:productId/:supplierId` | PDF indir |
| GET | `export.csv` | `;` ayraçlı, BOM'lu CSV (Excel-TR uyumlu); iplikler satır-içi `|` ile |

Ürün kataloğu tedarikçi API'sinde doğrulama için gerekir; statik çıktıda `src/data/products.json`
import edilir (build-time). Yeni ürün gece senkronuyla geldiğinde rebuild zaten olur.

## Arayüz

**`/tedarikci/`** — `noindex`, robots `Disallow: /tedarikci/`. Site token'ları (Playfair/Inter,
`--accent`) ama Nav/Footer/ChatWidget yok; iş aracı hissi. Üç görünüm, hash ile:
1. **Giriş** — kullanıcı adı + şifre.
2. **Ürün listesi** (`#liste`) — arama kutusu, filtre segmenti (Hepsi / Doldurduklarım /
   Eksikler), kart: görsel, TR başlık, durum rozeti (Boş / Taslak / Tam · PDF ✓).
3. **Ürün formu** (`#urun/ID`) — sol: ürün görseli + başlık + Etsy linki. Sağ: form.
   İplik tablosu satır ekle/sil; diğer alanlar; PDF alanı (sürükle-bırak, mevcut dosya adı +
   indir/sil); "Dikkat edilmesi gerekenler" textarea; "Bilgiler tam" onay kutusu; Kaydet.
   Kaydet sonrası toast, otomatik `updatedAt`. Kaydedilmemiş değişiklikle çıkışta `beforeunload` uyarısı.

**Admin → Tedarikçiler** sayfası (dashboard): iki sekme.
- **Hesaplar:** tablo (ad, kullanıcı adı, durum, son giriş, kayıt sayısı), "Yeni tedarikçi"
  formu (ad, kullanıcı adı, şifre + "üret" butonu; şifre bir kez gösterilir), aktif/pasif,
  şifre sıfırla, sil.
- **Üretim Bilgileri:** tablo (ürün görseli+ad, tedarikçi, iplik sayısı, PDF, tam/taslak,
  güncellendi), arama, "Detay" modalı (tüm alanlar okunur, PDF indir), "⬇ CSV".
  Sayfa başlığında özet: "195 aktif ürün · X'i için kayıt var · Y tedarikçi".

## Hata yönetimi
- KV yoksa her uç `{error:'kv-missing'}` 500 ve arayüz açık mesaj gösterir.
- Doğrulama hataları 400 + Türkçe mesaj; arayüz alanın yanında gösterir.
- PDF: tür/boyut/imza reddi 400; KV yazma hatası 502 ve spec dokunulmaz (önce dosya, sonra bayrak).
- Oturum süresi dolunca 401 → arayüz giriş ekranına döner, yarım form `sessionStorage`'da saklanır.

## Test
- `src/lib/supplier/validate.test.ts`: spec normalizasyonu/uzunluk kesme/iplik sayısı sınırı,
  kullanıcı adı kuralı, PDF imza+boyut kontrolü, CSV kaçışlama (`;`, `"`, satır sonu, formül
  enjeksiyonu `=`/`+`/`-`/`@` başlangıcı).
- `src/lib/supplier/store.test.ts`: bellek-içi sahte KV ile hesap CRUD (benzersiz kullanıcı
  adı), spec kaydet/listele, dosya sil → hasFile=false, pasif hesap girişi reddi.
- `src/lib/admin/session.test.ts`: supplier rolündeki token'ın admin oturumu olarak kabul
  edilmemesi (admin `isAuthed` mantığı `src/lib/admin/session.ts`'e çıkarılır ki test edilebilsin).
- Build (`npm run build`) + canlıda el ile: giriş, kayıt, PDF yükle/indir, admin CSV.

## Dağıtım
Yeni ortam değişkeni yok (`JWT_SECRET`, `ADMIN_KV` mevcut). Commit → `git push gnc main`.

## Ek (2026-10-27, kullanıcı isteği): Onay akışı ve gizlilik

- Her kayıt `approval: 'pending' | 'approved'` taşır. Tedarikçi kaydı kaydettiğinde veya PDF
  yüklediğinde/sildiğinde kayıt otomatik olarak `pending` olur (`approvedAt` silinir).
- Admin, Tedarikçiler → Üretim Bilgileri tablosunda "Onayla" / "Onayı kaldır" ile durumu değiştirir:
  `POST /api/supplier/admin/spec/:pid/:sid/approval { approved: boolean }`. CSV de Onay sütunu içerir.
- Tedarikçi arayüzü: kendi kaydı için "Taslak" / "Onay bekliyor" / "Onaylı ✓" rozetleri. Başka bir
  tedarikçinin doldurduğu ürün yalnız "Başka tedarikçi doldurdu" olarak görünür; ad veya içerik
  sunucudan hiç dönmez (`GET specs` → `{ mine, filledByOthers: productId[] }`; `filledByOthers`
  yalnız KV anahtar adlarından türetilir, ek okuma yapılmaz).
- Onay alanı olmayan eski kayıtlar okunurken `pending` sayılır.
