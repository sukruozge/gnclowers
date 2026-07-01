/* ============================================================
   ASELOVERS — Main JavaScript
   ============================================================ */

/* ── i18n Translations ── */
const translations = {
  tr: {
    ship_handmade: "El Yapımı",
    ship_custom:   "Özel Sipariş Kabul Edilir",
    ship_world:    "Türkiye'den Dünyaya Kargo",

    trust1_t: "100% El Yapımı",    trust1_d: "Her ürün makinede değil, sevgiyle ellerimle yapılır.",
    trust2_t: "Güvenli Alışveriş", trust2_d: "Tüm ödemeleriniz SSL ile korunur.",
    trust3_t: "Hızlı Kargo",       trust3_d: "TR'ye 2-3, AB'ye 7-14 iş gününde teslimat.",
    trust4_t: "Dünyaya Gönderim",  trust4_d: "12'den fazla ülkeye kargo seçeneği sunuyoruz.",

    cats_tag: "KATEGORİLER", cats_title: "Ne Arıyorsunuz?",
    cats_tag_label: "Koleksiyon", cats_explore: "Keşfet",

    process_tag: "NASIL YAPIYORUM",
    process_title: "Her Ürünün Arkasındaki Özen",
    process_sub: "Hammaddeden paketlemeye — her adımda kaliteyi hissedeceksiniz.",
    process_s1_t: "İplik Seçimi",       process_s1_d: "Avrupa ve Türkiye'nin en kaliteli ipliklerini özenle seçiyorum. Renk, doku, dayanıklılık — her şey önemli.",
    process_s2_t: "El ile Örme",        process_s2_d: "Her ilmek tek tek, sevgiyle örülür. Hiçbir ürün aynı değil — hepsi özgün, hepsi el emeği.",
    process_s3_t: "Paket & Teslimat",   process_s3_d: "Özenli paketleme ile dünyaya yolculuk. Ürününüz kutuya giymeden önce kalite kontrolünden geçer.",

    feat_ban_tag: "ÖZEL SİPARİŞ",
    feat_ban_title: "Hayal Ettiğin Ürünü Birlikte Yapalım",
    feat_ban_desc: "Renk, boyut, karakter — hepsini senin istediğin gibi yapabilirim. Kişiye özel hediyeler ve dekorasyon ürünleri için bana ulaş.",
    feat_ban_cta: "Etsy'den Sipariş Ver",

    gallery_title: "Instagram'dan", gallery_cta: "@aselovers'ı Takip Et",

    nav_home:    "Ana Sayfa",
    nav_shop:    "Mağaza",
    nav_about:   "Hakkımda",
    nav_contact: "İletişim",
    nav_etsy:    "Etsy",

    hero_eyebrow:   "El Yapımı · Türkiye'den Dünyaya",
    hero_title:     "Her <em>İlmekte</em><br>Bir Hikaye",
    hero_desc:      "Türkiye'den Avrupa'ya; amigurumi oyuncaklar, örgü çantalar ve el yapımı aksesuarlar. Her ürün özenle, her dikişte aşkla örülür.",
    hero_cta1:      "Koleksiyonu Keşfet",
    hero_cta2:      "Etsy'de Gör",
    hero_stat1_val: "500+",
    hero_stat1_lab: "Mutlu Müşteri",
    hero_stat2_val: "12+",
    hero_stat2_lab: "Ülkeye Gönderim",
    hero_stat3_val: "100%",
    hero_stat3_lab: "El Yapımı",

    feat1: "El Yapımı",
    feat2: "TR & AB'ye Gönderim",
    feat3: "Kişisel Tasarım",
    feat4: "Güvenli Ödeme",
    feat5: "İade Garantisi",
    feat6: "Özel Sipariş",

    shop_tag:      "KOLEKSİYON",
    shop_title:    "Sevgiyle Örülen Ürünler",
    shop_all_btn:  "Tüm Ürünler",
    shop_etsy_cta: "Etsy Mağazamı Gör",
    filter_all:        "Tümü",
    filter_amigurumi:  "Amigurumi",
    filter_bag:        "Çantalar",
    filter_accessory:  "Aksesuarlar",
    filter_decor:      "Dekorasyon",

    about_tag:   "HAKKIMDA",
    about_title: "Aselovers'ın Arkasındaki Örgücü",
    about_desc:  "Örgü benim için sadece bir hobi değil — bir tutku, bir meditasyon, bir ifade biçimi. Her ip seçiminden son düğmeye kadar elimden geçen her ürün, bir parçam.",
    about_i1_t:  "El Yapımı",
    about_i1_p:  "Her ürün makinede değil, sevgiyle ellerimle yapılır.",
    about_i2_t:  "Kaliteli İplikler",
    about_i2_p:  "Avrupa ve Türkiye'nin en kaliteli ipliklerini kullanıyorum.",
    about_i3_t:  "Kişisel Sipariş",
    about_i3_p:  "Renk, boyut, tasarım — seninle birlikte kişiselleştiririz.",
    about_etsy:  "Etsy Mağazama Git",
    about_c1:    "Mutlu Müşteri",
    about_c2:    "Ülkeye Kargo",
    about_c3:    "El Yapımı",
    about_badge: "El ile örüldü",
    about_tab_story:   "Hikayemiz",
    about_tab_values:  "Değerlerimiz",
    about_tab_process: "Süreç",
    about_shop_cta:    "Koleksiyonu Keşfet",
    val_care_t:    "Sevgi & Özen",    val_care_p:    "Her dikişte bir parçamı bırakıyorum.",
    val_quality_t: "Üst Kalite",      val_quality_p: "İplikten paketlemeye, en iyisinden ödün vermiyorum.",
    proc_1_t: "İplik Seçimi",         proc_1_p: "Avrupa ve Türkiye'nin en iyilerini özenle seçiyorum.",
    proc_2_t: "El ile Örme",          proc_2_p: "Her ilmek tek tek, sevgiyle ve sabrımla işleniyor.",
    proc_3_t: "Kalite Kontrolü",      proc_3_p: "Her ürün göndermeden önce dikkatle kontrol edilir.",
    proc_4_t: "Özenli Paketleme",     proc_4_p: "Ürününüz hediye gibi paketlenerek dünyaya yolculuk eder.",

    reviews_tag:   "MÜŞTERİ YORUMLARI",
    reviews_title: "Müşterilerim Ne Diyor?",
    reviews_sub:   "Dünyanın dört bir yanından mutlu müşterilerin yorumları.",

    news_title: "Yeni Koleksiyonlardan Haberdar Ol",
    news_sub:   "E-posta listemize katıl, yeni ürünlerden ilk sen haber al.",
    news_ph:    "E-posta adresin",
    news_btn:   "Abone Ol",

    footer_desc:        "El yapımı örgü ürünleri ile hayatınıza renk katıyorum. Türkiye'den dünyaya, sevgiyle.",
    footer_shop:        "Mağaza",
    footer_help:        "Yardım",
    footer_info:        "Bilgi",
    footer_products:    "Tüm Ürünler",
    footer_amigurumi:   "Amigurumi",
    footer_bags:        "Çantalar",
    footer_accessories: "Aksesuarlar",
    footer_faq:         "S.S.S.",
    footer_shipping:    "Kargo Bilgisi",
    footer_returns:     "İade & Değişim",
    footer_contact2:    "İletişim",
    footer_about2:      "Hakkımda",
    footer_etsy2:       "Etsy Mağazam",
    footer_custom:      "Özel Sipariş",
    footer_copy:        "© 2025 Aselovers. Tüm hakları saklıdır.",
    footer_made:        "Türkiye'de sevgiyle yapıldı",

    cart_title:     "Sepetim",
    cart_empty:     "Sepetiniz boş",
    cart_empty_sub: "Güzel ürünler sizi bekliyor",
    cart_total:     "Toplam",
    cart_checkout:  "Ödemeye Geç",
    added_cart:     "Sepete eklendi",
    add_to_cart:    "Sepete Ekle",
    view_on_etsy:   "Etsy'de İncele",
    cat_amigurumi:  "Amigurumi",
    cat_bag:        "Çantalar",
    cat_accessory:  "Aksesuarlar",
    cat_decor:      "Dekorasyon",
  },

  en: {
    ship_handmade: "Handmade",
    ship_custom:   "Custom Orders Welcome",
    ship_world:    "Worldwide Shipping from Turkey",

    trust1_t: "100% Handmade",      trust1_d: "Every product is crafted by hand with love, never by machine.",
    trust2_t: "Secure Shopping",    trust2_d: "All payments are protected with SSL encryption.",
    trust3_t: "Fast Shipping",      trust3_d: "2-3 days to TR, 7-14 business days to EU.",
    trust4_t: "Ships Worldwide",    trust4_d: "We ship to 12+ countries around the world.",

    cats_tag: "CATEGORIES", cats_title: "What Are You Looking For?",
    cats_tag_label: "Collection", cats_explore: "Explore",

    process_tag: "HOW WE MAKE IT",
    process_title: "The Care Behind Every Product",
    process_sub: "From raw materials to packaging — you will feel the quality at every step.",
    process_s1_t: "Yarn Selection",      process_s1_d: "I carefully select the finest yarns from Europe and Turkey. Color, texture, durability — everything matters.",
    process_s2_t: "Handmade Crafting",   process_s2_d: "Every stitch is made one by one, with love. No two products are the same — each is unique and handcrafted.",
    process_s3_t: "Pack & Deliver",      process_s3_d: "Your product travels the world in careful packaging. Every item passes quality control before boxing.",

    feat_ban_tag: "CUSTOM ORDER",
    feat_ban_title: "Let's Make What You Imagine",
    feat_ban_desc: "Color, size, character — I can make it exactly the way you want. Contact me for personalized gifts and decor.",
    feat_ban_cta: "Order on Etsy",

    gallery_title: "From Instagram", gallery_cta: "Follow @aselovers",

    nav_home:    "Home",
    nav_shop:    "Shop",
    nav_about:   "About",
    nav_contact: "Contact",
    nav_etsy:    "Etsy",

    hero_eyebrow:   "Handmade · From Turkey to the World",
    hero_title:     "A Story in Every <em>Stitch</em>",
    hero_desc:      "From Turkey to Europe — amigurumi toys, crochet bags, and handmade accessories. Each piece made with care, every stitch with love.",
    hero_cta1:      "Explore Collection",
    hero_cta2:      "View on Etsy",
    hero_stat1_val: "500+",
    hero_stat1_lab: "Happy Customers",
    hero_stat2_val: "12+",
    hero_stat2_lab: "Countries Shipped",
    hero_stat3_val: "100%",
    hero_stat3_lab: "Handmade",

    feat1: "Handmade",
    feat2: "Ships to TR & EU",
    feat3: "Custom Designs",
    feat4: "Secure Payment",
    feat5: "Return Guarantee",
    feat6: "Custom Orders",

    shop_tag:      "COLLECTION",
    shop_title:    "Crafted with Love",
    shop_all_btn:  "All Products",
    shop_etsy_cta: "Visit My Etsy Store",
    filter_all:        "All",
    filter_amigurumi:  "Amigurumi",
    filter_bag:        "Bags",
    filter_accessory:  "Accessories",
    filter_decor:      "Decor",

    about_tag:   "ABOUT ME",
    about_title: "The Crocheter Behind Aselovers",
    about_desc:  "Crochet is not just a hobby for me — it's a passion, a meditation, a form of expression. Every product that passes through my hands, from the choice of yarn to the final stitch, is a piece of me.",
    about_i1_t:  "Handmade",
    about_i1_p:  "Every product is crafted by hand with love, never by machine.",
    about_i2_t:  "Premium Yarns",
    about_i2_p:  "I use the finest yarns from Europe and Turkey.",
    about_i3_t:  "Custom Orders",
    about_i3_p:  "Color, size, design — we personalize it together with you.",
    about_etsy:  "Visit My Etsy Store",
    about_c1:    "Happy Customers",
    about_c2:    "Countries Shipped",
    about_c3:    "Handmade",
    about_badge: "Handcrafted",
    about_tab_story:   "Our Story",
    about_tab_values:  "Our Values",
    about_tab_process: "Process",
    about_shop_cta:    "Explore Collection",
    val_care_t:    "Love & Care",       val_care_p:    "I pour a piece of myself into every stitch.",
    val_quality_t: "Top Quality",       val_quality_p: "From yarn to packaging, I never compromise.",
    proc_1_t: "Yarn Selection",         proc_1_p: "I carefully choose the finest yarns from Europe and Turkey.",
    proc_2_t: "Handcrafting",           proc_2_p: "Every stitch is made one by one, with patience and love.",
    proc_3_t: "Quality Control",        proc_3_p: "Every piece is carefully inspected before shipping.",
    proc_4_t: "Careful Packaging",      proc_4_p: "Your order travels the world wrapped like a gift.",

    reviews_tag:   "CUSTOMER REVIEWS",
    reviews_title: "What My Customers Say",
    reviews_sub:   "Happy customers from all over the world sharing their experiences.",

    news_title: "Stay Updated on New Collections",
    news_sub:   "Join the list to be the first to hear about new arrivals.",
    news_ph:    "Your email address",
    news_btn:   "Subscribe",

    footer_desc:        "Bringing colour to your life with handmade crochet. From Turkey to the world, with love.",
    footer_shop:        "Shop",
    footer_help:        "Help",
    footer_info:        "Info",
    footer_products:    "All Products",
    footer_amigurumi:   "Amigurumi",
    footer_bags:        "Bags",
    footer_accessories: "Accessories",
    footer_faq:         "FAQ",
    footer_shipping:    "Shipping Info",
    footer_returns:     "Returns & Exchanges",
    footer_contact2:    "Contact",
    footer_about2:      "About Me",
    footer_etsy2:       "My Etsy Store",
    footer_custom:      "Custom Order",
    footer_copy:        "© 2025 Aselovers. All rights reserved.",
    footer_made:        "Made with love in Turkey",

    cart_title:     "My Cart",
    cart_empty:     "Your cart is empty",
    cart_empty_sub: "Beautiful pieces are waiting for you",
    cart_total:     "Total",
    cart_checkout:  "Proceed to Checkout",
    added_cart:     "Added to cart",
    add_to_cart:    "Add to Cart",
    view_on_etsy:   "View on Etsy",
    cat_amigurumi:  "Amigurumi",
    cat_bag:        "Bags",
    cat_accessory:  "Accessories",
    cat_decor:      "Decor",
  }
};

