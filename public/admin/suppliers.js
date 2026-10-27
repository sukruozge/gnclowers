/**
 * Admin dashboard — "Tedarikçiler" sayfası.
 * dashboard.html'in global yardımcılarını kullanır: toast(msg,'ok'|'err'), esc(), openModal(), ADM_HDR.
 * API: /api/supplier/admin/* (admin çerezi ile).
 */
/* global toast, esc, openModal, ADM_HDR */

(function () {
  'use strict';

  const API = '/api/supplier/admin/';
  let accounts = [];
  let specRows = [];
  let summary = { activeProducts: 0, supplierCount: 0 };

  async function api(path, init) {
    const res = await fetch(API + path, Object.assign({ credentials: 'include', headers: ADM_HDR }, init || {}));
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error === 'invalid' ? 'Oturum süresi doldu, sayfayı yenileyin.' : (data.error || 'Sunucu hatası (' + res.status + ')'));
    return data;
  }

  function fmt(iso) {
    return iso ? new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  }

  // ── Yükleme ──
  window.loadSuppliersPage = async function loadSuppliersPage() {
    try {
      const results = await Promise.all([api('accounts'), api('specs')]);
      accounts = results[0];
      specRows = results[1].rows;
      summary = { activeProducts: results[1].activeProducts, supplierCount: results[1].supplierCount };
      renderSummary();
      renderAccounts();
      renderSpecs();
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  function renderSummary() {
    const withSpec = new Set(specRows.map(function (r) { return r.productId; })).size;
    const complete = specRows.filter(function (r) { return r.isComplete; }).length;
    const el = document.getElementById('sup-summary');
    if (el) el.textContent = summary.activeProducts + ' aktif ürün · ' + withSpec + ' ürün için kayıt var · ' + complete + ' tam kayıt · ' + summary.supplierCount + ' tedarikçi hesabı';
  }

  window.supTab = function supTab(name, btn) {
    document.querySelectorAll('#page-suppliers .tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('#page-suppliers .tab-panel').forEach(function (p) { p.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    const panel = document.getElementById('suptab-' + name);
    if (panel) panel.classList.add('active');
  };

  // ── Hesaplar ──
  function renderAccounts() {
    const tbody = document.getElementById('sup-acc-rows');
    const empty = document.getElementById('sup-acc-empty');
    if (!tbody) return;
    const counts = {};
    specRows.forEach(function (r) { counts[r.supplierId] = (counts[r.supplierId] || 0) + 1; });
    tbody.innerHTML = accounts.map(function (a) {
      return '<tr>' +
        '<td><strong>' + esc(a.name) + '</strong></td>' +
        '<td><code>' + esc(a.username) + '</code></td>' +
        '<td>' + (a.isActive ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-gray">Pasif</span>') + '</td>' +
        '<td>' + esc(fmt(a.lastLoginAt)) + '</td>' +
        '<td>' + (counts[a.id] || 0) + '</td>' +
        '<td class="sup-actions">' +
          '<button class="btn btn-sm btn-outline" onclick="supToggleActive(\'' + esc(a.id) + '\',' + (!a.isActive) + ')">' + (a.isActive ? 'Pasife al' : 'Aktif et') + '</button>' +
          '<button class="btn btn-sm btn-outline" onclick="supResetPassword(\'' + esc(a.id) + '\')">Şifre sıfırla</button>' +
          '<button class="btn btn-sm btn-danger" onclick="supDeleteAccount(\'' + esc(a.id) + '\')">Sil</button>' +
        '</td></tr>';
    }).join('');
    if (empty) empty.style.display = accounts.length ? 'none' : '';
  }

  function randomPassword() {
    const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return Array.from(bytes, function (b) { return alphabet[b % alphabet.length]; }).join('');
  }

  window.supGenPassword = function supGenPassword() {
    document.getElementById('sup-new-password').value = randomPassword();
  };

  window.supCreateAccount = async function supCreateAccount() {
    const name = document.getElementById('sup-new-name').value.trim();
    const username = document.getElementById('sup-new-username').value.trim();
    const password = document.getElementById('sup-new-password').value;
    if (!name || !username || !password) return toast('Ad, kullanıcı adı ve şifre zorunlu.', 'err');
    try {
      const a = await api('accounts', { method: 'POST', body: JSON.stringify({ name: name, username: username, password: password }) });
      accounts = accounts.concat([a]);
      renderAccounts();
      renderSummary();
      document.getElementById('sup-new-name').value = '';
      document.getElementById('sup-new-username').value = '';
      document.getElementById('sup-new-password').value = '';
      showCredentials(a.name, a.username, password);
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  function showCredentials(name, username, password) {
    const body = document.getElementById('sup-detail-body');
    document.getElementById('sup-detail-title').textContent = 'Giriş bilgileri — ' + name;
    body.innerHTML =
      '<p style="margin:0 0 10px">Bu şifre yalnızca şimdi gösterilir. Tedarikçiye WhatsApp\'tan iletin:</p>' +
      '<pre class="sup-cred" id="sup-cred-text">Aselovers Tedarikçi Portalı\nAdres: https://aseloves.com/tedarikci/\nKullanıcı adı: ' + esc(username) + '\nŞifre: ' + esc(password) + '</pre>' +
      '<button class="btn btn-sm btn-outline" onclick="supCopyCred()">📋 Kopyala</button>';
    document.getElementById('sup-detail-modal').classList.add('open');
  }

  window.supCopyCred = function supCopyCred() {
    const txt = document.getElementById('sup-cred-text');
    if (!txt) return;
    navigator.clipboard.writeText(txt.textContent).then(function () { toast('Kopyalandı', 'ok'); }, function () { toast('Kopyalanamadı', 'err'); });
  };

  window.supToggleActive = async function supToggleActive(id, on) {
    try {
      const a = await api('accounts/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ isActive: on }) });
      accounts = accounts.map(function (x) { return x.id === id ? a : x; });
      renderAccounts();
      toast(on ? 'Hesap aktif edildi' : 'Hesap pasife alındı', 'ok');
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  window.supResetPassword = function supResetPassword(id) {
    const a = accounts.find(function (x) { return x.id === id; });
    if (!a) return;
    const pw = randomPassword();
    openModal('Şifre sıfırla', a.name + ' için yeni bir şifre üretilecek. Eski şifre geçersiz olur. Devam?', async function () {
      try {
        await api('accounts/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ newPassword: pw }) });
        showCredentials(a.name, a.username, pw);
      } catch (e) {
        toast(e.message, 'err');
      }
    });
  };

  window.supDeleteAccount = function supDeleteAccount(id) {
    const a = accounts.find(function (x) { return x.id === id; });
    if (!a) return;
    openModal('Hesabı sil', a.name + ' hesabı silinecek. Girdiği üretim kayıtları silinmez, "(silinmiş hesap)" olarak kalır. Devam?', async function () {
      try {
        await api('accounts/' + encodeURIComponent(id), { method: 'DELETE' });
        accounts = accounts.filter(function (x) { return x.id !== id; });
        renderAccounts();
        renderSummary();
        toast('Hesap silindi', 'ok');
      } catch (e) {
        toast(e.message, 'err');
      }
    });
  };

  // ── Üretim kayıtları ──
  function filteredSpecs() {
    const q = (document.getElementById('sup-spec-search').value || '').trim().toLocaleLowerCase('tr');
    if (!q) return specRows;
    return specRows.filter(function (r) {
      return (r.productTitle + ' ' + r.supplierName + ' ' + r.productId).toLocaleLowerCase('tr').indexOf(q) !== -1;
    });
  }

  function renderSpecs() {
    const tbody = document.getElementById('sup-spec-rows');
    const empty = document.getElementById('sup-spec-empty');
    const count = document.getElementById('sup-spec-count');
    if (!tbody) return;
    const rows = filteredSpecs();
    tbody.innerHTML = rows.map(function (r) {
      const status = r.isComplete ? '<span class="badge badge-green">Tam</span>' : '<span class="badge badge-gold">Taslak</span>';
      return '<tr>' +
        '<td><div class="sup-ptitle">' + esc(r.productTitle) + (r.productActive ? '' : ' <span class="badge badge-gray">pasif ürün</span>') + '</div><div class="sup-pid">' + esc(r.productId) + '</div></td>' +
        '<td>' + esc(r.supplierName) + '</td>' +
        '<td>' + r.yarns.length + '</td>' +
        '<td>' + (r.hasFile ? '<a href="' + API + 'file/' + encodeURIComponent(r.productId) + '/' + encodeURIComponent(r.supplierId) + '" target="_blank" rel="noopener">📄 ' + esc(r.fileName || 'PDF') + '</a>' : '—') + '</td>' +
        '<td>' + status + '</td>' +
        '<td>' + esc(fmt(r.updatedAt)) + '</td>' +
        '<td class="sup-actions">' +
          '<button class="btn btn-sm btn-outline" onclick="supShowSpec(\'' + esc(r.productId) + '\',\'' + esc(r.supplierId) + '\')">Detay</button>' +
          '<button class="btn btn-sm btn-danger" onclick="supDeleteSpec(\'' + esc(r.productId) + '\',\'' + esc(r.supplierId) + '\')">Sil</button>' +
        '</td></tr>';
    }).join('');
    if (empty) empty.style.display = specRows.length ? 'none' : '';
    if (count) count.textContent = rows.length + ' kayıt';
  }

  window.supFilter = renderSpecs;

  function yarnTable(yarns) {
    if (!yarns.length) return '<p class="sup-muted">İplik girilmemiş.</p>';
    return '<table class="sup-table--inner"><thead><tr><th>Marka</th><th>İplik</th><th>Renk kodu</th><th>Renk</th><th>Kullanım</th><th>Miktar</th></tr></thead><tbody>' +
      yarns.map(function (y) {
        return '<tr><td>' + esc(y.brand) + '</td><td>' + esc(y.name) + '</td><td><strong>' + esc(y.colorCode) + '</strong></td><td>' + esc(y.colorName) + '</td><td>' + esc(y.usage) + '</td><td>' + esc(y.amount) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function detailRow(label, value) {
    return value ? '<div class="sup-kv"><span>' + label + '</span><strong>' + esc(value) + '</strong></div>' : '';
  }

  window.supShowSpec = function supShowSpec(pid, sid) {
    const r = specRows.find(function (x) { return x.productId === pid && x.supplierId === sid; });
    if (!r) return;
    document.getElementById('sup-detail-title').textContent = r.productTitle;
    const fileHtml = r.hasFile
      ? '<a class="btn btn-sm btn-outline" href="' + API + 'file/' + encodeURIComponent(pid) + '/' + encodeURIComponent(sid) + '" target="_blank" rel="noopener">📄 ' + esc(r.fileName || 'PDF tarifi indir') + '</a>'
      : '<span class="sup-muted">PDF tarif yok</span>';
    document.getElementById('sup-detail-body').innerHTML =
      '<p class="sup-muted" style="margin:0 0 12px">Tedarikçi: <strong>' + esc(r.supplierName) + '</strong> · ' + (r.isComplete ? 'Bilgiler tam' : 'Taslak') + ' · Güncellendi: ' + esc(fmt(r.updatedAt)) + '</p>' +
      '<h4 class="sup-h4">İplikler</h4>' + yarnTable(r.yarns) +
      '<h4 class="sup-h4">Üretim detayları</h4><div class="sup-kvs">' +
        detailRow('Tığ no', r.hookSize) + detailRow('Dolgu', r.fill) + detailRow('Göz / aksesuar', r.eyes) +
        detailRow('Bitmiş ölçü', r.finishedSize) + detailRow('Üretim süresi', r.productionHours) +
        (r.patternUrl ? '<div class="sup-kv"><span>Tarif linki</span><a href="' + esc(r.patternUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(r.patternUrl) + '</a></div>' : '') +
      '</div>' +
      '<h4 class="sup-h4">PDF tarif</h4>' + fileHtml +
      '<h4 class="sup-h4">Dikkat edilmesi gerekenler</h4>' + (r.notes ? '<p class="sup-notes">' + esc(r.notes) + '</p>' : '<p class="sup-muted">Not girilmemiş.</p>');
    document.getElementById('sup-detail-modal').classList.add('open');
  };

  window.supCloseDetail = function supCloseDetail() {
    document.getElementById('sup-detail-modal').classList.remove('open');
  };

  window.supDeleteSpec = function supDeleteSpec(pid, sid) {
    const r = specRows.find(function (x) { return x.productId === pid && x.supplierId === sid; });
    if (!r) return;
    openModal('Kaydı sil', '"' + r.productTitle + '" için ' + r.supplierName + ' kaydı ve PDF\'i silinecek. Devam?', async function () {
      try {
        await api('spec/' + encodeURIComponent(pid) + '/' + encodeURIComponent(sid), { method: 'DELETE' });
        specRows = specRows.filter(function (x) { return !(x.productId === pid && x.supplierId === sid); });
        renderSpecs();
        renderAccounts();
        renderSummary();
        toast('Kayıt silindi', 'ok');
      } catch (e) {
        toast(e.message, 'err');
      }
    });
  };

  window.supExportCsv = function supExportCsv() {
    if (!specRows.length) return toast('Dışa aktarılacak kayıt yok.', 'err');
    window.location.href = API + 'export.csv';
  };

  document.addEventListener('click', function (ev) {
    if (ev.target && ev.target.id === 'sup-detail-modal') window.supCloseDetail();
  });
})();
