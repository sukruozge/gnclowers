# Aselovers — Premium Editorial Redesign — Design Doc

**Tarih:** 2026-07-01
**Durum:** Onaylandı (tasarım) — uygulama planı bekliyor
**Kapsam:** Sitenin GÖRSEL katmanının sıfırdan yeniden tasarımı. Plan 1'in altyapısı (Astro, çift dil, SEO, `/` yönlendirme, Etsy ürün verisi, sitemap) korunur.

---

## 1. Amaç ve Başarı Kriterleri

Aselovers premium el yapımı amigurumi markası için, "Modern Editorial Boutique" yönünde **sıcak-premium** bir görünüm. Mevcut çıplak/kaymış görünümün sebebi, Astro bileşenlerinin eski `style.css`'in beklediği markup'la uyuşmamasıydı; bu redesign yeni, amaca özel bir tasarım sistemi kurar ve tüm bileşenleri o sisteme göre yeniden yazar.

**Başarı kriterleri:**
- Her sayfa tutarlı, premium, bilinçli tasarımla render olur (çıplak/kaymış öğe kalmaz).
- Tasarım tek bir token setinden (renk/tipografi/spacing CSS değişkenleri) beslenir; sihirli sabit değer yok.
- Çift dil (`/tr/`, `/en/`), SEO (canonical/hreflang/sitemap), `/` ülke yönlendirmesi ve Etsy ürün verisi Plan 1'deki gibi çalışmaya devam eder.
- Mobil öncelikli responsive ve WCAG AA temel erişilebilirlik (kontrast, odak halkaları, alt metin) sağlanır.

**Kapsam DIŞI:** Yeni işlevsellik (sepet/ödeme = Faz 2, admin = Faz 3), yeni içerik yazımı (mevcut metinler korunur/uyarlanır), Etsy senkron mantığı.

---

## 2. Tasarım Sistemi (Design Tokens)

Tek kaynak: `src/styles/tokens.css` (CSS değişkenleri, `:root`).

**Renk paleti:**
```
--bg:        #FBFAF7   (sayfa ivory)
--surface:   #FFFFFF   (kart)
--section:   #F3EEE6   (dönüşümlü bölüm zemini / greige)
--ink:       #22201E   (birincil metin)
--muted:     #6B655E   (ikincil metin)
--line:      #E3DACE   (hairline ayraç)
--accent:    #B85C38   (terracotta — tek rafine sıcak aksan)
--accent-ink:#8F4426   (aksan üstü koyu / hover)
--footer-bg: #2A2622   (koyu sıcak footer)
--footer-fg: #EFE9E0
```

**Tipografi:**
```
--font-display: 'Playfair Display', Georgia, serif   (başlıklar, wordmark)
--font-body:    'Inter', system-ui, sans-serif        (gövde, nav, buton)
```
Ölçek (clamp ile responsive): h1 `clamp(2.4rem, 5vw, 4rem)`, h2 `clamp(1.8rem,3vw,2.6rem)`, h3 `1.35rem`, gövde `1rem/1.7`, küçük `0.85rem`. Fontlar Google Fonts'tan preconnect + `display=swap` ile yüklenir.

**Spacing / şekil / hareket:**
```
--space-1..8: 4,8,12,16,24,40,64,96 px
--radius:     14px (kart/görsel);  --radius-pill: 999px (rozet/buton)
--ease:       cubic-bezier(.4,0,.2,1);  --dur: 220ms
--maxw:       1200px (içerik konteyner genişliği)
```
Gölge minimal: yalnızca hover kart yükselmesi (`0 10px 30px rgba(34,32,30,.10)`) ve odak halkası.

---

## 3. Bileşen Envanteri (yeniden yazılacak)

Her biri `src/components/` altında, tek sorumluluk:
- `Nav.astro` — üstte ince, ferah; wordmark (serif) + dil linkleri + dil değiştirici. Scroll'da hafif zemin.
- `Footer.astro` — koyu sıcak footer; marka, linkler, bülten mini-form (statik, aksiyon Faz 3), telif.
- `Button.astro` — birincil (dolu terracotta), ikincil (outline), link-arrow varyantları.
- `ProductCard.astro` — büyük görsel (oran korumalı), başlık (serif), fiyat, "yeni" rozeti; hover'da zarif yükselme.
- `SectionHeading.astro` — eyebrow (küçük caps) + serif başlık + opsiyonel alt metin.
- `Badge.astro` — "El Yapımı / Handmade" gibi küçük güven rozeti.
- Ana sayfa bölüm bileşenleri: `Hero.astro`, `FeaturedProducts.astro`, `StoryStrip.astro`, `Categories.astro`, `TrustBar.astro`, `NewsletterCta.astro`.