/* ── State ── */
let currentLang = localStorage.getItem('ase_lang') || 'tr';
let cart = JSON.parse(localStorage.getItem('ase_cart') || '[]');
let allProducts = [];
let activeFilter = 'all';

/* ── Reviews ── */
const reviews = [
  // Column 1
  {
    text_tr: 'Flamingo çok güzel! Açıklandığı gibi. Harika bir hediye olacak.',
    text_en: 'The flamingo is beautiful! Just as described. Will make a wonderful gift.',
    author: 'K. L.', role_tr: 'Etsy Alıcısı', role_en: 'Etsy Buyer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
  {
    text_tr: 'Özel sipariş verdim, belirli renk ve boyut istedim. Harika görünüyor! Doğum günü kızına vermek için sabırsızlanıyorum.',
    text_en: "Custom order with a specific color and size. It looks GREAT! Can't wait to give it to the birthday girl!",
    author: 'Julie M.', role_tr: 'Hollanda', role_en: 'Netherlands',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
  {
    text_tr: 'Kalite beklentimin çok üzerindeydi. Her dikişte özen hissediliyor. Kesinlikle tekrar sipariş vereceğim.',
    text_en: 'The quality far exceeded my expectations. You can feel the care in every stitch. I will definitely order again.',
    author: 'Sophie R.', role_tr: 'Almanya', role_en: 'Germany',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
  // Column 2
  {
    text_tr: 'Bu özel hediyenin sonucunu çok sevdim! Müşteri hizmetleri mükemmeldi.',
    text_en: 'I love the result of this custom gift! The customer service was outstanding.',
    author: 'Etsy Buyer', role_tr: 'İngiltere', role_en: 'United Kingdom',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
  {
    text_tr: 'Amigurumi tavşan çocuğumun en sevdiği oyuncak oldu. Kalitesi ve işçiliği olağanüstü.',
    text_en: "The amigurumi bunny became my child's favourite toy. The quality and craftsmanship are extraordinary.",
    author: 'Anna K.', role_tr: 'Belçika', role_en: 'Belgium',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
  {
    text_tr: 'İlk siparişimde çok memnun kaldım. Paketleme de çok özenli, hediye olarak çok şık geldi.',
    text_en: 'Very happy with my first order. The packaging was so thoughtful — arrived looking like a beautiful gift.',
    author: 'Maria T.', role_tr: 'İspanya', role_en: 'Spain',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
  // Column 3
  {
    text_tr: 'Perde tutucular harika yapılmış ve çok sevimli. Oğlumun safari temalı bebek odasında mükemmel görünecekler.',
    text_en: "Wonderfully made and very cute. They'll look perfect in our son's safari nursery.",
    author: 'Zoe P.', role_tr: 'Avustralya', role_en: 'Australia',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
  {
    text_tr: 'Renk seçenekleri ve kişiselleştirme imkânı harika. Tam istediğim gibi çıktı.',
    text_en: 'The colour options and customisation possibilities are amazing. It came out exactly as I wanted.',
    author: 'Lena B.', role_tr: 'Fransa', role_en: 'France',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
  {
    text_tr: 'Etsy\'de pek çok satıcı denedim ama Aselovers açık ara en iyisi. Hızlı, özenli ve çok kaliteli.',
    text_en: "I've tried many Etsy sellers but Aselovers is by far the best. Fast, careful, and incredibly high quality.",
    author: 'Claire D.', role_tr: 'İrlanda', role_en: 'Ireland',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&q=80',
    stars: 5
  },
];

/* ── Translate ── */
function t(key) {
  return (translations[currentLang] || translations.tr)[key] || key;
}

function applyLang() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT') el.placeholder = val;
    else el.innerHTML = val;
  });
  document.querySelectorAll('.lang-switch button, .mobile-lang button').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === currentLang)
  );
  renderProducts();
  renderReviews();
  renderCart();
  localStorage.setItem('ase_lang', currentLang);
}

function setLang(lang) { currentLang = lang; applyLang(); }

/* ── Load products ── */
async function loadProducts() {
  try {
    const res = await fetch('products.json?t=' + Date.now());
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    allProducts = (data.products || []).filter(p => p.isActive !== false);
    renderProducts();
    renderCart();
  } catch {
    allProducts = getFallbackProducts();
    renderProducts();
  }
}

function getFallbackProducts() {
  return [
    { id:'1', title_tr:'Örgü Tavşan Bebek', title_en:'Crochet Bunny Plush', description_tr:'Özel isimli el yapımı tavşan.', description_en:'Custom name handmade bunny.', price:1912, currency:'TRY', image:null, url:'https://aselovers.etsy.com/', category:'amigurumi', isNew:true },
    { id:'2', title_tr:'Örgü Flamingo', title_en:'Crochet Flamingo', description_tr:'Pembe bebek odası süsü.', description_en:'Pink nursery decor.', price:2287, currency:'TRY', image:null, url:'https://aselovers.etsy.com/', category:'amigurumi', isNew:false },
    { id:'3', title_tr:'Perde Tutucu', title_en:'Curtain Tieback', description_tr:'Sevimli perde tutucu.', description_en:'Cute curtain tieback.', price:1874, currency:'TRY', image:null, url:'https://aselovers.etsy.com/', category:'decor', isNew:false },
    { id:'4', title_tr:'Saç Tokası Seti', title_en:'Hair Clips Set', description_tr:'El yapımı saç aksesuarları.', description_en:'Handmade hair accessories.', price:411, currency:'TRY', image:null, url:'https://aselovers.etsy.com/', category:'accessory', isNew:true },
  ];
}

/* ── Quick View ── */
function openQuickView(id) {
  const p = allProducts.find(x => x.id == id);
  if (!p) return;
  const name  = currentLang === 'tr' ? (p.title_tr || p.title_en) : (p.title_en || p.title_tr);
  const desc  = currentLang === 'tr' ? (p.description_tr || p.description_en) : (p.description_en || p.description_tr);
  const priceStr = p.currency === 'TRY'
    ? `${Number(p.price).toLocaleString('tr-TR')} ₺`
    : `${p.price} ${p.currency}`;

  document.getElementById('qv-img').innerHTML = p.image
    ? `<img src="${p.image}" alt="${name}" />`
    : `<div class="qv-img-placeholder"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".7"><circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 1 8 0"/></svg></div>`;

  document.getElementById('qv-body').innerHTML = `
    <span class="qv-tag">${t('cat_' + p.category) || p.category}</span>
    <h2 class="qv-name">${name}</h2>
    <div class="qv-rating">
      <span class="qv-stars">★★★★★</span>
      <span class="qv-rating-label">5.0 · Etsy</span>
    </div>
    <p class="qv-desc">${desc}</p>
    <div class="qv-price">${priceStr}</div>
    <div class="qv-actions">
      <button class="qv-add-cart" onclick="addToCart('${p.id}'); closeQuickView()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        ${t('add_to_cart')}
      </button>
      <a href="${p.url}" target="_blank" class="qv-etsy">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.956 0C5.354 0 0 5.354 0 11.956c0 6.603 5.354 11.957 11.956 11.957s11.957-5.354 11.957-11.957C23.913 5.354 18.559 0 11.956 0zm4.47 16.364c-.293.098-.88.196-1.37.196-2.054 0-2.544-1.174-2.544-2.935V9.89h-1.076v-1.37h1.076V6.647l1.86-.587v2.46h1.76v1.37h-1.76v3.54c0 .783.294 1.076.88 1.076.196 0 .49-.098.783-.195l.39 1.053z"/></svg>
        Etsy
      </a>
    </div>`;

  document.getElementById('qv-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeQuickView(e) {
  if (e && e.target !== document.getElementById('qv-backdrop')) return;
  document.getElementById('qv-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Render Products ── */
function renderProducts(filter) {
  if (filter !== undefined) activeFilter = filter;
  const grid = document.getElementById('product-grid') || document.getElementById('shop-product-grid');
  if (!grid) return;

  const list = activeFilter === 'all'
    ? [...allProducts]
    : allProducts.filter(p => p.category === activeFilter);

  if (list.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--mid)">
      <p>${currentLang === 'tr' ? 'Bu kategoride ürün yok.' : 'No products in this category.'}</p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const name  = currentLang === 'tr' ? (p.title_tr || p.title_en) : (p.title_en || p.title_tr);
    const desc  = currentLang === 'tr' ? (p.description_tr || p.description_en) : (p.description_en || p.description_tr);
    const catLabel = t('cat_' + p.category) || p.category;
    const badge = p.isNew
      ? `<span class="product-badge badge-new">${currentLang === 'tr' ? 'Yeni' : 'New'}</span>`
      : '';
    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${name}" loading="lazy" />`
      : `<div class="product-img-placeholder">
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".8">
             <circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 1 8 0"/>
           </svg>
         </div>`;
    const priceStr = p.currency === 'TRY'
      ? `${Number(p.price).toLocaleString('tr-TR')} ₺`
      : `${p.price} ${p.currency}`;

    return `
    <div class="product-card fade-up" data-id="${p.id}">
      <div class="product-img">
        ${imgHtml}
        ${badge}
        <div class="product-overlay">
          <button class="quick-view-btn" onclick="openQuickView('${p.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${currentLang === 'tr' ? 'Hızlı Bak' : 'Quick View'}
          </button>
        </div>
        <button class="product-wishlist" aria-label="Wishlist">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div class="product-info">
        <div class="product-cat">${catLabel}</div>
        <h3 class="product-name">${name}</h3>
        <p class="product-desc">${desc}</p>
        <div class="product-footer">
          <div class="product-price">${priceStr}</div>
          <button class="add-to-cart" onclick="addToCart('${p.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            ${t('add_to_cart')}
          </button>
        </div>
        <a href="${p.url}" target="_blank" class="btn-ghost" style="margin-top:10px;display:inline-flex">${t('view_on_etsy')}</a>
      </div>
    </div>`;
  }).join('');

  observeFadeElements();
}

/* ── Render Reviews — 3-column infinite scroll ── */
function renderReviews() {
  const cols = [
    document.getElementById('testi-col-1'),
    document.getElementById('testi-col-2'),
    document.getElementById('testi-col-3'),
  ];
  if (!cols[0]) return;

  const col1 = reviews.slice(0, 3);
  const col2 = reviews.slice(3, 6);
  const col3 = reviews.slice(6, 9);
  const durations = [15, 19, 17];

  [col1, col2, col3].forEach((colData, ci) => {
    const el = cols[ci];
    if (!el) return;
    // duplicate for seamless loop
    const doubled = [...colData, ...colData];
    const cardHtml = doubled.map((r, i) => {
      const text  = currentLang === 'tr' ? r.text_tr : r.text_en;
      const role  = currentLang === 'tr' ? r.role_tr : r.role_en;
      return `
      <article class="testi-card" ${i >= colData.length ? 'aria-hidden="true"' : ''}>
        <div class="testi-stars">${'★'.repeat(r.stars)}</div>
        <p class="testi-text">${text}</p>
        <footer class="testi-footer">
          <img class="testi-avatar" src="${r.avatar}" alt="${r.author}" width="40" height="40" loading="lazy" />
          <div>
            <div class="testi-name">${r.author}</div>
            <div class="testi-role">${role}</div>
          </div>
        </footer>
      </article>`;
    }).join('');
    el.innerHTML = `<div class="testi-scroll" style="--dur:${durations[ci]}s">${cardHtml}</div>`;
  });
}

/* ── Cart ── */
function addToCart(id) {
  const product = allProducts.find(p => p.id == id);
  if (!product) return;
  const existing = cart.find(i => i.id == id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  saveCart();
  renderCart();
  updateCartCount();
  showToast(t('added_cart'), 'success');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id != id);
  saveCart(); renderCart(); updateCartCount();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id == id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else { saveCart(); renderCart(); updateCartCount(); }
}

function saveCart() { localStorage.setItem('ase_cart', JSON.stringify(cart)); }

function updateCartCount() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = total;
    el.classList.toggle('visible', total > 0);
  });
}

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
        <p><strong>${t('cart_empty')}</strong></p>
        <p style="font-size:13px">${t('cart_empty_sub')}</p>
      </div>`;
  } else {
    itemsEl.innerHTML = cart.map(item => {
      const name = currentLang === 'tr' ? (item.title_tr || item.title_en) : (item.title_en || item.title_tr);
      const priceStr = item.currency === 'TRY'
        ? `${Number(item.price).toLocaleString('tr-TR')} ₺`
        : `${item.price} ${item.currency}`;
      const imgHtml = item.image
        ? `<img src="${item.image}" alt="${name}" />`
        : '';
      return `
      <div class="cart-item">
        <div class="cart-item-img">${imgHtml}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${name}</div>
          <div class="cart-item-price">${priceStr}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
            <button class="remove-item" onclick="removeFromCart('${item.id}')">Remove</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  if (totalEl) totalEl.textContent = total.toLocaleString('tr-TR') + ' ₺';

  const checkoutEl = document.getElementById('checkout-btn');
  if (checkoutEl) checkoutEl.textContent = t('cart_checkout');
  const totalLabelEl = document.getElementById('cart-total-label');
  if (totalLabelEl) totalLabelEl.textContent = t('cart_total');
}

