# Aselovers — Storefront Visual Enhancement — Design Doc

**Tarih:** 2026-07-02
**Durum:** Onaylandı (tasarım) — uygulama planı bekliyor
**Kapsam:** Mevcut premium editorial storefront'u görsel olarak zenginleştirip **güven veren, dolu** bir alışveriş sitesine dönüştürmek. Yön, renk ve altyapı korunur; içerik/bölümler ve cila eklenir. Ayrıca gerçek Etsy yorumları veri katmanına eklenir.

---

## 1. Amaç ve Başarı Kriterleri

Site şu an işlevsel ve premium ama "ince" duruyor; ziyaretçide güven ve doluluk hissi yaratacak sosyal kanıt (yorumlar), marka hikâyesi, güven sinyalleri ve daha zengin bir kompozisyon eksik.

**Başarı kriterleri:**
- Ana sayfa; hero + güven şeridi + öne çıkanlar + koleksiyonlar + **gerçek yorumlar** + üretici hikâyesi/süreç + SSS + bülten ile "dolu" ve akıcı bir anlatı sunar.
- Ürün detay ve katalog güven sinyalleriyle (puan, garanti maddeleri, kargo) güçlenir.
- **Gerçek Etsy mağaza puanı ve seçilmiş yorumlar** sync ile otomatik gelir ve TR/EN'e uygun gösterilir; erişim olmasa bile site kırılmaz (puan rozeti + Etsy linkine düşer).
- Mevcut yön (terracotta `#B85C38`, Playfair Display + Inter, fildişi `#FBFAF7`), token sistemi, i18n, SEO, Etsy sync, ürün galerisi/1:1 format KORUNUR.
- Tüm mevcut testler yeşil kalır; yeni veri/mantık test-önce eklenir.

