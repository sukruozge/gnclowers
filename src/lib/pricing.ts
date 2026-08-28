import settings from '../data/settings.json';
import type { Locale } from './i18n';
import { SELLER } from './legal';

/**
 * Storefront-wide price switch.
 *
 * While `settings.hidePrices` is true the shop shows no prices anywhere and the
 * whole buy flow is off: catalogue cards, product pages, cart and checkout all
 * point the visitor at WhatsApp/Instagram instead. Product JSON-LD drops its
 * offer and the Google Merchant feed goes empty, because publishing a price to
 * Google that the page does not show gets the feed disapproved.
 *
 * To sell again: set `hidePrices` to false in src/data/settings.json. Nothing
 * else needs touching — prices, cart and checkout come back as they were.
 */
export function pricesHidden(): boolean {
  return (settings as { hidePrices?: boolean }).hidePrices === true;
}

/** Short label that replaces the price on cards and product pages. */
export function priceLabel(locale: Locale): string {
  return locale === 'tr' ? 'Fiyat için DM' : 'DM for price';
}

export function instagramUrl(): string {
  return (settings as { instagram?: string }).instagram || 'https://www.instagram.com/aselovers/';
}

/** wa.me needs a bare international number: no +, spaces or dashes. */
function whatsappNumber(): string {
  return SELLER.whatsapp.replace(/\D/g, '');
}

/**
 * WhatsApp deep link with the enquiry pre-written, so the shopper only has to
 * hit send and we can see exactly which product they mean.
 */
export function whatsappUrl(productTitle: string, productUrl: string, locale: Locale, note?: string): string {
  const trimmed = (note ?? '').trim();
  const message = locale === 'tr'
    ? [
        `Merhaba! "${productTitle}" ürününün fiyatını öğrenebilir miyim?`,
        trimmed && `Özel isteğim: ${trimmed}`,
        productUrl,
      ].filter(Boolean).join('\n')
    : [
        `Hello! Could I get the price for "${productTitle}"?`,
        trimmed && `My request: ${trimmed}`,
        productUrl,
      ].filter(Boolean).join('\n');

  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(message)}`;
}
