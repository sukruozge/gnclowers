'use strict';

/**
 * ASELOVERS — Secure Express Server
 * ─────────────────────────────────────────────
 * Kullanım : node server.js
 * Site     : http://localhost:3000
 * Admin    : http://localhost:3000/admin
 *
 * Güvenlik:
 *   • Helmet (CSP, HSTS, X-Frame-Options, CORP, COOP, …)
 *   • express-rate-limit (genel + giriş)
 *   • Brute-force IP kilidi (5 deneme → 15 dk blok)
 *   • bcryptjs (rounds=12) şifre doğrulama
 *   • JWT (HS256) httpOnly + SameSite=Strict çerezinde
 *   • express-validator (girdi doğrulama + sanitasyon)
 *   • Özel CSRF başlığı (X-Ase-Admin: 1)
 *   • Hassas dosyalara statik erişim engeli
 *   • Atomik JSON yazma (tmp → rename)
 *   • Production'da hata detayı yok
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const cookie = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

require('dotenv').config();

// ── Config ────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const DIR = __dirname;

// JWT secret — must be set in .env for production
const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const s = crypto.randomBytes(64).toString('hex');
  console.warn('[WARN] JWT_SECRET .env dosyasında tanımlı değil — her yeniden başlatmada oturumlar sıfırlanır');
  return s;
})();

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';

// ADMIN_HASH is initialized synchronously below after path and helper definitions

// ── Paths ─────────────────────────────────────────────
const DATA_DIR = path.join(DIR, 'data');
const PRODUCTS_F = path.join(DIR, 'src', 'data', 'products.json');
const SUBS_F = path.join(DATA_DIR, 'subscribers.json');
const ACTIVITY_F = path.join(DATA_DIR, 'activity.json');
const SETTINGS_F = path.join(DIR, 'src', 'data', 'settings.json');
const BLOG_F = path.join(DIR, 'src', 'data', 'blog.json');
const CHATS_F = path.join(DATA_DIR, 'chats.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── JSON helpers ──────────────────────────────────────
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file); // atomic
}

function logActivity(action, detail = '') {
  const log = readJSON(ACTIVITY_F, []);
  log.unshift({ ts: new Date().toISOString(), action, detail });
  writeJSON(ACTIVITY_F, log.slice(0, 500));
}

// Read settings first to get any persisted admin password hash
const savedSettings = readJSON(SETTINGS_F, {});

// Prefer process.env.ADMIN_PASSWORD_HASH, fall back to savedSettings.adminPasswordHash
let ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || savedSettings.adminPasswordHash || null;

// Fallbacks if no hash is available yet
if (!ADMIN_HASH && process.env.ADMIN_PASSWORD) {
  ADMIN_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
  console.warn('[WARN] ADMIN_PASSWORD kullanılıyor — ADMIN_PASSWORD_HASH kullanmanız önerilir');
}

if (!ADMIN_HASH) {
  ADMIN_HASH = bcrypt.hashSync('Aselovers2024!', 12);
  console.warn('[WARN] Admin şifresi .env dosyasında/ayarlarda YOK — varsayılan "Aselovers2024!" kullanılıyor. HEMEN DEĞİŞTİRİN!');
}

// ── Auth ──────────────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h', algorithm: 'HS256' });
}

function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.ase_adm;
    if (!token) return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    req.admin = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch {
    res.clearCookie('ase_adm', { path: '/' });
    res.status(401).json({ error: 'Oturum süresi doldu, lütfen tekrar giriş yapın.' });
  }
}

// CSRF guard: browser cross-origin requests cannot set custom headers
// without an explicit CORS preflight (which we deny).
function requireAdminHeader(req, res, next) {
  if (req.headers['x-ase-admin'] !== '1') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ── Brute-force protection ────────────────────────────
const loginAttempts = new Map(); // ip → { count, lockedUntil }

function canAttemptLogin(ip) {
  const r = loginAttempts.get(ip);
  if (!r) return true;
  if (Date.now() < r.lockedUntil) return false;
  return true;
}
function recordFailedLogin(ip) {
  const r = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  r.count++;
  if (r.count >= 5) { r.lockedUntil = Date.now() + 15 * 60 * 1000; r.count = 0; }
  loginAttempts.set(ip, r);
}
function clearLoginAttempts(ip) { loginAttempts.delete(ip); }

// ── App ───────────────────────────────────────────────
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://i.etsystatic.com', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: IS_PROD ? [] : null,
    },
  },
  hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// Body limits
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '512kb' }));
app.use(cookie());

// General rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
}));

// Strict login rate limit (10 attempts / 15 min per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
});

// ── Sensitive file / directory guard ─────────────────
const BLOCKED_NAMES = new Set([
  'server.js', 'sync.js', '.env', '.env.example',
  'package.json', 'package-lock.json', 'yarn.lock',
]);

app.use((req, res, next) => {
  let p;
  try { p = decodeURIComponent(req.path); }
  catch { return res.status(400).send('Bad request'); }

  const base = path.basename(p);

  // Block dotfiles
  if (base.startsWith('.') && base !== '.well-known') return res.status(404).send('Not found');
  // Block sensitive files
  if (BLOCKED_NAMES.has(base)) return res.status(404).send('Not found');
  // Block data directory
  if (p.startsWith('/data')) return res.status(404).send('Not found');
  // Redirect admin.html → /admin
  if (p === '/admin.html') return res.redirect(301, '/admin');

  next();
});

// Serve products.json from src/data
app.get('/products.json', (req, res) => {
  res.sendFile(path.join(DIR, 'src', 'data', 'products.json'));
});

// Static files
const SAFE_EXTS = new Set([
  '.html', '.css', '.js', '.json', '.jpg', '.jpeg',
  '.png', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf',
]);

app.use(express.static(DIR, {
  dotfiles: 'deny',
  index: 'index.html',
  setHeaders(res, fp) {
    const ext = path.extname(fp).toLowerCase();
    if (!SAFE_EXTS.has(ext)) res.setHeader('Content-Type', 'text/plain');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// PayTR Configuration
const PAYTR_MERCHANT_ID = process.env.PAYTR_MERCHANT_ID || 'test_merchant_id';
const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY || 'test_merchant_key';
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT || 'test_merchant_salt';
const PAYTR_TEST_MODE = process.env.PAYTR_TEST_MODE === '0' ? '0' : '1';

// PayTR Token Retrieval
app.post('/api/payment/paytr',
  [
    body('email').isEmail().normalizeEmail().trim(),
    body('name').trim().notEmpty().escape().isLength({ max: 100 }),
    body('phone').trim().notEmpty().isLength({ max: 20 }),
    body('address').trim().notEmpty().escape().isLength({ max: 500 }),
    body('city').trim().notEmpty().escape().isLength({ max: 100 }),
    body('cart').isArray().notEmpty(),
    body('currency').isIn(['TRY', 'USD', 'EUR', 'GBP']).default('TRY'),
  ],
  async (req, res) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ error: 'Lütfen bilgilerinizi kontrol edin.' });

    const { email, name, phone, address, city, cart, currency } = req.body;

    // Calculate total amount
    const pData = readJSON(PRODUCTS_F, { products: [] });
    const products = pData.products || [];
    
    let totalAmount = 0;
    const basket = [];

    for (const item of cart) {
      const prod = products.find(p => p.id === item.id);
      if (!prod) return res.status(400).json({ error: 'Geçersiz ürün seçimi.' });
      
      const price = prod.price;
      const qty = parseInt(item.quantity) || 1;
      totalAmount += price * qty;
      basket.push([prod.title_tr || prod.title_en, String(price), qty]);
    }

    const paytrAmount = Math.round(totalAmount * 100);
    const merchant_oid = 'oid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const user_ip = req.ip || '127.0.0.1';
    
    const siteUrl = process.env.SITE_URL || 'http://localhost:4321';
    const lang = req.body.lang === 'en' ? 'en' : 'tr';
    const merchant_ok_url = lang === 'en' ? `${siteUrl}/en/payment-success` : `${siteUrl}/tr/odeme-basarili`;
    const merchant_fail_url = lang === 'en' ? `${siteUrl}/en/payment-failed` : `${siteUrl}/tr/odeme-basarisiz`;

    const user_basket = Buffer.from(JSON.stringify(basket)).toString('base64');
    
    const no_install = '0';
    const max_install = '12';
    const timeout_limit = '30';
    const test_mode = PAYTR_TEST_MODE;

    const hashStr = PAYTR_MERCHANT_ID + user_ip + merchant_oid + email + paytrAmount + user_basket + no_install + max_install + currency + test_mode + PAYTR_MERCHANT_SALT;
    const paytr_token = crypto.createHmac('sha256', PAYTR_MERCHANT_KEY).update(hashStr).digest('base64');

    const payload = new URLSearchParams({
      merchant_id: PAYTR_MERCHANT_ID,
      user_ip,
      merchant_oid,
      email,
      payment_amount: String(paytrAmount),
      paytr_token,
      user_basket,
      no_install,
      max_install,
      currency,
      test_mode,
      user_name: name,
      user_address: `${address} ${city}`,
      user_phone: phone,
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit,
      debug_on: '1',
    });

    try {
      const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      });

      const data = await response.json();
      if (data.status === 'success') {
        res.json({ token: data.token });
      } else {
        console.error('[PayTR API Error]', data.err_msg);
        res.status(500).json({ error: 'Ödeme oturumu başlatılamadı: ' + (data.err_msg || 'Bilinmeyen hata') });
      }
    } catch (e) {
      console.error('[PayTR Fetch Error]', e.message);
      res.status(500).json({ error: 'PayTR sunucusuna bağlanılamadı.' });
    }
  }
);

// PayTR Webhook Callback
app.post('/api/payment/paytr/callback',
  (req, res) => {
    const { merchant_oid, status, total_amount, hash } = req.body;

    if (!merchant_oid || !status || !total_amount || !hash) {
      return res.send('FAIL');
    }

    const hashStr = merchant_oid + PAYTR_MERCHANT_SALT + status + total_amount;
    const calculatedHash = crypto.createHmac('sha256', PAYTR_MERCHANT_KEY).update(hashStr).digest('base64');

    if (calculatedHash !== hash) {
      console.warn('[PayTR Webhook Callback Signature Mismatch]', merchant_oid);
      return res.send('FAIL');
    }

    if (status === 'success') {
      logActivity('ÖDEME_BAŞARILI', `Sipariş: ${merchant_oid}, Tutar: ${(total_amount / 100).toFixed(2)}`);
      
      const ordersFile = path.join(DATA_DIR, 'orders.json');
      const orders = readJSON(ordersFile, []);
      orders.push({
        orderId: merchant_oid,
        amount: (total_amount / 100).toFixed(2),
        status: 'completed',
        failedReason: '',
        createdAt: new Date().toISOString(),
      });
      writeJSON(ordersFile, orders);
      
    } else {
      const reason = req.body.failed_reason_msg || 'Bilinmeyen hata';
      logActivity('ÖDEME_BAŞARISIZ', `Sipariş: ${merchant_oid}, Sebep: ${reason}`);
      
      const ordersFile = path.join(DATA_DIR, 'orders.json');
      const orders = readJSON(ordersFile, []);
      orders.push({
        orderId: merchant_oid,
        amount: (total_amount / 100).toFixed(2),
        status: 'failed',
        failedReason: reason,
        createdAt: new Date().toISOString(),
      });
      writeJSON(ordersFile, orders);
    }

    res.send('OK');
  }
);

// Newsletter subscription
app.post('/api/newsletter',
  [
    body('email').isEmail().normalizeEmail().trim(),
    body('name').optional().trim().escape().isLength({ max: 100 }),
    body('lang').optional().isIn(['tr', 'en']).default('tr'),
  ],
  (req, res) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });

    const { email, name = '', lang = 'tr' } = req.body;
    const subs = readJSON(SUBS_F, []);
    if (subs.find(s => s.email === email)) {
      return res.json({ success: true, message: lang === 'tr' ? 'Zaten abonesiniz.' : 'Already subscribed.' });
    }
    subs.push({ email, name, lang, createdAt: new Date().toISOString() });
    writeJSON(SUBS_F, subs);
    res.json({ success: true, message: lang === 'tr' ? 'Başarıyla abone oldunuz!' : 'Successfully subscribed!' });
  }
);

// Public status (for shop page)
app.get('/api/status', (req, res) => {
  try {
    const d = readJSON(PRODUCTS_F, {});
    res.json({ lastSync: d.lastSync || null, total: d.total || (d.products || []).length });
  } catch {
    res.json({ lastSync: null, total: 0 });
  }
});

// ═════════════════════════════════════════════════════
// ADMIN — Auth
// ═════════════════════════════════════════════════════

function verifyPbkdf2(password, stored) {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const [scheme, iterationsRaw, saltB64, hashB64] = parts;
    if (scheme !== 'pbkdf2') return false;
    const iterations = parseInt(iterationsRaw, 10);

    const salt = Buffer.from(saltB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const expected = Buffer.from(hashB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const actual = crypto.pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

app.post('/api/admin/login',
  loginLimiter,
  requireAdminHeader,
  [
    body('username').trim().notEmpty().escape().isLength({ max: 100 }),
    body('password').notEmpty().isLength({ max: 200 }),
  ],
  async (req, res) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ error: 'Geçersiz giriş verisi.' });

    const ip = req.ip;
    if (!canAttemptLogin(ip)) {
      return res.status(429).json({ error: 'Hesap kilitlendi. 15 dakika sonra tekrar deneyin.' });
    }

    const { username, password } = req.body;

    // Constant-time username comparison (prevent timing attacks)
    const u1 = Buffer.allocUnsafe(64).fill(0);
    const u2 = Buffer.allocUnsafe(64).fill(0);
    Buffer.from(username).copy(u1, 0, 0, Math.min(username.length, 64));
    Buffer.from(ADMIN_USER).copy(u2, 0, 0, Math.min(ADMIN_USER.length, 64));
    const userOk = crypto.timingSafeEqual(u1, u2);

    let passOk = false;
    if (ADMIN_HASH.startsWith('pbkdf2$')) {
      passOk = verifyPbkdf2(password, ADMIN_HASH);
    } else {
      passOk = await bcrypt.compare(password, ADMIN_HASH);
    }

    if (!userOk || !passOk) {
      recordFailedLogin(ip);
      logActivity('LOGIN_FAILED', `IP: ${ip}`);
      // Generic message — never reveal which field is wrong
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    clearLoginAttempts(ip);
    const token = signToken({ u: username });

    res.cookie('ase_adm', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

    logActivity('LOGIN', `Kullanıcı: ${username}, IP: ${ip}`);
    res.json({ success: true });
  }
);

app.post('/api/admin/logout', requireAdminHeader, (req, res) => {
  res.clearCookie('ase_adm', { path: '/', sameSite: 'strict' });
  res.json({ success: true });
});

app.get('/api/admin/me', requireAuth, (req, res) => {
  res.json({ username: req.admin.u });
});

// ═════════════════════════════════════════════════════
// ADMIN — Dashboard
// ═════════════════════════════════════════════════════

app.get('/api/admin/dashboard', requireAuth, (req, res) => {
  const pData = readJSON(PRODUCTS_F, { products: [] });
  const subs = readJSON(SUBS_F, []);
  const activity = readJSON(ACTIVITY_F, []);
  const settings = readJSON(SETTINGS_F, {});
  const prods = pData.products || [];

  res.json({
    productCount: prods.length,
    activeCount: prods.filter(p => p.isActive !== false).length,
    newCount: prods.filter(p => p.isNew).length,
    subscriberCount: subs.length,
    lastSync: pData.lastSync || null,
    shopName: pData.shopName || settings.etsyShop || process.env.ETSY_SHOP || 'aselovers',
    apiKeySet: !!(process.env.ETSY_API_KEY || settings.etsyApiKey),
    recentActivity: activity.slice(0, 12),
    syncInProgress,
  });
});

// ═════════════════════════════════════════════════════
// ADMIN — Products
// ═════════════════════════════════════════════════════

app.get('/api/admin/products', requireAuth, (req, res) => {
  const d = readJSON(PRODUCTS_F, { products: [] });
  res.json(d.products || []);
});

app.post('/api/admin/products',
  requireAuth,
  requireAdminHeader,
  [
    body('title_en').trim().notEmpty().escape().isLength({ max: 300 }),
    body('title_tr').trim().notEmpty().escape().isLength({ max: 300 }),
    body('description_en').optional().trim().escape().isLength({ max: 5000 }),
    body('description_tr').optional().trim().escape().isLength({ max: 5000 }),
    body('price').isFloat({ min: 0 }),
    body('currency').isIn(['TRY', 'EUR', 'USD', 'GBP']),
    body('image').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'] }),
    body('url').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'] }),
    body('category').isIn(['amigurumi', 'bag', 'decor', 'accessory']),
    body('isActive').optional().isBoolean().toBoolean(),
    body('isNew').optional().isBoolean().toBoolean(),
  ],
  (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    const d = readJSON(PRODUCTS_F, { products: [], lastSync: null, total: 0 });
    const id = 'manual_' + Date.now();
    const prod = {
      id,
      title_en: req.body.title_en,
      title_tr: req.body.title_tr,
      description_en: req.body.description_en || '',
      description_tr: req.body.description_tr || '',
      price: parseFloat(req.body.price),
      currency: req.body.currency,
      image: req.body.image || null,
      url: req.body.url || null,
      category: req.body.category,
      tags: [],
      isNew: req.body.isNew !== false,
      isActive: req.body.isActive !== false,
    };
    d.products = [...(d.products || []), prod];
    d.total = d.products.length;
    writeJSON(PRODUCTS_F, d);
    logActivity('ÜRÜN_EKLENDI', `${prod.title_en} (${id})`);
    res.status(201).json(prod);
  }
);

app.put('/api/admin/products/:id',
  requireAuth,
  requireAdminHeader,
  [
    body('title_en').optional().trim().escape().isLength({ max: 300 }),
    body('title_tr').optional().trim().escape().isLength({ max: 300 }),
    body('description_en').optional().trim().escape().isLength({ max: 5000 }),
    body('description_tr').optional().trim().escape().isLength({ max: 5000 }),
    body('price').optional().isFloat({ min: 0 }),
    body('currency').optional().isIn(['TRY', 'EUR', 'USD', 'GBP']),
    body('image').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'] }),
    body('url').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'] }),
    body('category').optional().isIn(['amigurumi', 'bag', 'decor', 'accessory']),
    body('isActive').optional().isBoolean().toBoolean(),
    body('isNew').optional().isBoolean().toBoolean(),
  ],
  (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    const { id } = req.params;
    if (!/^[\w-]+$/.test(id)) return res.status(400).json({ error: 'Geçersiz ID.' });

    const d = readJSON(PRODUCTS_F, { products: [] });
    const idx = (d.products || []).findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Ürün bulunamadı.' });

    const allowed = [
      'title_en', 'title_tr', 'description_en', 'description_tr',
      'price', 'currency', 'image', 'url', 'category', 'isNew', 'isActive',
    ];
    allowed.forEach(k => { if (req.body[k] !== undefined) d.products[idx][k] = req.body[k]; });
    writeJSON(PRODUCTS_F, d);
    logActivity('ÜRÜN_GÜNCELLENDİ', `ID: ${id}`);
    res.json(d.products[idx]);
  }
);

app.delete('/api/admin/products/:id', requireAuth, requireAdminHeader, (req, res) => {
  const { id } = req.params;
  if (!/^[\w-]+$/.test(id)) return res.status(400).json({ error: 'Geçersiz ID.' });

  const d = readJSON(PRODUCTS_F, { products: [] });
  const before = (d.products || []).length;
  d.products = (d.products || []).filter(p => p.id !== id);
  if (d.products.length === before) return res.status(404).json({ error: 'Ürün bulunamadı.' });
  d.total = d.products.length;
  writeJSON(PRODUCTS_F, d);
  logActivity('ÜRÜN_SİLİNDİ', `ID: ${id}`);
  res.json({ success: true });
});

// ═════════════════════════════════════════════════════
// ADMIN — Subscribers
// ═════════════════════════════════════════════════════

app.get('/api/admin/subscribers', requireAuth, (req, res) => {
  res.json(readJSON(SUBS_F, []));
});

app.delete('/api/admin/subscribers/:email', requireAuth, requireAdminHeader, (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase().trim();
  const subs = readJSON(SUBS_F, []);
  const next = subs.filter(s => s.email !== email);
  if (next.length === subs.length) return res.status(404).json({ error: 'Abone bulunamadı.' });
  writeJSON(SUBS_F, next);
  logActivity('ABONE_SİLİNDİ', `Email: ${email}`);
  res.json({ success: true });
});

// ═════════════════════════════════════════════════════
// ADMIN — Sync
// ═════════════════════════════════════════════════════

let syncInProgress = false;

app.post('/api/admin/sync', requireAuth, requireAdminHeader, async (req, res) => {
  if (syncInProgress) return res.status(409).json({ error: 'Sync zaten devam ediyor.' });

  const settings = readJSON(SETTINGS_F, {});
  const apiKey = process.env.ETSY_API_KEY || settings.etsyApiKey || '';
  const shop = process.env.ETSY_SHOP || settings.etsyShop || 'aselovers';

  if (!apiKey) return res.status(400).json({ error: 'Etsy API Key tanımlı değil. Ayarlar sayfasından ekleyin.' });

  syncInProgress = true;
  try {
    const result = await doEtsySync(apiKey, shop);
    logActivity('SYNC_TAMAMLANDI', `${result.count} ürün`);
    res.json(result);
  } catch (err) {
    logActivity('SYNC_HATA', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    syncInProgress = false;
  }
});

app.get('/api/admin/sync/status', requireAuth, (req, res) => {
  const d = readJSON(PRODUCTS_F, {});
  res.json({ inProgress: syncInProgress, lastSync: d.lastSync || null, total: d.total || 0 });
});

// ═════════════════════════════════════════════════════
// ADMIN — Activity log
// ═════════════════════════════════════════════════════

app.get('/api/admin/activity', requireAuth, (req, res) => {
  res.json(readJSON(ACTIVITY_F, []));
});

// ═════════════════════════════════════════════════════
// ADMIN — Settings
// ═════════════════════════════════════════════════════

app.get('/api/admin/settings', requireAuth, (req, res) => {
  const s = readJSON(SETTINGS_F, {});
  res.json({
    ...s,
    etsyShop: s.etsyShop || process.env.ETSY_SHOP || 'aselovers',
    etsyApiSet: !!(s.etsyApiKey || process.env.ETSY_API_KEY),
    adminUser: ADMIN_USER,
  });
});

app.put('/api/admin/settings',
  requireAuth,
  requireAdminHeader,
  (req, res) => {
    const s = readJSON(SETTINGS_F, {});
    const body = req.body;
    
    // Core fields
    if (typeof body.name === 'string') s.name = body.name;
    if (typeof body.description === 'string') s.description = body.description;
    if (typeof body.email === 'string') s.email = body.email;
    if (typeof body.analytics === 'string') s.analytics = body.analytics;
    if (typeof body.currency === 'string') s.currency = body.currency;
    if (typeof body.instagram === 'string') s.instagram = body.instagram;
    if (typeof body.pinterest === 'string') s.pinterest = body.pinterest;
    if (typeof body.etsy === 'string') s.etsy = body.etsy;
    if (typeof body.logo === 'string') s.logo = body.logo;
    if (typeof body.favicon === 'string') s.favicon = body.favicon;
    if (body.categoryCovers && typeof body.categoryCovers === 'object') {
      s.categoryCovers = { ...s.categoryCovers, ...body.categoryCovers };
    }
    
    // Etsy fields (legacy compatibility)
    if (body.etsyApiKey) s.etsyApiKey = body.etsyApiKey;
    if (body.etsyShop) s.etsyShop = body.etsyShop;

    // Rename category globally across covers & products if requested
    if (body.renameCategory && typeof body.renameCategory === 'object') {
      const { oldName, newName } = body.renameCategory;
      if (typeof oldName === 'string' && typeof newName === 'string' && oldName && newName && oldName !== newName) {
        // 1. Rename cover key
        if (s.categoryCovers && s.categoryCovers[oldName] !== undefined) {
          s.categoryCovers[newName] = s.categoryCovers[oldName];
          delete s.categoryCovers[oldName];
        }
        // 2. Update products
        try {
          const prodData = readJSON(PRODUCTS_F, { products: [] });
          let updatedCount = 0;
          prodData.products = (prodData.products || []).map(p => {
            if (p.category === oldName) {
              updatedCount++;
              return { ...p, category: newName };
            }
            return p;
          });
          if (updatedCount > 0) {
            writeJSON(PRODUCTS_F, prodData);
          }
        } catch (pe) {
          console.error('Failed to update products category name locally:', pe.message);
        }
      }
    }

    writeJSON(SETTINGS_F, s);
    logActivity('AYARLAR_GÜNCELLENDİ', 'Site ayarları güncellendi');
    res.json({ success: true });
  }
);

app.post('/api/admin/settings/password',
  requireAuth,
  requireAdminHeader,
  [
    body('currentPassword').notEmpty(),
    body('newPassword')
      .isLength({ min: 12 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/),
  ],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      return res.status(400).json({
        error: 'Şifre en az 12 karakter, büyük/küçük harf, rakam ve özel karakter (!@#$%^&*) içermelidir.',
      });
    }

    const { currentPassword, newPassword } = req.body;
    let valid = false;
    if (ADMIN_HASH.startsWith('pbkdf2$')) {
      valid = verifyPbkdf2(currentPassword, ADMIN_HASH);
    } else {
      valid = await bcrypt.compare(currentPassword, ADMIN_HASH);
    }
    if (!valid) {
      logActivity('ŞİFRE_DEĞİŞİKLİĞİ_BAŞARISIZ', `IP: ${req.ip}`);
      return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
    }

    ADMIN_HASH = await bcrypt.hash(newPassword, 12);
    const s = readJSON(SETTINGS_F, {});
    s.adminPasswordHash = ADMIN_HASH;
    writeJSON(SETTINGS_F, s);
    logActivity('ŞİFRE_DEĞİŞTİRİLDİ', `Kullanıcı: ${req.admin.u}`);
    res.json({ success: true, message: 'Şifre başarıyla değiştirildi.' });
  }
);


// ═════════════════════════════════════════════════════
// ADMIN — Blog, Messages, Upload
// ═════════════════════════════════════════════════════

// BLOG — GET
app.get('/api/admin/blog', requireAuth, (req, res) => {
  const posts = readJSON(BLOG_F, []);
  res.json(posts);
});

// BLOG — CREATE
app.post('/api/admin/blog', requireAuth, requireAdminHeader, (req, res) => {
  const body = req.body;
  const posts = readJSON(BLOG_F, []);
  const post = {
    slug: body.slug || 'post-' + Date.now(),
    date: body.date || new Date().toISOString().split('T')[0],
    title_tr: body.title_tr || '',
    title_en: body.title_en || '',
    excerpt_tr: body.excerpt_tr || '',
    excerpt_en: body.excerpt_en || '',
    bodyHtml_tr: body.bodyHtml_tr || '',
    bodyHtml_en: body.bodyHtml_en || '',
    category: body.category || 'General',
    cover: body.cover || '',
    published: body.published !== false
  };
  posts.unshift(post);
  writeJSON(BLOG_F, posts);
  logActivity('BLOG_YAZISI_EKLENDİ', post.title_tr || post.slug);
  res.json({ success: true });
});

// BLOG — UPDATE
app.put('/api/admin/blog/:slug', requireAuth, requireAdminHeader, (req, res) => {
  const { slug } = req.params;
  const body = req.body;
  const posts = readJSON(BLOG_F, []);
  const idx = posts.findIndex(p => p.slug === slug);
  if (idx === -1) return res.status(404).json({ error: 'Yazı bulunamadı.' });

  posts[idx] = {
    slug: body.slug || posts[idx].slug,
    date: body.date || posts[idx].date,
    title_tr: body.title_tr !== undefined ? body.title_tr : posts[idx].title_tr,
    title_en: body.title_en !== undefined ? body.title_en : posts[idx].title_en,
    excerpt_tr: body.excerpt_tr !== undefined ? body.excerpt_tr : posts[idx].excerpt_tr,
    excerpt_en: body.excerpt_en !== undefined ? body.excerpt_en : posts[idx].excerpt_en,
    bodyHtml_tr: body.bodyHtml_tr !== undefined ? body.bodyHtml_tr : posts[idx].bodyHtml_tr,
    bodyHtml_en: body.bodyHtml_en !== undefined ? body.bodyHtml_en : posts[idx].bodyHtml_en,
    category: body.category !== undefined ? body.category : posts[idx].category,
    cover: body.cover !== undefined ? body.cover : posts[idx].cover,
    published: body.published !== undefined ? body.published : posts[idx].published
  };
  writeJSON(BLOG_F, posts);
  logActivity('BLOG_YAZISI_GÜNCELLENDİ', slug);
  res.json({ success: true });
});

// BLOG — DELETE
app.delete('/api/admin/blog/:slug', requireAuth, requireAdminHeader, (req, res) => {
  const { slug } = req.params;
  const posts = readJSON(BLOG_F, []);
  const next = posts.filter(p => p.slug !== slug);
  if (next.length === posts.length) return res.status(404).json({ error: 'Yazı bulunamadı.' });
  writeJSON(BLOG_F, next);
  logActivity('BLOG_YAZISI_SİLİNDİ', slug);
  res.json({ success: true });
});

// MESSAGES (Client sending / reading)
app.get('/api/messages', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const chats = readJSON(CHATS_F, {});
  const userChat = chats[userId] || { userId, messages: [], unreadCount: 0 };
  res.json(userChat);
});

app.post('/api/messages', (req, res) => {
  const { userId, name, email, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: 'userId and text are required' });

  const chats = readJSON(CHATS_F, {});
  const userChat = chats[userId] || { userId, messages: [], unreadCount: 0 };
  if (name) userChat.name = name;
  if (email) userChat.email = email;

  const newMsg = {
    id: 'msg-' + Date.now(),
    sender: 'user',
    text,
    createdAt: new Date().toISOString()
  };
  userChat.messages.push(newMsg);
  userChat.unreadCount = (userChat.unreadCount || 0) + 1;
  chats[userId] = userChat;
  writeJSON(CHATS_F, chats);
  res.json({ ok: true, message: newMsg });
});

// MESSAGES (Admin listing)
app.get('/api/admin/messages', requireAuth, (req, res) => {
  const chats = readJSON(CHATS_F, {});
  const list = Object.values(chats).map(c => {
    const lastMsg = c.messages[c.messages.length - 1];
    return {
      userId: c.userId,
      name: c.name || 'Misafir',
      email: c.email || '',
      lastMessageText: lastMsg ? lastMsg.text : '',
      lastActiveAt: lastMsg ? lastMsg.createdAt : new Date().toISOString(),
      unreadCount: c.unreadCount || 0
    };
  }).sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));
  res.json(list);
});

// MESSAGES (Admin chat detail)
app.get('/api/admin/messages/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const chats = readJSON(CHATS_F, {});
  const userChat = chats[userId] || { userId, messages: [], unreadCount: 0 };
  userChat.unreadCount = 0; // mark as read
  chats[userId] = userChat;
  writeJSON(CHATS_F, chats);
  res.json(userChat);
});

// MESSAGES (Admin reply)
app.post('/api/admin/messages-reply', requireAuth, requireAdminHeader, (req, res) => {
  const { userId, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: 'missing fields' });

  const chats = readJSON(CHATS_F, {});
  const userChat = chats[userId];
  if (!userChat) return res.status(404).json({ error: 'user not found' });

  const newReply = {
    id: 'reply-' + Date.now(),
    sender: 'admin',
    text,
    createdAt: new Date().toISOString()
  };
  userChat.messages.push(newReply);
  userChat.unreadCount = 0; // mark as read
  chats[userId] = userChat;
  writeJSON(CHATS_F, chats);
  res.json({ ok: true, message: newReply });
});

// UPLOAD — POST
app.post('/api/admin/upload', requireAuth, requireAdminHeader, (req, res) => {
  let { path: filePath, base64 } = req.body;
  if (!filePath || !base64) return res.status(400).json({ error: 'path ve base64 alanları zorunludur.' });

  const commaIdx = base64.indexOf(',');
  if (commaIdx !== -1) {
    base64 = base64.slice(commaIdx + 1);
  }

  try {
    const buffer = Buffer.from(base64, 'base64');
    const fullPath = path.join(DIR, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    const url = '/' + filePath.replace(/^public\//, '');
    res.json({ ok: true, url });
  } catch (err) {
    console.error('Local upload error', err.message);
    res.status(500).json({ error: 'Resim kaydedilemedi.' });
  }
});

// ═════════════════════════════════════════════════════
// Admin panel page
// ═════════════════════════════════════════════════════

app.get('/admin', (req, res) => {
  res.sendFile(path.join(DIR, 'public', 'admin', 'dashboard.html'));
});

// ═════════════════════════════════════════════════════
// Error handlers
// ═════════════════════════════════════════════════════

app.use((_req, res) => res.status(404).json({ error: 'Bulunamadı.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: IS_PROD ? 'Sunucu hatası.' : err.message });
});

// ═════════════════════════════════════════════════════
// Etsy sync logic
// ═════════════════════════════════════════════════════

const CAT_MAP = {
  bag: 'bag', tote: 'bag', purse: 'bag',
  tieback: 'decor', curtain: 'decor', nursery: 'decor',
  clip: 'accessory', hair: 'accessory', brooch: 'accessory',
  amigurumi: 'amigurumi', toy: 'amigurumi', plush: 'amigurumi',
  doll: 'amigurumi', bunny: 'amigurumi', bear: 'amigurumi',
  flamingo: 'amigurumi', duck: 'amigurumi', rabbit: 'amigurumi',
};

function detectCat(listing) {
  const text = (listing.title + ' ' + (listing.description || '')).toLowerCase();
  for (const [kw, cat] of Object.entries(CAT_MAP)) {
    if (text.includes(kw)) return cat;
  }
  return 'amigurumi';
}

async function doEtsySync(apiKey, shopName) {
  async function etsyFetch(ep) {
    const r = await fetch(`https://openapi.etsy.com/v3/application/${ep}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!r.ok) throw new Error(`Etsy ${r.status}: ${await r.text()}`);
    return r.json();
  }

  const shopData = await etsyFetch(`shops?shop_name=${encodeURIComponent(shopName)}`);
  if (!shopData.results?.length) throw new Error(`"${shopName}" mağazası bulunamadı.`);
  const shopId = shopData.results[0].shop_id;

  let all = [], offset = 0;
  while (true) {
    const d = await etsyFetch(
      `shops/${shopId}/listings/active?limit=100&offset=${offset}&includes[]=Images&includes[]=Translations`
    );
    all = all.concat(d.results || []);
    if ((d.results || []).length < 100) break;
    offset += 100;
  }

  const products = all.map(l => {
    const tr = l.translations?.find(t => t.language === 'tr');
    return {
      id: String(l.listing_id),
      title_en: l.title || '',
      title_tr: tr?.title || l.title || '',
      description_en: (l.description || '').split('\n')[0].substring(0, 200),
      description_tr: (tr?.description || l.description || '').split('\n')[0].substring(0, 200),
      price: parseFloat(l.price?.amount || 0) / (l.price?.divisor || 100),
      currency: l.price?.currency_code || 'TRY',
      image: l.images?.[0]?.url_570xN || null,
      url: l.url || `https://www.etsy.com/listing/${l.listing_id}/`,
      category: detectCat(l),
      tags: l.tags || [],
      views: l.views || 0,
      isNew: Date.now() - l.creation_timestamp * 1000 < 30 * 86400000,
      isActive: l.state === 'active',
    };
  });

  const out = {
    lastSync: new Date().toISOString(),
    shopId: String(shopId),
    shopName,
    total: products.length,
    products,
  };
  writeJSON(PRODUCTS_F, out);
  return { success: true, count: products.length, lastSync: out.lastSync };
}

// ═════════════════════════════════════════════════════
// Start
// ═════════════════════════════════════════════════════

app.listen(PORT, () => {
  const line = '─'.repeat(40);
  console.log(`\n🧶  ASELOVERS Secure Server\n${line}`);
  console.log(`  Site  : http://localhost:${PORT}`);
  console.log(`  Admin : http://localhost:${PORT}/admin`);
  console.log(line);
  if (!process.env.JWT_SECRET)
    console.warn('  ⚠  JWT_SECRET eksik — .env dosyasına ekleyin');
  if (!process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD)
    console.warn('  ⚠  Admin şifresi yok — varsayılan "Aselovers2024!" kullanılıyor. HEMEN DEĞİŞTİRİN!');
  console.log('');
});
