# Aselovers — Brand, Polish & Content — Design Doc

**Tarih:** 2026-07-02
**Durum:** Onaylandı (tasarım) — uygulama planı bekliyor
**Kapsam:** Markanın kendi görsel dilini (ay + uyuyan bebek amblemi, yumuşak taupe ton) siteye işlemek; kataloğu premium hale getirmek; sabit WhatsApp butonu; nav'a Anasayfa; Hakkımızda/İletişim'i markaya uygun doldurmak; Blog'u gerçek yazılarla kurmak. Mevcut tasarım sistemi, i18n/SEO, Etsy/DeepL/yorum sync ve beğenilen ana sayfa KORUNUR.

---

## 1. Amaç ve Başarı Kriterleri

Aselovers = **kişiye özel, el yapımı bebek hediyeleri** (amigurumi/tığ işi), Türkiye + ABD, Etsy. Site premium ama marka kimliği (logo, slogan, bebek/ay teması) ve bazı sayfalar eksik; katalog dağınık; fiyatlar silik; iletişim için hızlı kanal yok.

**Başarı kriterleri:**
- Logo amblemi (ay+bebek) SVG olarak nav/footer/favicon'da; slogan "Personalized Baby Gifts"; el-yazısı wordmark.
- Katalog şık: kategori çipleri (taupe/terracotta), belirgin fiyatlar, ferah premium toolbar.
- Her sayfada sağ altta sabit, çalışan **WhatsApp** butonu (`wa.me/905067927685`).
- Nav'da **Anasayfa/Home**.
- Hakkımızda + İletişim markaya uygun premium içerik; **Blog gerçek yazılarla** (TR+EN) çalışır (liste + yazı sayfaları, SEO/sitemap).
- Mevcut token/i18n/SEO/sync/ana sayfa korunur; testler yeşil kalır; yeni mantık test-önce.

**Kapsam DIŞI:** admin panel (ayrı), palet değişimi (mevcut terracotta korunur), gerçek marka fotoğrafları, sepet/ödeme.

---

## 2. Marka Kimliği

**İmza — ay + uyuyan bebek amblemi:** `src/components/Logo.astro` içinde temiz SVG. İki mod: `mark` (sadece amblem) ve `full` (amblem + wordmark + slogan). Kullanım: Nav (full, kompakt), Footer (mark + wordmark), `public/favicon.svg` (mark). Amblem terracotta/taupe token'larıyla çizilir (mevcut sisteme uyumlu, dosya yüklemesiz).

**Ay glifi imza:** Trust bar / eyebrow'lardaki genel "✦" yerine küçük bir **hilal glifi** (aynı amblemin sadeleştirilmiş hali) kullanılır — süs değil, markayı anlatan yapı. (Ölçülü: bir-iki yerde.)

**Renk (ekleme):** `src/styles/tokens.css`'e `--blush: #C6ABA1` (logo taupe) + `--blush-tint: color-mix` kullanımıyla. WhatsApp: `--wa: #25D366` (yalnız o bileşende). Birincil aksan terracotta korunur.

**Tipografi:** Playfair + Inter korunur. Wordmark için **Dancing Script** (700) Google Fonts'a eklenir; SADECE logo wordmark'ında kullanılır.

---

## 3. Katalog (dağınık → premium)

`src/pages/tr/urunler.astro` + `src/pages/en/products.astro`:
- **Kategori çipleri yeniden stillenir:** pasif = `--blush` %14 zemin + ince kenar; hover = terracotta kenar + hafif yükselme; **aktif = terracotta dolgu + `--on-accent` metin + yumuşak gölge**. Daha cömert padding/harf aralığı. Mobilde yatay kaydırılabilir şerit (`overflow-x:auto`, kaydırma çubuğu gizli).
- Toolbar: sol çipler, sağ "{n} ürün" + sıralama select; hizalı, ferah.
- (Filtre + sıralama scriptleri korunur.)

**Fiyat belirginleştirme:**
- `src/components/ProductCard.astro` `.card__price`: `--muted` → **`--accent-ink`, font-weight 600, ~1.05rem** (net odak).
- Ürün detay `.detail__price` zaten accent-ink; korunur/pekiştirilir.

---

## 4. Sabit WhatsApp Butonu

