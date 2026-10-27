import { describe, it, expect } from 'vitest';
import { clip, normalizeUsername, validateNewAccount, normalizeSpec, validatePdf, validateSupply } from './validate';
import type { ProductSpec } from './types';

const IDS = { productId: '4549014419', supplierId: 'sup_ab12cd34' };

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

describe('clip', () => {
  it('strips control characters, trims and caps length', () => {
    expect(clip('  a\u0000b\u0007c  ', 10)).toBe('abc');
    expect(clip('x'.repeat(50), 10)).toBe('x'.repeat(10));
  });
  it('coerces null/undefined to empty string', () => {
    expect(clip(null, 5)).toBe('');
    expect(clip(undefined, 5)).toBe('');
  });
});

describe('normalizeUsername', () => {
  it('lowercases and accepts valid names', () => {
    expect(normalizeUsername('Ayse.Hanim')).toBe('ayse.hanim');
    expect(normalizeUsername(' orgucu_1 ')).toBe('orgucu_1');
  });
  it('rejects invalid characters and bad lengths', () => {
    expect(normalizeUsername('ay')).toBeNull();
    expect(normalizeUsername('ayşe')).toBeNull();
    expect(normalizeUsername('a b')).toBeNull();
    expect(normalizeUsername('a'.repeat(33))).toBeNull();
    expect(normalizeUsername(42)).toBeNull();
  });
});

describe('validateNewAccount', () => {
  it('accepts a complete account', () => {
    const r = validateNewAccount({ name: 'Ayşe Hanım', username: 'Ayse', password: 'gizli-sifre-1' });
    expect(r).toEqual({ ok: true, name: 'Ayşe Hanım', username: 'ayse', password: 'gizli-sifre-1' });
  });
  it('rejects short password, short name and bad username', () => {
    expect(validateNewAccount({ name: 'Ayşe', username: 'ayse', password: 'kisa' }).ok).toBe(false);
    expect(validateNewAccount({ name: 'A', username: 'ayse', password: 'gizli-sifre-1' }).ok).toBe(false);
    expect(validateNewAccount({ name: 'Ayşe', username: 'a!', password: 'gizli-sifre-1' }).ok).toBe(false);
    expect(validateNewAccount(null).ok).toBe(false);
  });
});

