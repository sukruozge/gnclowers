/**
 * ASELOVERS — CMS (Content Management System)
 * Reads from content.json, overrides from localStorage.
 * Admin panel writes to localStorage; all pages auto-inherit.
 */

const CMS = (() => {
  const LS_KEY = 'ase_content';
  let _data = null;
  let _callbacks = [];

  async function load() {
    // Fetch defaults
    let defaults = {};
    try {
      const res = await fetch('content.json?v=' + Date.now());
      defaults = await res.json();
    } catch (e) {
      console.warn('[CMS] content.json yüklenemedi', e);
    }

    // Merge localStorage overrides (deep merge)
    const overrides = getLocalOverrides();
    _data = deepMerge(defaults, overrides);
    _callbacks.forEach(fn => fn(_data));
    return _data;
  }

  function get(path, fallback = '') {
    if (!_data) return fallback;
    const parts = path.split('.');
    let curr = _data;
    for (const p of parts) {
      if (curr == null || typeof curr !== 'object') return fallback;
      curr = curr[p];
    }
    return curr ?? fallback;
  }

  function set(path, value) {
    const overrides = getLocalOverrides();
    const parts = path.split('.');
    let obj = overrides;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    localStorage.setItem(LS_KEY, JSON.stringify(overrides));

    // Re-merge
    _data = deepMerge(_data, overrides);
    _callbacks.forEach(fn => fn(_data));
  }

  function setMany(updates) {
    // updates: { 'path.to.key': value }
    const overrides = getLocalOverrides();
    for (const [path, value] of Object.entries(updates)) {
      const parts = path.split('.');
      let obj = overrides;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(overrides));
    _data = deepMerge(_data, overrides);
    _callbacks.forEach(fn => fn(_data));
  }

  function reset(path) {
    if (!path) {
      localStorage.removeItem(LS_KEY);
    } else {
      const overrides = getLocalOverrides();
      const parts = path.split('.');
      let obj = overrides;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) return;
        obj = obj[parts[i]];
      }
      delete obj[parts[parts.length - 1]];
      localStorage.setItem(LS_KEY, JSON.stringify(overrides));
    }
    load();
  }

  function onChange(fn) { _callbacks.push(fn); }

  function getLocalOverrides() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch { return {}; }
  }

  function deepMerge(target, source) {
    const result = Object.assign({}, target);
    for (const key of Object.keys(source || {})) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  // Apply [data-cms] attributes to DOM
  function applyToDOM(root = document) {
    root.querySelectorAll('[data-cms]').forEach(el => {
      const path = el.dataset.cms;
      const val = get(path);
      if (val == null) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = val;
      } else if (el.tagName === 'A' && el.dataset.cmsHref) {
        el.href = val;
      } else {
        el.innerHTML = val;
      }
    });
    root.querySelectorAll('[data-cms-src]').forEach(el => {
      const val = get(el.dataset.cmsSrc);
      if (val) el.src = val;
    });
    root.querySelectorAll('[data-cms-href]').forEach(el => {
      const val = get(el.dataset.cmsHref);
      if (val) el.href = val;
    });
  }

  return { load, get, set, setMany, reset, onChange, applyToDOM, getAll: () => _data };
})();

