import { describe, it, expect } from 'vitest';
import { csvCell, specsToCsv } from './csv';
import { normalizeSpec } from './validate';

const IDS = { productId: '4549014419', supplierId: 'sup_ab12cd34' };

describe('csvCell', () => {
  it('quotes and escapes separators, quotes and newlines', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });
  it('neutralises spreadsheet formula injection', () => {
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');
    expect(csvCell('+1')).toBe('"\'+1"');
    expect(csvCell('-1')).toBe('"\'-1"');
    expect(csvCell('@cmd')).toBe('"\'@cmd"');
  });
  it('handles empty and non-string values', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(12)).toBe('"12"');
    expect(csvCell(true)).toBe('"true"');
  });
});

describe('specsToCsv', () => {
  it('starts with a BOM, uses ; and CRLF, one row per spec plus header', () => {
    const spec = normalizeSpec(
      {
        yarns: [
          { brand: 'Alize', name: 'Cotton Gold', colorCode: '55', colorName: 'kirli beyaz', usage: 'gövde', amount: '1 yumak' },
          { brand: 'Himalaya', name: 'Dolphin Baby', colorCode: '80301', colorName: '', usage: '', amount: '' },
          { variant: 'Green', brand: 'Alize', name: 'Cotton Gold', colorCode: '126', colorName: 'yeşil', usage: '', amount: '' },
        ],
        hookSize: '2.5 mm',
        notes: 'Gözleri 8 mm; dikkat',
        isComplete: true,
      },
      IDS
    );
    const csv = specsToCsv([{ spec, supplierName: 'Ayşe Hanım', productTitle: 'Örgü Kurbağa' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"Ürün"');
    expect(lines[0].split(';').length).toBe(lines[1].split(/;(?=")/).length);
    expect(lines[1]).toContain('"Ayşe Hanım"');
    expect(lines[1]).toContain('"Örgü Kurbağa"');
    expect(lines[1]).toContain('Alize Cotton Gold 55 kirli beyaz (gövde, 1 yumak) | Himalaya Dolphin Baby 80301 | [Green] Alize Cotton Gold 126 yeşil');
    expect(lines[1]).toContain('"Gözleri 8 mm; dikkat"');
    expect(lines[1]).toContain('"Evet"');
    expect(lines[1]).toContain('"Onay bekliyor"');
  });
  it('returns only the header for an empty list', () => {
    const csv = specsToCsv([]);
    expect(csv.slice(1).split('\r\n').filter(Boolean)).toHaveLength(1);
  });
});
