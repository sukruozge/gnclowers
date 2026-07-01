export type Locale = 'tr' | 'en';
export const LOCALES: Locale[] = ['tr', 'en'];

export const strings: Record<Locale, Record<string, string>> = {
  tr: {
    'nav.home': 'Ana Sayfa',
    'nav.products': 'Ürünler',
    'nav.about': 'Hakkımızda',
    'nav.blog': 'Blog',
    'nav.contact': 'İletişim',
    'nav.shopAll': 'Tüm Ürünler',
    'cta.buy': "Etsy'de Satın Al",
    'shipping.title': 'Kargo Bilgisi',
    'footer.rights': 'Tüm hakları saklıdır.',
    'footer.tagline': 'Sevgiyle örülmüş el yapımı amigurumi.',
    'footer.shop': 'Mağaza',
    'footer.about': 'Hakkımızda',
    'footer.follow': 'Bizi Takip Et',
  },
  en: {
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.about': 'About',
    'nav.blog': 'Blog',
    'nav.contact': 'Contact',
    'nav.shopAll': 'Shop all',
    'cta.buy': 'Buy on Etsy',
    'shipping.title': 'Shipping Info',
    'footer.rights': 'All rights reserved.',
    'footer.tagline': 'Handmade amigurumi, crocheted with love.',
    'footer.shop': 'Shop',
    'footer.about': 'About',
    'footer.follow': 'Follow us',
  },
};

export function t(key: string, locale: Locale): string {
  return strings[locale]?.[key] ?? key;
}
