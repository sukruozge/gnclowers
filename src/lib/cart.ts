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