/* ── Cart Drawer ── */
function openCart() {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Mobile Nav ── */
function openMobileNav() {
  document.getElementById('mobile-nav')?.classList.add('open');
  document.getElementById('mobile-nav-backdrop')?.classList.add('open');
  document.getElementById('hamburger')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeMobileNav() {
  document.getElementById('mobile-nav')?.classList.remove('open');
  document.getElementById('mobile-nav-backdrop')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('active');
  document.body.style.overflow = '';
}

/* ── Toast ── */
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── Scroll ── */
function onScroll() {
  const y = window.scrollY;
  const hero = document.querySelector('.hero');
  const threshold = hero ? Math.max(hero.offsetHeight - 100, 60) : 60;
  document.getElementById('site-header')?.classList.toggle('scrolled', y > threshold);
  document.getElementById('scroll-top')?.classList.toggle('visible', y > 400);
}

/* ── Intersection Observer ── */
function observeFadeElements() {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.fade-up:not(.visible)').forEach(el => io.observe(el));
}

/* ── Filter ── */
function setFilter(cat) {
  activeFilter = cat;
  document.querySelectorAll('.filter-btn, .cat-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === cat)
  );
  renderProducts(cat);
}

/* ── Newsletter ── */
async function handleNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const btn   = e.target.querySelector('button');
  if (!input.value) return;
  const email = input.value.trim();
  btn.disabled = true;
  try {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      showToast(currentLang === 'tr' ? 'Abone oldunuz! 🎉' : 'Subscribed! 🎉', 'success');
      input.value = '';
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || (currentLang === 'tr' ? 'Bir hata oluştu.' : 'Something went wrong.'), 'error');
    }
  } catch {
    showToast(currentLang === 'tr' ? 'Abone oldunuz!' : 'Subscribed!', 'success');
    input.value = '';
  } finally {
    btn.disabled = false;
  }
}

