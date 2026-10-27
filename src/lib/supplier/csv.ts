/**
 * Üretim kayıtlarını Excel-TR uyumlu CSV'ye çevirir: BOM, `;` ayraç, CRLF.
 * Her hücre tırnaklanır; `=`, `+`, `-`, `@` ile başlayan değerler formül enjeksiyonuna karşı
 * `'` ile etkisizleştirilir.
 */
import type { ProductSpec, YarnLine } from './types';

const FORMULA_PREFIX = /^[=+\-@]/;

export function csvCell(v: unknown): string {
  let s = String(v ?? '');
  if (FORMULA_PREFIX.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export interface CsvRow {
  spec: ProductSpec;
  supplierName: string;
  productTitle: string;
}

const HEADER = [
  'Ürün ID', 'Ürün', 'Tedarikçi', 'İplikler', 'İplik Sayısı', 'Tığ No', 'Dolgu', 'Göz',
  'Bitmiş Ölçü', 'Üretim Süresi', 'Tarif Linki', 'PDF Tarif', 'Dikkat Notları',
  'Bilgiler Tam', 'Oluşturuldu', 'Güncellendi',
];

function yarnToText(y: YarnLine): string {
  const head = [y.brand, y.name, y.colorCode, y.colorName].filter(Boolean).join(' ');
  const tail = [y.usage, y.amount].filter(Boolean).join(', ');
  return tail ? `${head} (${tail})` : head;
}

function rowToLine({ spec, supplierName, productTitle }: CsvRow): string {
  return [
    spec.productId,
    productTitle,
    supplierName,
    spec.yarns.map(yarnToText).join(' | '),
    spec.yarns.length,
    spec.hookSize,
    spec.fill,
    spec.eyes,
    spec.finishedSize,
    spec.productionHours,
    spec.patternUrl,
    spec.hasFile ? spec.fileName || 'Evet' : '',
    spec.notes,
    spec.isComplete ? 'Evet' : 'Hayır',
    spec.createdAt,
    spec.updatedAt,
  ].map(csvCell).join(';');
}

export function specsToCsv(rows: CsvRow[]): string {
  const lines = [HEADER.map(csvCell).join(';'), ...rows.map(rowToLine)];
  return '﻿' + lines.join('\r\n') + '\r\n';
}