`src/components/WhatsAppFab.astro`, `Base.astro`'ya eklenir → her sayfada. Sağ altta sabit yeşil daire (WhatsApp SVG ikonu), `href="https://wa.me/905067927685?text=..."` (i18n hazır mesaj: TR "Merhaba, ürünleriniz hakkında bilgi almak istiyorum" / EN "Hi! I'd like to ask about your products"), `target="_blank" rel="noopener"`, `aria-label`. Yumuşak giriş + hover büyüme; `prefers-reduced-motion` altında animasyon kapalı. z-index nav'ın altında değil, overlay'in üstünde değil (dengeli).

---

## 5. Navigasyon

`src/components/Nav.astro`: link listesinin başına **Anasayfa/Home** (`/${locale}`) eklenir (i18n `nav.home`). Metin marka (`aselovers`) → `<Logo mode="full" />` (amblem + wordmark). Mega-menü/overlay/scroll davranışı korunur; overlay menüsüne de Anasayfa eklenir.

---

## 6. İçerik Sayfaları (premium)

**Hakkımızda** (`tr/hakkimizda`, `en/about`): marka hikâyesi — kişiye özel el yapımı bebek hediyeleri; kime (yeni ebeveynler, baby shower, anlamlı hediye arayanlar); nasıl (her parça siparişten sonra elde, sevgiyle, kaliteli-güvenli malzeme); nerede (Türkiye + ABD, Etsy'de yüzlerce mutlu müşteri değil — gerçek sayıya bağlı kalınır: "Etsy'de sevilen"). Mevcut iki-kolon düzeni + değerler + ay glifi dokunuşu.

**İletişim** (`tr/iletisim`, `en/contact`): premium tek-kolon — sıcak başlık + WhatsApp (buton), Etsy mağaza, sosyal; "özel sipariş için yazın" çağrısı.

---

## 7. Blog (gerçek yazılar)

**Veri:** `src/lib/blog.ts` — `interface Post { slug; title_tr; title_en; excerpt_tr; excerpt_en; bodyHtml_tr; bodyHtml_en; date; }` ve `POSTS: Post[]` (3-4 yazı, markaya uygun, bilingual). Yardımcılar: `loadPosts()` (tarihe göre yeniden→eskiye), `postSlug(post)` (yalnız `slug`). Saf → **test edilir**.
**Yazılar (TR+EN, kısa premium):** (1) Kişiye özel bebek hediyesi neden özeldir; (2) Amigurumi/el örgüsü bakımı; (3) Bir parçanın hikâyesi (elde örülüş); (4) Yeni doğana anlamlı hediye rehberi.
**Sayfalar:** Blog listesi (`tr/blog`, `en/blog`) — kartlar (başlık, tarih, özet, "Devamını oku"). Yazı sayfaları — dinamik `src/pages/tr/blog/[slug].astro` + `src/pages/en/blog/[slug].astro` (Base + Nav + Footer, editorial prose, hreflang eşleşmesi `blog/<slug>`).
**SEO:** `src/lib/sitemap.ts` blog listesi + yazı yollarını (iki dil) ekler.

---

## 8. Bileşen Envanteri

- Yeni: `Logo.astro`, `WhatsAppFab.astro`, `src/lib/blog.ts` (+test), blog listesi + `[slug]` sayfaları (tr/en), `MoonGlyph` (küçük inline SVG ya da Logo mark reuse).
- Değişen: `tokens.css` (--blush), `Base.astro` (WhatsAppFab + Dancing Script font), `Nav.astro` (Home + Logo), `Footer.astro` (Logo), `ProductCard.astro` (fiyat), katalog sayfaları (çipler), `favicon.svg` (amblem), `hakkimizda`/`about`, `iletisim`/`contact`, `blog` (liste), i18n (`nav.home`, blog/iletişim anahtarları), `sitemap.ts`.
- Korunan: renk sistemi (terracotta), ProductGallery, hero/nav wow, reviews, Etsy/DeepL/reviews sync.

---

## 9. Test Stratejisi

- `blog.ts` (`loadPosts` sıralama, `postSlug`) + i18n yeni anahtarları → Vitest (RED→GREEN).
- `.astro`/görsel işler: build başarısı + tarayıcı önizleme. Mevcut testler yeşil kalır.
- WhatsApp linki + Logo/ nav render → build + önizleme.

---

## 10. Bu Kapsamda DEĞİL
Admin panel, palet değişimi, gerçek fotoğraflar, sepet/ödeme, blog yorumları/kategori.
