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

const express   = require('express');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const cookie    = require('cookie-parser');
const path      = require('path');
const fs        = require('fs');
const crypto    = require('crypto');

require('dotenv').config();

// ── Config ────────────────────────────────────────────
const PORT    = parseInt(process.env.PORT, 10) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const DIR     = __dirname;

// JWT secret — must be set in .env for production
const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const s = crypto.randomBytes(64).toString('hex');
  console.warn('[WARN] JWT_SECRET .env dosyasında tanımlı değil — her yeniden başlatmada oturumlar sıfırlanır');
  return s;
})();

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';

// Password: prefer ADMIN_PASSWORD_HASH (bcrypt), else hash ADMIN_PASSWORD at startup
let ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || null;

(async () => {
  if (!ADMIN_HASH && process.env.ADMIN_PASSWORD) {
    ADMIN_HASH = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    console.warn('[WARN] ADMIN_PASSWORD kullanılıyor — ADMIN_PASSWORD_HASH kullanmanız önerilir');
  }
  if (!ADMIN_HASH) {
    // Fallback default — logs loud warning
    ADMIN_HASH = await bcrypt.hash('Aselovers2024!', 12);
    console.warn('[WARN] Admin şifresi .env dosyasında YOK — varsayılan "Aselovers2024!" kullanılıyor. HEMEN DEĞİŞTİRİN!');
  }
})();

// ── Paths ─────────────────────────────────────────────
const DATA_DIR   = path.join(DIR, 'data');
const PRODUCTS_F = path.join(DIR, 'products.json');
const SUBS_F     = path.join(DATA_DIR, 'subscribers.json');
const ACTIVITY_F = path.join(DATA_DIR, 'activity.json');
const SETTINGS_F = path.join(DATA_DIR, 'settings.json');

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

// Load persisted password hash if admin previously changed it
const savedSettings = readJSON(SETTINGS_F, {});
if (savedSettings.adminPasswordHash) {
  ADMIN_HASH = savedSettings.adminPasswordHash;
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
      defaultSrc:              ["'self'"],
      scriptSrc:               ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      styleSrc:                ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      fontSrc:                 ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:                  ["'self'", 'data:', 'https://i.etsystatic.com', 'https:'],
      connectSrc:              ["'self'"],
      frameSrc:                ["'none'"],
      objectSrc:               ["'none'"],
      baseUri:                 ["'self'"],
      formAction:              ["'self'"],
      upgradeInsecureRequests: IS_PROD ? [] : null,
    },
  },
  hsts:                    IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// Body limits
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '512kb' }));
app.use(cookie());

// General rate limit
app.use(rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             300,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
}));