/* ── i18n ──────────────────────────────────────────────────── */
const I18N = (() => {
  let lang = localStorage.getItem('ase_lang') || 'tr';

  const t = {
    tr: {
      nav_home: 'Ana Sayfa', nav_products: 'Ürünler', nav_about: 'Hakkımızda',
      nav_blog: 'Blog', nav_contact: 'İletişim', nav_etsy: 'Etsy\'de Gör',
      cart_title: 'Sepetim', cart_empty: 'Sepetiniz boş',
      cart_empty_sub: 'Güzel ürünler sizi bekliyor', cart_total: 'Toplam',
      cart_checkout: 'Ödemeye Geç', added_cart: 'Sepete eklendi!',
      add_cart: 'Sepete Ekle', view_etsy: 'Etsy\'de İncele',
      filter_all: 'Tümü', filter_amigurumi: 'Amigurumi',
      filter_bag: 'Çantalar', filter_decor: 'Dekorasyon', filter_accessory: 'Aksesuarlar',
      cat_amigurumi: 'Amigurumi', cat_bag: 'Çanta', cat_decor: 'Dekorasyon', cat_accessory: 'Aksesuar',
      products_loading: 'Ürünler yükleniyor...', products_empty: 'Bu kategoride ürün bulunamadı.',
      newsletter_success: 'Abone oldunuz! Teşekkürler 🧶', newsletter_ph: 'E-posta adresiniz',
      read_more: 'Devamını Oku', back_to_blog: '← Tüm Yazılar',
      contact_success: 'Mesajınız alındı! En geç 24 saat içinde dönüyoruz.',
      send: 'Gönder',
    },
    en: {
      nav_home: 'Home', nav_products: 'Products', nav_about: 'About',
      nav_blog: 'Blog', nav_contact: 'Contact', nav_etsy: 'View on Etsy',
      cart_title: 'My Cart', cart_empty: 'Your cart is empty',
      cart_empty_sub: 'Beautiful products are waiting for you', cart_total: 'Total',
      cart_checkout: 'Proceed to Checkout', added_cart: 'Added to cart!',
      add_cart: 'Add to Cart', view_etsy: 'View on Etsy',
      filter_all: 'All', filter_amigurumi: 'Amigurumi',
      filter_bag: 'Bags', filter_decor: 'Decor', filter_accessory: 'Accessories',
      cat_amigurumi: 'Amigurumi', cat_bag: 'Bag', cat_decor: 'Decor', cat_accessory: 'Accessory',
      products_loading: 'Loading products...', products_empty: 'No products found in this category.',
      newsletter_success: 'Subscribed! Thank you 🧶', newsletter_ph: 'Your email address',
      read_more: 'Read More', back_to_blog: '← All Posts',
      contact_success: 'Message received! We\'ll get back to you within 24 hours.',
      send: 'Send',
    }
  };

  function get(key) { return (t[lang] || t.tr)[key] || key; }
  function getLang() { return lang; }
  function setLang(l) {
    lang = l;
    localStorage.setItem('ase_lang', l);
    document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = get(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = get(el.dataset.i18nPh);
    });
    document.querySelectorAll('.lang-toggle button').forEach(b =>
      b.classList.toggle('active', b.dataset.lang === lang)
    );
  }
  function apply() { setLang(lang); }
  return { get, getLang, setLang, apply };
})();

/* ── Cart ──────────────────────────────────────────────────── */
const CART = (() => {
  const LS = 'ase_cart_v2';
  let items = [];
  try { items = JSON.parse(localStorage.getItem(LS) || '[]'); } catch {}

  function save() { localStorage.setItem(LS, JSON.stringify(items)); }

  function add(product) {
    const existing = items.find(i => i.id === product.id);
    if (existing) existing.qty++;
    else items.push({ ...product, qty: 1 });
    save(); render(); updateBadge();
  }

  function remove(id) { items = items.filter(i => i.id !== id); save(); render(); updateBadge(); }
  function changeQty(id, d) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.qty += d;
    if (item.qty <= 0) remove(id);
    else { save(); render(); updateBadge(); }
  }
  function clear() { items = []; save(); render(); updateBadge(); }

  function updateBadge() {
    const total = items.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = total;
      el.classList.toggle('show', total > 0);
    });
  }

  function render() {
    const body = document.getElementById('cart-body');
    const totalEl = document.getElementById('cart-total');
    if (!body) return;

    if (items.length === 0) {
      body.innerHTML = `<div class="cart-empty"><span style="font-size:2.5rem">🛒</span><p>${I18N.get('cart_empty')}</p><p style="font-size:.82rem">${I18N.get('cart_empty_sub')}</p></div>`;
    } else {
      body.innerHTML = items.map(item => {
        const name = I18N.getLang() === 'tr' ? (item.title_tr || item.title_en) : (item.title_en || item.title_tr);
        const imgHtml = item.image
          ? `<img src="${item.image}" alt="${name}" />`
          : '🧶';
        const price = formatPrice(item.price, item.currency);
        return `<div class="cart-item">
          <div class="cart-item-img">${imgHtml}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${name}</div>
            <div class="cart-item-price">${price}</div>
            <div class="cart-qty">
              <button class="qty-btn" onclick="CART.changeQty('${item.id}',-1)">−</button>
              <span class="qty-num">${item.qty}</span>
              <button class="qty-btn" onclick="CART.changeQty('${item.id}',1)">+</button>
              <button class="remove-btn" onclick="CART.remove('${item.id}')">✕ ${I18N.get('remove') || ''}</button>
            </div>
          </div>
        </div>`;
      }).join('');
    }
    const total = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);
    if (totalEl) totalEl.textContent = total > 0 ? formatPrice(total, items[0]?.currency || 'TRY') : '0 ₺';
  }

  function openDrawer() {
    document.getElementById('cart-overlay')?.classList.add('open');
    document.getElementById('cart-drawer')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    render();
  }
  function closeDrawer() {
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  return { add, remove, changeQty, clear, render, openDrawer, closeDrawer, updateBadge, getItems: () => items };
})();

