# TR SEO Gece Çalışması Raporu — 18 Temmuz 2026

## Ne yapıldı (özet)

126 ürünün tamamının Türkçe başlığı, açıklaması ve etiketleri, Türkiye arama
davranışı araştırmasına dayanarak sıfırdan yazıldı ve canlıya alındı. EN tarafına
(Etsy kaynaklı) dokunulmadı.

## Araştırma bulguları (karar dayanakları)

- **"Örgü" ailesi "amigurumi" kadar büyük:** Hepsiburada'da "örgü bebek" 9.267
  ürün, "amigurumi bebek" 5.048 ürün. İkisi birlikte kullanılıyor (top satıcı
  normu: "Amigurumi Örgü Oyuncak ...").
- **"Uyku arkadaşı"** Türkiye'ye özgü dev bir kategori (Trendyol'da kendi
  kategori sayfası var) — ayıcık/tavşan ürünlerinin ikinci adı olarak başlıklara girdi.
- **Vesile aramaları en güçlü intent:** hoş geldin bebek, yenidoğan hediyesi,
  baby shower, bebek mevlidi, hastane çıkışı — ayrı ayrı aranıyor.
- **Kişiselleştirme:** "isimli", "isme özel", "kişiye özel" üçü de aranıyor;
  Hepsiburada'da "İsme Özel Bebek Hediyelikleri" ayrı kategori.
- **Başlık kuralı:** Google TR SERP'te ≤55 karakter (Türkçe karakterler pikselde
  geniş), en değerli kelime ilk 30 karakterde.
- **Kaçınılanlar:** "tığ işi" (yapıcı/hobi intenti), "peluş" (fabrika ürünü
  register'ı), tek başına "amigurumi" (kit/tarif DIY intenti), "hediyelik eşya",
  İngilizce terimler (istisna: "baby shower" Türkçeleşmiş).

## Uygulanan değişiklikler

1. **126 ürün TR başlık** — formül: `{İsimli/Kişiye Özel} + Örgü/Amigurumi +
   {hayvan/ürün} + {intent: Uyku Arkadaşı | Bebek Hediyesi}`, hepsi ≤55 karakter,
   hepsi benzersiz (5 yinelenen grup ayırt edici özellikle tekilleştirildi).
   - Önce: "Örgü Ayıcık İsimli - El Yapımı Amigurumi Oyuncak, Bebek Hediyesi, Yeni Doğan Hediyesi" (86 kr)
   - Sonra: "İsimli Örgü Ayıcık – Kişiye Özel Bebek Hediyesi" (47 kr)
2. **126 ürün TR açıklama** — ürüne özgü kanca cümlesi + malzeme/güven bloğu
   (yalnızca üründe zaten geçen iddialar; sertifika uydurma yok) + vesile listesi
   + duygusal kapanış. Bu metinler aynı zamanda ürün sayfası meta description'ı.
3. **126 ürün etiketi** İngilizce'den Türkçe'ye çevrildi (araştırma havuzundan
   8-13 etiket/ürün) ve **TR ürün sayfalarının JSON-LD şemasına `keywords` alanı**
   olarak bağlandı (EN şeması etkilenmez).
4. **Ürün listelerine ItemList + BreadcrumbList şeması** (TR + EN) — Google'a
   kürasyonlu koleksiyon sinyali.
5. **Görsel koruması:** ürün galerisine yarı saydam **ASELOVERS** rozeti
   (ürünü kapatmaz), görsel sürükleme + sağ tık kaydetme caydırıcısı.
   Not: kaynak Etsy CDN URL'leri hâlâ erişilebilir — kalıcı çözüm için
   "görselleri kendi sunumuza taşı + gerçek filigran" backlog'da (aşağıda).
6. **Kalıcılık garantisi:** `etsy-sync` mevcut ürünlerin `title_tr` /
   `description_tr` / `tags` alanlarını koruyor — gece senkronu bu çalışmayı ezmez.

## Satış getirebilecek öneriler (öncelik sırasıyla)

1. **Google Search Console + Bing'e TR sayfaları bildir** (5 dk) — yeniden
   tarama isteği; yeni başlıkların dizine girmesini haftalardan günlere indirir.
2. **Kategori iniş sayfaları** — `/tr/urunler/amigurumi-ayicik` gibi kendi
   title/H1'i olan statik sayfalar; "amigurumi ayıcık", "örgü çıngırak" gibi
   kategori aramalarından organik trafik. (Araştırmada her birinin Trendyol'da
   kendi kategorisi olduğu doğrulandı.)
3. **Trendyol/Hepsiburada mağazası** — TR alıcısının çoğunluğu pazaryerinde
   arıyor; başlık formülü hazır (`Aseloves Amigurumi Örgü Ayıcık Uyku Arkadaşı
   Organik Pamuk 30 cm Bej` kalıbı, <70 karakter).
4. **Blog içerik takvimi** — araştırılan sorgulara birebir yazılar: "Yenidoğan
   hediyesi ne alınır?", "Uyku arkadaşı nedir, hangi yaşta verilir?", "Baby
   shower hediye fikirleri". Mevcut blog altyapısı hazır.
5. **Sezonluk plan** — Kasım'da yılbaşı etiket/landing hazırlığı (TR'nin en
   büyük hediye dönemi), Nisan'da Anneler Günü ("yeni anne hediyesi" açısı).
6. **Trend ürün fırsatı** — örgü çiçek/buket ("solmayan çiçek") 2025-26'nın
   yükselen kolu; 1-2 SKU ile test edilebilir.
7. **Görselleri kendi sunumuza taşıma + gerçek filigran** — Etsy CDN yerine
   `public/images/products/` + köşe filigranlı kopyalar (script hazırlanabilir);
   hem görsel hırsızlığını gerçekten engeller hem Etsy bağımlılığını azaltır.
8. **Google Merchant Center'a TRY feed'i ver** — `merchant-feed.xml` zaten canlı;
   Merchant Center hesabına eklenirse ürünler Google Alışveriş sekmesinde ücretsiz listelenir.

## Doğrulama

- 96/96 birim test ✅ · production build ✅
- Yinelenen başlık: 0 · 60+ karakter başlık: 0 · başlıkta İngilizce sızıntı: 0
- Build çıktısında doğrulandı: yeni `<title>`, JSON-LD `keywords`, galeri
  filigranı, listede `ItemList`.