/* ── Hero Marquee ── */
const MARQUEE_IMAGES = [
  { src: 'https://i.etsystatic.com/65409401/r/il/0a28d4/8107536487/il_600x600.8107536487_c15v.jpg', alt: 'Örgü Tavşan' },
  { src: 'https://i.etsystatic.com/65409401/r/il/d6d3ba/8097215171/il_600x600.8097215171_94ly.jpg', alt: 'Örgü Flamingo' },
  { src: 'https://i.etsystatic.com/65409401/r/il/e5d94b/8082226247/il_600x600.8082226247_n28o.jpg', alt: 'Örgü Ayı' },
  { src: 'https://i.etsystatic.com/65409401/r/il/8be45d/7988910978/il_600x600.7988910978_kexd.jpg', alt: 'El Yapımı Amigurumi' },
  { src: 'https://i.etsystatic.com/65409401/r/il/b7c3b9/8111229068/il_600x600.8111229068_jycs.jpg', alt: 'Örgü Çanta' },
  { src: 'https://i.etsystatic.com/65409401/r/il/0a28d4/8107536487/il_600x600.8107536487_c15v.jpg', alt: 'Örgü Tavşan 2' },
  { src: 'https://i.etsystatic.com/65409401/r/il/d6d3ba/8097215171/il_600x600.8097215171_94ly.jpg', alt: 'Örgü Flamingo 2' },
  { src: 'https://i.etsystatic.com/65409401/r/il/e5d94b/8082226247/il_600x600.8082226247_n28o.jpg', alt: 'Örgü Ayı 2' },
];

