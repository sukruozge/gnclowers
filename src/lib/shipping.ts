// Region-based shipping. Rates live in settings.json (admin-editable) so no code
// change is needed to adjust them. Defaults are 0 (no surprise charges).
export interface ShippingConfig {
  tr?: { fee?: number; freeOver?: number };
  intl?: { fee?: number };
}

/** Server-authoritative shipping fee for a subtotal + destination country. */
export function shippingFee(cfg: ShippingConfig | undefined, country: string, subtotal: number): number {
  const isTr = String(country || 'TR').toUpperCase() === 'TR';
  if (isTr) {
    const fee = Number(cfg?.tr?.fee ?? 0) || 0;
    const freeOver = Number(cfg?.tr?.freeOver ?? 0) || 0;
    if (freeOver > 0 && subtotal >= freeOver) return 0;
    return fee;
  }
  return Number(cfg?.intl?.fee ?? 0) || 0;
}