// Strict login rate limit (10 attempts / 15 min per IP)
const loginLimiter = rateLimit({
  windowMs:             15 * 60 * 1000,
  max:                  10,
  standardHeaders:      'draft-7',
  legacyHeaders:        false,
  skipSuccessfulRequests: true,
  message:              { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
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

// Static files
const SAFE_EXTS = new Set([
  '.html', '.css', '.js', '.json', '.jpg', '.jpeg',
  '.png', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf',
]);

app.use(express.static(DIR, {
  dotfiles: 'deny',
  index:    'index.html',
  setHeaders(res, fp) {
    const ext = path.extname(fp).toLowerCase();
    if (!SAFE_EXTS.has(ext)) res.setHeader('Content-Type', 'text/plain');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// ═════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════

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

    const passOk = await bcrypt.compare(password, ADMIN_HASH);

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
      secure:   IS_PROD,
      sameSite: 'strict',
      maxAge:   8 * 60 * 60 * 1000,
      path:     '/',
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
  const pData    = readJSON(PRODUCTS_F, { products: [] });
  const subs     = readJSON(SUBS_F, []);
  const activity = readJSON(ACTIVITY_F, []);
  const settings = readJSON(SETTINGS_F, {});
  const prods    = pData.products || [];

  res.json({
    productCount:    prods.length,
    activeCount:     prods.filter(p => p.isActive !== false).length,
    newCount:        prods.filter(p => p.isNew).length,
    subscriberCount: subs.length,
    lastSync:        pData.lastSync || null,
    shopName:        pData.shopName || settings.etsyShop || process.env.ETSY_SHOP || 'aselovers',
    apiKeySet:       !!(process.env.ETSY_API_KEY || settings.etsyApiKey),
    recentActivity:  activity.slice(0, 12),
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
    body('description_en').optional().trim().escape().isLength({ max: 1000 }),
    body('description_tr').optional().trim().escape().isLength({ max: 1000 }),
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

    const d    = readJSON(PRODUCTS_F, { products: [], lastSync: null, total: 0 });
    const id   = 'manual_' + Date.now();
    const prod = {
      id,
      title_en:       req.body.title_en,
      title_tr:       req.body.title_tr,
      description_en: req.body.description_en || '',
      description_tr: req.body.description_tr || '',
      price:          parseFloat(req.body.price),
      currency:       req.body.currency,
      image:          req.body.image || null,
      url:            req.body.url || null,
      category:       req.body.category,
      tags:           [],
      isNew:          req.body.isNew !== false,
      isActive:       req.body.isActive !== false,
    };
    d.products = [...(d.products || []), prod];
    d.total    = d.products.length;
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
    body('description_en').optional().trim().escape().isLength({ max: 1000 }),
    body('description_tr').optional().trim().escape().isLength({ max: 1000 }),
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

    const d   = readJSON(PRODUCTS_F, { products: [] });
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
  const subs  = readJSON(SUBS_F, []);
  const next  = subs.filter(s => s.email !== email);
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
  const apiKey   = process.env.ETSY_API_KEY || settings.etsyApiKey || '';
  const shop     = process.env.ETSY_SHOP    || settings.etsyShop   || 'aselovers';

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
    etsyShop:   s.etsyShop  || process.env.ETSY_SHOP || 'aselovers',
    etsyApiSet: !!(s.etsyApiKey || process.env.ETSY_API_KEY),
    adminUser:  ADMIN_USER,
  });
});

app.put('/api/admin/settings',
  requireAuth,
  requireAdminHeader,
  [
    body('etsyApiKey').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    body('etsyShop').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  ],
  (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    const s = readJSON(SETTINGS_F, {});
    if (req.body.etsyApiKey) s.etsyApiKey = req.body.etsyApiKey;
    if (req.body.etsyShop)   s.etsyShop   = req.body.etsyShop;
    writeJSON(SETTINGS_F, s);
    logActivity('AYARLAR_GÜNCELLENDİ', 'Etsy ayarları değiştirildi');
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
    const valid = await bcrypt.compare(currentPassword, ADMIN_HASH);
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
// Admin panel page
// ═════════════════════════════════════════════════════

app.get('/admin', (req, res) => {
  res.sendFile(path.join(DIR, 'admin.html'));
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
      id:             String(l.listing_id),
      title_en:       l.title || '',
      title_tr:       tr?.title || l.title || '',
      description_en: (l.description || '').split('\n')[0].substring(0, 200),
      description_tr: (tr?.description || l.description || '').split('\n')[0].substring(0, 200),
      price:          parseFloat(l.price?.amount || 0) / (l.price?.divisor || 100),
      currency:       l.price?.currency_code || 'TRY',
      image:          l.images?.[0]?.url_570xN || null,
      url:            l.url || `https://www.etsy.com/listing/${l.listing_id}/`,
      category:       detectCat(l),
      tags:           l.tags || [],
      views:          l.views || 0,
      isNew:          Date.now() - l.creation_timestamp * 1000 < 30 * 86400000,
      isActive:       l.state === 'active',
    };
  });

  const out = {
    lastSync:  new Date().toISOString(),
    shopId:    String(shopId),
    shopName,
    total:     products.length,
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
