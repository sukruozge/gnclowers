// Etsy variation options arrive in English (e.g. "Choose Your Color" / "Blue Giraffe").
// The stored value MUST stay English — it's the canonical key used for price lookup,
// cart matching and the PayTR basket. This module only translates the *display label*
// on the Turkish storefront; English pages show the value as-is (bar HTML-decoding).

// Exact translations for the (few) option NAMES.
const NAME_TR: Record<string, string> = {
  'Options': 'Seçenek',
  'Primary color': 'Renk',
  'Select Color': 'Renk Seçin',
  'Choose Your Color': 'Renk Seçin',
  'Outfit Color': 'Kıyafet Rengi',
  'Choose Model': 'Model Seçin',
  'Choose Your Model': 'Model Seçin',
  'Select Model': 'Model Seçin',
  'Choose Your Bunny': 'Tavşan Seçin',
  'Choose Your Size': 'Boyut Seçin',
  'Choose Daisy Style': 'Papatya Modeli',
};

// Term substitutions for VALUES — applied phrase-first (longest matches win) so
// compound values like "Blue Giraffe" → "Mavi Zürafa", "Custom Set 3 Pieces" →
// "Özel Set 3 Parça". Unmapped words (proper names like "Leon", "Sid") stay as-is.
const RAW_TERMS: Record<string, string> = {
  // colours
  'mint green': 'Mint Yeşili', 'baby blue': 'Bebek Mavisi', 'soft pink': 'Yumuşak Pembe',
  'light brown': 'Açık Kahve', 'lightbrown': 'Açık Kahve',
  cream: 'Krem', beige: 'Bej', black: 'Siyah', blue: 'Mavi', brown: 'Kahverengi',
  gray: 'Gri', grey: 'Gri', green: 'Yeşil', lavender: 'Lavanta', orange: 'Turuncu',
  pink: 'Pembe', purple: 'Mor', red: 'Kırmızı', white: 'Beyaz', yellow: 'Sarı',
  rainbow: 'Gökkuşağı', sage: 'Adaçayı', mint: 'Mint',
  // animals / characters
  bear: 'Ayı', bunny: 'Tavşan', giraffe: 'Zürafa', graffe: 'Zürafa', lion: 'Aslan',
  leon: 'Aslan', dinosaur: 'Dinozor', dino: 'Dinozor', duck: 'Ördek', elephant: 'Fil',
  monkey: 'Maymun', mouse: 'Fare', sheep: 'Koyun', pig: 'Domuz', deer: 'Geyik',
  octopus: 'Ahtapot', ladybug: 'Uğur Böceği', flamingo: 'Flamingo', dog: 'Köpek',
  cat: 'Kedi', unicorn: 'Unicorn', beer: 'Ayı',
  // objects / motifs
  daisy: 'Papatya', flower: 'Çiçek', sunflower: 'Ayçiçeği', strawberry: 'Çilek',
  cherry: 'Kiraz', avocado: 'Avokado', mushroom: 'Mantar', carrot: 'Havuç',
  'orange slice': 'Portakal Dilimi', headband: 'Saç Bandı', clips: 'Toka', clip: 'Toka',
  pigtail: 'İkiz Örgü', ears: 'Kulak', pofuna: 'Pofuna',
  // structure / qualifiers
  customizable: 'Kişiye Özel', custom: 'Özel', standard: 'Standart', complete: 'Tam',
  'full collection': 'Tüm Koleksiyon', collection: 'Koleksiyon', personalized: 'Kişiye Özel',
  set: 'Set', pack: 'Adet', pieces: 'Parça', piece: 'Parça', pairs: 'Çift', pair: 'Çift',
  mix: 'Karışık', 'mix-kit': 'Karışık Set', lined: 'Astarlı', sleeping: 'Uykulu',
  dressed: 'Giyimli', large: 'Büyük', small: 'Küçük', children: 'Çocuk',
  left: 'Sol', right: 'Sağ', girl: 'Kız', boy: 'Erkek',
};

// Pre-sort terms longest-first and precompile regexes once.
const TERMS: Array<[RegExp, string]> = Object.entries(RAW_TERMS)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([en, tr]) => [new RegExp(`(^|[^a-zçğıöşü])(${en.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')})(?![a-zçğıöşü])`, 'gi'), tr]);

function substitute(text: string): string {
  let out = text;
  for (const [re, tr] of TERMS) out = out.replace(re, (_m, pre) => `${pre}${tr}`);
  return out;
}

function decode(v: string): string {
  return v.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\binch\b/gi, 'inç');
}

export function optName(name: string, locale: 'tr' | 'en'): string {
  if (locale !== 'tr') return name;
  return NAME_TR[name] ?? substitute(name);
}

export function optValue(value: string, locale: 'tr' | 'en'): string {
  const d = decode(value);
  return locale === 'tr' ? substitute(d) : d;
}

// "Model: Blue Giraffe" style summary line, translated per locale.
export function optionsLine(options: Record<string, string> | undefined, locale: 'tr' | 'en'): string {
  if (!options) return '';
  return Object.keys(options).map((k) => `${optName(k, locale)}: ${optValue(options[k], locale)}`).join(' · ');
}