**Kapsam DIŞI:** Admin panel (ayrı sonraki proje), gerçek marka/atölye fotoğrafları (kullanıcıda olunca eklenir), sepet/ödeme (Etsy'de kalır), yorumlara cevap/moderasyon.

---

## 2. Tasarım Dili (site geneli cila)

- Token sistemi korunur; gerekiyorsa yeni semantik token'lar eklenir (ör. `--star`, gölge katmanları).
- Daha cömert dikey ritim (`--space-7/8` bölüm aralıkları), 68ch okuma ölçüsü.
- **İnce hareket:** görünürlüğe girince fade/slide-up (IntersectionObserver, ~16px, 400ms), `prefers-reduced-motion` altında kapalı.
- Zarif hover (kart yükselme + görsel zoom mevcut), yumuşak gölge `--shadow-hover`.
- Yıldız derecelendirme için erişilebilir SVG yıldız bileşeni (`aria-label` ile).

---

## 3. Ana Sayfa Bölümleri (sırayla)

1. **Hero (ŞATAFATLI — bkz. §3A)** — neredeyse tam ekran, çarpıcı; detay §3A'da.
2. **Güven şeridi** (`TrustBar` genişletilir) — 4 madde: El yapımı, siparişe özel · Dünyaya özenli gönderim · Etsy'de {rating}★ · Etsy güvencesiyle ödeme.
3. **Öne Çıkanlar** (`FeaturedProducts`, mevcut) — 8 ürün, 1:1 kartlar.
4. **Koleksiyonlar** (`Categories`, mevcut) — gerçek Etsy section'ları.
5. **Yorumlar** (YENİ `Reviews`) — sol başlıkta mağaza puanı + toplam sayı; sağda/altta seçilmiş 5★ yorum kartları (yıldız + metin + müşteri baş harfi/adı + tarih). Locale eşleşen yorumlar önce (TR sayfada `language==='tr'` önce). Metin yoksa yalnızca yıldız+tarih. "Etsy'de tüm yorumları gör" linki.
6. **Üretici Hikâyesi / Süreç** (`StoryStrip` zenginleştirilir) — başlık + 3 adım kartı (Tasarla → Elde Ör → Özenle Gönder) + ürün/detay görseli + "Hakkımızda" CTA.
7. **SSS** (YENİ `Faq`) — akordeon (details/summary), i18n içerik: kargo süresi, özel sipariş, malzeme, bakım, iade/değişim.
8. **Bülten** (`NewsletterCta`, mevcut) — küçük teşvik satırı ("yeni koleksiyon + %10 ilham" tarzı; sadece metin, işlev Faz sonrası).

---

## 3A. Hero & Menü — "Wow" Faktörü (öncelikli)

Marka fotoğrafı olmadığından "wow" hissi **hareket + iri editorial tipografi + akan ürün mozaiği + dönüşen nav** ile kurulur. Hepsi vanilla JS + CSS (framework yok), performanslı ve `prefers-reduced-motion` altında sakinleşir.

**Hero (neredeyse tam ekran, ~min(88vh)):**
- Sol: dev Playfair başlık; bir vurgulu kelime terracotta ve italik (ör. "Sevgiyle örülmüş **oyuncaklar**"). Kelime kelime **kademeli reveal** (staggered fade/slide-up, ~60ms arayla) sayfa açılışında.
- Değer önermesi + satır içi **puan rozeti** (`★ {rating} · Etsy'de {count}+ değerlendirme`, veriden) + iki CTA (birincil "Koleksiyonu Keşfet", ikincil "Hikâyemiz") + "el yapımı, siparişe özel · Türkiye & ABD'ye gönderim" mikro-satırı.
- Sağ/arka: Etsy ürün görsellerinden **sonsuz akan dikey mozaik** — 2-3 kolon, kolonlar zıt yönde yavaşça kayar (CSS marquee, `translateY` sonsuz döngü; hover'da/reduced-motion'da durur). 1:1 kareler, yuvarlak köşe, yumuşak gölge. Dolu ve canlı bir "atölye vitrini" hissi.
- İnce derinlik: mozaik hafif parallax/tilt (küçük, isteğe bağlı, reduced-motion'da kapalı); zeminde çok hafif terracotta radyal ışıma.
- Altında yukarı-akan "güven şeridi"ne yumuşak geçiş.

**Menü / Navigasyon (dönüşen + tam ekran):**
- **Kaydırmayla dönüşür:** hero üzerindeyken şeffaf/hafif, aşağı kaydırınca fildişi + blur + ince alt çizgi + kompakt yükseklik (scroll listener bir `is-scrolled` sınıfı ekler; yumuşak geçiş).
- **Marka wordmark'ı** rafine; link'lerde zarif alt-çizgi animasyonu (sol→sağ), aktif sayfa vurgusu.
- **Koleksiyonlar mega-menüsü (masaüstü):** "Ürünler"e hover/focus'ta gerçek Etsy section'larını küçük görsellerle açan zarif panel.
- **Mobil:** hamburger → **tam ekran şık overlay menü** (kademeli açılan linkler, büyük tipografi, dil değişimi, kapanış animasyonu); odak tuzağı + Esc ile kapanır (erişilebilir).
- Dil değişimi (TR/EN) belirgin ve şık bir pill.

**Erişilebilirlik/performans:** tüm animasyonlar `prefers-reduced-motion: reduce` altında kapanır; marquee ve mega-menü klavye/odak dostu; görseller `loading` stratejisiyle (hero ilk kareler eager, gerisi lazy).

## 4. Ürün Detay ve Katalog

**Ürün detay** (mevcut iki kolon + galeri korunur):
- Başlık altında **puan rozeti** (mağaza puanı; ürün-bazlı puan erişilebilirse o).
- **Güven maddeleri** bloğu: siparişe özel el yapımı · Türkiye & ABD'ye gönderim · Etsy güvencesiyle güvenli ödeme.
- Kargo tahmini satırı (statik metin, i18n).
- Belirgin "Etsy'de Satın Al" (mevcut, vurgusu artırılır).
- Altta mini yorum kesiti (1-2 ilgili/son yorum) + benzer ürünler (mevcut).

**Katalog** — yapışkan filtre çubuğu, sonuç sayısı ("{n} ürün"), basit sıralama (Yeni / Fiyat artan-azalan; istemci tarafı), çip cilası, hover.

---

## 5. Hakkımızda (üretici hikâyesi)

Tek paragraftan gerçek bir marka sayfasına: değerler, el yapımı süreç (3-4 adım), malzeme/kalite, "her sipariş elde örülür" vaadi, Etsy'ye ve iletişime bağlantı. Editorial tek kolon + araya ürün görselleri.

---

## 6. Veri Katmanı — Yorumlar (YENİ)

Sync'e (scripts/etsy-sync.ts) eklenir:
- **Mağaza puanı:** `shops?shop_name=` yanıtındaki `review_average` + `review_count` (zaten bu çağrıyı yapıyoruz — neredeyse ücretsiz).
- **Bireysel yorumlar (best-effort):** `getReviewsByShop` (`shops/{shop_id}/reviews?limit=...`). Erişim yoksa (OAuth gerekiyorsa) hata yutulur, yalnızca puan kullanılır.
- **Saf, test edilebilir yardımcılar** (`src/lib/reviews.ts`): `pickReviews(all, locale, count)` — 5★ ve metinli olanları önceler, locale eşleşenleri öne alır, en fazla `count` döndürür; `formatRating(avg)`.
- **Veri şekli:** `src/data/reviews.json` → `{ shop: { rating: number|null, count: number }, reviews: [{ rating, text, language, date }] }`. Site `loadReviews()` ile okur. Yorumlar yoksa `reviews: []` (bölüm yalnızca rozet gösterir).
- **Güvenli düşüş:** review çekimi tüm sync'i çökertmez (sections gibi try/catch); puan/rozet her hâlükârda çalışır.

**Not:** Etsy review API erişimi ilk uygulama adımında **doğrulanır** (görsel/section derslerindeki gibi); erişim yoksa tasarım rozet-only ile zaten tamdır.

---

## 7. Bileşen Envanteri

- Yeni: `Reviews.astro` (ana sayfa), `Faq.astro`, `StarRating.astro`, `RatingBadge.astro`, `TrustPoints.astro` (ürün detay), `src/lib/reviews.ts` (+ test), `src/data/reviews.json`.
- Zenginleştirilen: `Nav.astro` (dönüşen + tam ekran overlay + koleksiyon mega-menüsü), `Hero.astro` (§3A şatafatlı hero + akan mozaik), `TrustBar.astro`, `StoryStrip.astro`, ürün detay sayfaları (tr/en), katalog sayfaları (tr/en), `hakkimizda`/`about`.
- i18n: yeni anahtarlar (güven, SSS, yorum başlıkları, süreç adımları, kargo).
- global.css: scroll-reveal yardımcı sınıfı + yıldız stilleri.
- Korunur: token/renk sistemi, ProductCard/ProductGallery, sync'in Etsy/DeepL/görsel mantığı, SEO/i18n/redirect.

---

## 8. Test Stratejisi

- `pickReviews`/`formatRating` saf → Vitest (RED→GREEN), sabit fixture'larla.
- i18n yeni anahtarları için mevcut desende assertion.
- `.astro` bölümleri: build başarısı + tarayıcı önizleme (görsel kanıt). Mevcut testler yeşil kalır.
- Yorum çekimi (IO) birim-test edilmez; ilk gerçek sync ile doğrulanır.

---

## 9. Bu Kapsamda DEĞİL
Admin panel, gerçek marka fotoğrafları, sepet/ödeme, yorum moderasyonu, ürün-bazlı review sayfaları.