describe('normalizeSpec', () => {
  it('caps yarns at 30 and clips every field', () => {
    const yarns = Array.from({ length: 31 }, (_, i) => ({ brand: 'Alize', name: 'Cotton Gold', colorCode: String(i), colorName: 'x'.repeat(200), usage: '', amount: '' }));
    const spec = normalizeSpec({ yarns, notes: 'n'.repeat(5000), hookSize: '2.5 mm' }, IDS);
    expect(spec.yarns).toHaveLength(30);
    expect(spec.yarns[0].colorName).toHaveLength(120);
    expect(spec.notes).toHaveLength(4000);
    expect(spec.hookSize).toBe('2.5 mm');
    expect(spec.productId).toBe(IDS.productId);
    expect(spec.supplierId).toBe(IDS.supplierId);
    expect(spec.isComplete).toBe(false);
    expect(spec.hasFile).toBe(false);
    expect(spec.approval).toBe('pending');
    expect(Date.parse(spec.createdAt)).not.toBeNaN();
    expect(spec.updatedAt).toBe(spec.createdAt);
  });
  it('drops yarn rows that are entirely empty and ignores non-object rows', () => {
    const spec = normalizeSpec({ yarns: [{ brand: ' ', name: '' }, 'junk', { brand: 'Himalaya' }] }, IDS);
    expect(spec.yarns).toEqual([{ variant: '', brand: 'Himalaya', name: '', colorCode: '', colorName: '', usage: '', amount: '' }]);
  });
  it('keeps the variant on a yarn row but a variant alone is not a row', () => {
    const spec = normalizeSpec({ yarns: [{ variant: 'Green' }, { variant: 'Red', brand: 'Alize', colorCode: '55' }] }, IDS);
    expect(spec.yarns).toHaveLength(1);
    expect(spec.yarns[0].variant).toBe('Red');
  });
  it('only keeps http(s) pattern urls', () => {
    expect(normalizeSpec({ patternUrl: 'javascript:alert(1)' }, IDS).patternUrl).toBe('');
    expect(normalizeSpec({ patternUrl: 'https://drive.google.com/x' }, IDS).patternUrl).toBe('https://drive.google.com/x');
  });
  it('preserves file flags and createdAt from the previous record', () => {
    const prev: ProductSpec = {
      ...normalizeSpec({}, IDS),
      hasFile: true,
      fileName: 'tarif.pdf',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const next = normalizeSpec({ isComplete: true, hasFile: false, approval: 'approved' }, IDS, prev);
    expect(next.hasFile).toBe(true);
    expect(next.approval).toBe('pending');
    expect(next.approvedAt).toBeUndefined();
    expect(next.fileName).toBe('tarif.pdf');
    expect(next.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(next.isComplete).toBe(true);
    expect(Date.parse(next.updatedAt)).toBeGreaterThan(Date.parse(prev.createdAt));
  });
});

describe('admin-only supply price', () => {
  it('normalizeSpec keeps the previous supply fields and ignores supplier-sent ones', () => {
    const prev = { ...normalizeSpec({}, IDS), supplyPrice: 850, supplyNote: 'kargo dahil', supplyUpdatedAt: '2026-01-01T00:00:00.000Z' };
    const next = normalizeSpec({ supplyPrice: 1, supplyNote: 'hack' }, IDS, prev);
    expect(next.supplyPrice).toBe(850);
    expect(next.supplyNote).toBe('kargo dahil');
    expect(next.supplyUpdatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(normalizeSpec({ supplyPrice: 1 }, IDS).supplyPrice).toBeUndefined();
  });
  it('validateSupply parses TR decimals, rounds to kuruş, allows clearing, rejects garbage', () => {
    expect(validateSupply({ price: '1.249,5', note: ' not ' })).toEqual({ ok: true, value: { price: 1249.5, note: 'not' } });
    expect(validateSupply({ price: 850.999 })).toEqual({ ok: true, value: { price: 851, note: '' } });
    expect(validateSupply({ price: null })).toEqual({ ok: true, value: { price: null, note: '' } });
    expect(validateSupply({ price: '' }).ok).toBe(true);
    expect(validateSupply({ price: -5 }).ok).toBe(false);
    expect(validateSupply({ price: 'abc' }).ok).toBe(false);
    expect(validateSupply(null).ok).toBe(false);
  });
});

describe('normalizeSpec notes', () => {
  it('keeps line breaks in notes but strips other control characters', () => {
    const spec = normalizeSpec({ notes: 'satır 1\r\nsatır 2\u0007\nsatır 3', hookSize: 'a\nb' }, IDS);
    expect(spec.notes).toBe('satır 1\nsatır 2\nsatır 3');
    expect(spec.hookSize).toBe('ab');
  });
});

describe('validatePdf', () => {
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"
  it('accepts a real PDF, strips a data: prefix and reports the byte size', () => {
    const r = validatePdf('Tarif Kurbağa.pdf', 'data:application/pdf;base64,' + b64(pdfBytes));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.filename).toBe('Tarif Kurbağa.pdf');
      expect(r.base64).toBe(b64(pdfBytes));
      expect(r.size).toBe(pdfBytes.length);
    }
  });
  it('computes size correctly with base64 padding', () => {
    const seven = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
    const r = validatePdf('t.pdf', b64(seven));
    expect(r.ok && r.size).toBe(7);
  });
  it('rejects a non-pdf extension, bad signature, bad base64 and oversize', () => {
    expect(validatePdf('tarif.docx', b64(pdfBytes)).ok).toBe(false);
    expect(validatePdf('tarif.pdf', b64(new Uint8Array([1, 2, 3, 4, 5, 6]))).ok).toBe(false);
    expect(validatePdf('tarif.pdf', '%%%not-base64%%%').ok).toBe(false);
    expect(validatePdf('tarif.pdf', '').ok).toBe(false);
    const big = 'A'.repeat(Math.ceil((10 * 1024 * 1024 + 10) / 3) * 4);
    expect(validatePdf('tarif.pdf', big).ok).toBe(false);
  });
});