Layout: `Base.astro` yeni tasarımla; `<head>` SEO (Plan 1'den korunur) + font linkleri + tokens/global CSS.

---

## 4. Sayfa Düzenleri

- **Ana sayfa (`/tr/`, `/en/`):** Hero (eyebrow + serif başlık + alt cümle + iki CTA + tek büyük görsel/kolaj) → Öne Çıkan Ürünler (loadProducts'tan ilk 6–8, ferah ızgara) → Marka Hikâyesi şeridi (görsel + kısa metin) → Kategoriler (amigurumi/çanta/aksesuar/dekor kartları) → Güven bandı (el yapımı, kargo, Etsy değerlendirmeleri metni) → Bülten CTA.
- **Katalog (`/urunler`, `/products`):** başlık + kategori filtre çubuğu (client-side, mevcut kategorilerden) → ferah `ProductCard` ızgarası (responsive `auto-fill minmax`).
- **Ürün detay:** iki kolon (büyük görsel | bilgi: başlık, fiyat, açıklama, "Etsy'de Satın Al" birincil CTA, kargo bilgi bloğu, güven rozetleri). Altında "benzer ürünler" (aynı kategoriden birkaçı). Schema.org Product JSON-LD (Plan 2'de canlı veriyle zenginleşecek; burada mevcut alanlarla eklenir).
- **Hakkımızda / Blog / İletişim:** editorial tek kolon; ferah tipografi, görsel + metin blokları, okunaklı satır uzunluğu (`max-width: 68ch`).

---

## 5. Responsive & Erişilebilirlik

- Mobil öncelikli; kırılımlar `640px`, `900px`, `1200px`. Nav mobilde hamburger → açılır menü (JS minimal, ilerlemeli geliştirme).
- Izgaralar `repeat(auto-fill, minmax(...))` ile akışkan.
- WCAG AA: metin/aksan kontrastı ≥ 4.5:1 (terracotta `#B85C38` beyaz üstünde uygundur), görünür `:focus-visible` odak halkası, tüm görsellerde anlamlı `alt` (ürün başlığı), `prefers-reduced-motion` desteği (hareketi kıs).

---

## 6. Korunan / Değişen

**Korunur (dokunulmaz):** `src/lib/*` (i18n, slug, products, seo, sitemap, locale) ve testleri; `src/pages/index.ts` (`/` yönlendirme); `sitemap.xml.ts`; `public/_headers`, `public/robots.txt`, `wrangler.toml`, `astro.config.mjs`. SEO `<head>` mantığı (canonical/hreflang/OG) yeni `Base.astro`'ya taşınır.

**Değişir/yeniden yazılır:** tüm `.astro` bileşen ve sayfa markup'ı; yeni `src/styles/tokens.css` + `src/styles/global.css`; `public/style.css` (eski premium CSS) kaldırılır; `public/favicon.svg` markaya göre güncellenir; opsiyonel `public/og-default.jpg` premium bir varsayılan görsel eklenir.

---

## 7. Riskler / Notlar

- **Görsel eksikliği:** Hero/hikâye bölümleri için marka görselleri gerekebilir; şimdilik mevcut Etsy ürün görselleri ve zarif tipografik/renk kompozisyonları kullanılır, gerçek marka fotoğrafları geldikçe değiştirilir.
- **Font yükleme:** Playfair + Inter yalnızca gerekli ağırlıklarla, `display=swap` ile; CLS'yi azaltmak için `preconnect`.
- **Doğrulama:** Değişiklikler tarayıcı önizlemesiyle (yerel `npm run dev`) ve deploy sonrası canlı kontrolle görsel olarak doğrulanır; `src/lib` testleri (18/18) kırılmamalı.

---

## 8. Bu Kapsamda DEĞİL (sonraki fazlar)
Sepet/ödeme (Faz 2 — Etsy otomasyonu + JSON-LD zaten planlı Plan 2), admin panel + KV + güvenlik (Faz 3). Bu redesign yalnızca sunum katmanıdır.