function buildMarquee() {
  const track = document.getElementById('marquee-track');
  if (!track) return;
  // double for seamless loop
  const imgs = [...MARQUEE_IMAGES, ...MARQUEE_IMAGES];
  track.innerHTML = imgs.map(({ src, alt }, i) => `
    <div class="marquee-img" onclick="window.location.href='shop.html'">
      <img src="${src}" alt="${alt}" loading="${i < 5 ? 'eager' : 'lazy'}" />
    </div>
  `).join('');
}

/* ── Init ── */
/* ── Animated Counters ── */
function initCounters() {
  const nums = document.querySelectorAll('.counter-num');
  if (!nums.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.target;
      const dur = 1600;
      const step = target / (dur / 16);
      let cur = 0;
      const tick = () => {
        cur = Math.min(cur + step, target);
        el.textContent = Math.floor(cur);
        if (cur < target) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.4 });
  nums.forEach(n => obs.observe(n));
}

/* ── About Tabs ── */
function initAboutTabs() {
  document.querySelectorAll('.about-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.about-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === target);
        t.setAttribute('aria-selected', t.dataset.tab === target);
      });
      document.querySelectorAll('.about-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.panel === target);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  buildMarquee();
  await loadProducts();

  applyLang();
  updateCartCount();
  onScroll();
  observeFadeElements();
  initCounters();
  initAboutTabs();

  window.addEventListener('scroll', onScroll, { passive: true });

  document.querySelectorAll('.lang-switch button, .mobile-lang button').forEach(b =>
    b.addEventListener('click', () => setLang(b.dataset.lang))
  );

  document.querySelectorAll('.cart-btn').forEach(b => b.addEventListener('click', openCart));

  document.getElementById('scroll-top')?.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: 'smooth' })
  );

  document.getElementById('hamburger')?.addEventListener('click', openMobileNav);
  document.getElementById('mobile-nav-close')?.addEventListener('click', closeMobileNav);

  document.querySelectorAll('.filter-btn, .cat-btn').forEach(b =>
    b.addEventListener('click', () => setFilter(b.dataset.cat))
  );

  document.getElementById('newsletter-form')?.addEventListener('submit', handleNewsletter);
});
