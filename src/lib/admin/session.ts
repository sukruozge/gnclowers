/**
 * JWT payload rol ayrımı. Admin ve tedarikçi token'ları aynı JWT_SECRET ile imzalanır;
 * yalnızca imza doğrulamak yetmez — payload'ın hangi role ait olduğu burada tek yerde belirlenir.
 */

export interface SupplierSession {
  role: 'supplier';
  sid: string;
  name: string;
}

export function isAdminPayload(p: Record<string, unknown> | null | undefined): boolean {
  return !!p && p.sub === 'admin';
}

export function isSupplierPayload(p: Record<string, unknown> | null | undefined): p is Record<string, unknown> & SupplierSession {
  return !!p && p.role === 'supplier' && typeof p.sid === 'string' && p.sid.length > 0;
}
