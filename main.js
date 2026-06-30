/* ============================================================
   ASELOVERS — Main JavaScript
   ============================================================ */

/* ── i18n Translations ── */
const translations = {
  tr: {
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

    reviews_tag:   "MÜŞTERİ YORUMLARI",
    reviews_title: "Müşterilerim Ne Diyor?",

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

    reviews_tag:   "CUSTOMER REVIEWS",
    reviews_title: "What My Customers Say",

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
  {
    text_tr: 'Flamingo çok güzel! Açıklandığı gibi. Harika bir hediye olacak.',
    text_en: 'The flamingo is beautiful! Just as described. Will make a wonderful gift.',
    author: 'K.', loc: 'Etsy · Jun 2025', stars: 5
  },
  {
    text_tr: 'Özel sipariş verdim, belirli renk ve boyut istedim. Harika görünüyor! Doğum günü kızına vermek için sabırsızlanıyorum.',
    text_en: "I placed a custom order with a specific color and size. It looks GREAT! Can't wait to give it to the birthday girl!",
    author: 'Julie', loc: 'Etsy · Jun 2025', stars: 5
  },
  {
    text_tr: 'Bu özel hediyenin sonucunu çok sevdim! Müşteri hizmetleri mükemmeldi, kalite beklentimin çok üzerinde.',
    text_en: 'I love the result of this custom gift! The customer service was outstanding and the quality exceeded my expectations.',
    author: 'Etsy Buyer', loc: 'Etsy · May 2025', stars: 5
  },
  {
    text_tr: 'Perde tutucular harika yapılmış ve çok sevimli. Oğlumun safari temalı bebek odasında mükemmel görünecekler.',
    text_en: "Wonderfully made and very cute. They'll look beautiful in our son's safari-themed nursery.",
    author: 'Zoe', loc: 'Etsy · May 2025', stars: 5
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

/* ── Render Reviews ── */
function renderReviews() {
  const grid = document.getElementById('reviews-grid');
  if (!grid) return;
  grid.innerHTML = reviews.map(r => {
    const text = currentLang === 'tr' ? r.text_tr : r.text_en;
    const initial = r.author.charAt(0).toUpperCase();
    return `
    <div class="testimonial-card fade-up">
      <div class="stars">${'★'.repeat(r.stars)}</div>
      <p class="testimonial-text">"${text}"</p>
      <div class="testimonial-author">
        <div class="author-avatar">${initial}</div>
        <div>
          <div class="author-name">${r.author}</div>
          <div class="author-loc">${r.loc}</div>
        </div>
      </div>
    </div>`;
  }).join('');
  observeFadeElements();
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
  document.body.style.overflow = 'hidden';
}
function closeMobileNav() {
  document.getElementById('mobile-nav')?.classList.remove('open');
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
function handleNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  if (!input.value) return;
  showToast(currentLang === 'tr' ? 'Abone oldunuz!' : 'Subscribed!', 'success');
  input.value = '';
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();

  applyLang();
  updateCartCount();
  onScroll();
  observeFadeElements();

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