/* ── Utils ─────────────────────────────────────────────────── */
function formatPrice(amount, currency = 'TRY') {
  const n = Number(amount);
  if (currency === 'TRY') return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';
  if (currency === 'USD') return '$' + n.toFixed(2);
  if (currency === 'EUR') return '€' + n.toFixed(2);
  return n + ' ' + currency;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type;
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function observeFadeUp() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
}

function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 400), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50), { passive: true });
  // Hamburger
  document.getElementById('hamburger')?.addEventListener('click', () => document.getElementById('mobile-nav')?.classList.add('open'));
  document.getElementById('mobile-nav-close')?.addEventListener('click', () => document.getElementById('mobile-nav')?.classList.remove('open'));
  // Lang
  document.querySelectorAll('.lang-toggle button').forEach(b => b.addEventListener('click', () => I18N.setLang(b.dataset.lang)));
  // Cart
  document.querySelectorAll('.cart-icon').forEach(b => b.addEventListener('click', CART.openDrawer));
  document.getElementById('cart-overlay')?.addEventListener('click', CART.closeDrawer);
  // Active link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', href === path || href === path.replace('.html', ''));
  });
}

function initNewsletter() {
  document.getElementById('newsletter-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (!input?.value) return;
    showToast(I18N.get('newsletter_success'), 'ok');
    input.value = '';
  });
}

/* ── Image Marquee ── */
async function buildImgMarquee() {
  const track = document.getElementById('img-marquee-track');
  if (!track) return;
  let images = [];
  try {
    const r = await fetch('products.json?v=' + Date.now());
    const d = await r.json();
    images = (d.products || []).filter(p => p.image && p.isActive !== false).map(p => ({ src: p.image, alt: p.title_tr || p.title_en || '' }));
  } catch {}
  if (!images.length) {
    // Fallback: hardcoded Etsy images
    images = [
      { src: 'https://i.etsystatic.com/65409401/r/il/0a28d4/8107536487/il_600x600.8107536487_c15v.jpg', alt: 'Amigurumi Tavşan' },
      { src: 'https://i.etsystatic.com/65409401/r/il/d6d3ba/8097215171/il_600x600.8097215171_94ly.jpg', alt: 'Flamingo' },
      { src: 'https://i.etsystatic.com/65409401/r/il/b7c3b9/8111229068/il_600x600.8111229068_jycs.jpg', alt: 'Aksesuar' },
      { src: 'https://i.etsystatic.com/65409401/r/il/8be45d/7988910978/il_600x600.7988910978_kexd.jpg', alt: 'Ürün' },
    ];
  }
  // Duplicate for seamless loop
  const items = [...images, ...images];
  track.innerHTML = items.map(img =>
    `<div class="img-marquee-img"><img src="${img.src}" alt="${img.alt}" loading="lazy"></div>`
  ).join('');
}
