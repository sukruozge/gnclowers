import type { Product } from './products';

export interface CartItem {
  id: string;
  quantity: number;
  product?: Product;
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('ase_cart') || '[]');
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ase_cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
}

export function addToCart(product: Product, quantity: number = 1): void {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ id: product.id, quantity });
  }
  saveCart(cart);
}

export function updateCartQuantity(productId: string, quantity: number): void {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity = Math.max(1, quantity);
    saveCart(cart);
  }
}

export function removeFromCart(productId: string): void {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
}

export function clearCart(): void {
  saveCart([]);
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Show the "added to cart" confirmation toast with a "go to cart" action that
 * lingers for a few seconds. Shared by every add-to-cart entry point so the
 * confirmation looks and behaves identically across the site.
 */
export function showCartToast(opts: { addedLabel: string; goLabel: string; cartHref: string }): void {
  if (typeof document === 'undefined') return;
  // Rapid clicks shouldn't stack toasts — clear any that's still on screen.
  document.querySelectorAll('.cart-toast').forEach((el) => el.remove());

  const check = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
  const arrow = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

  const toast = document.createElement('div');
  toast.className = 'cart-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML =
    `<span class="cart-toast__msg">${check}<span>${opts.addedLabel}</span></span>` +
    `<a class="cart-toast__go" href="${opts.cartHref}">${opts.goLabel}${arrow}</a>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
