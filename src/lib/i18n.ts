export type Locale = 'tr' | 'en';
export const LOCALES: Locale[] = ['tr', 'en'];

export const strings: Record<Locale, Record<string, string>> = {
  tr: {
    'nav.home': 'Ana Sayfa',
    'nav.products': 'Ürünler',
    'nav.about': 'Hakkımızda',
    'nav.blog': 'Blog',
    'nav.contact': 'İletişim',
    'cta.buy': "Etsy'de Satın Al",
    'shipping.title': 'Kargo Bilgisi',
    'footer.rights': 'Tüm hakları saklıdır.',
  },
  en: {
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.about': 'About',
    'nav.blog': 'Blog',
    'nav.contact': 'Contact',
    'cta.buy': 'Buy on Etsy',
    'shipping.title': 'Shipping Info',
    'footer.rights': 'All rights reserved.',
  },
};

export function t(key: string, locale: Locale): string {
  return strings[locale]?.[key] ?? key;
}
