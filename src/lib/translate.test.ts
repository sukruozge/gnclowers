import { describe, it, expect } from 'vitest';
import { cachedTranslation, type Translatable } from '@lib/translate';

const en: Translatable = {
  title_en: 'Bunny', title_tr: 'Bunny', description_en: 'A soft bunny', description_tr: 'A soft bunny',
};
const translated: Translatable = {
  title_en: 'Bunny', title_tr: 'Tavşan', description_en: 'A soft bunny', description_tr: 'Yumuşak tavşan',
};

describe('cachedTranslation', () => {
  it('reuses the source translation when Etsy already provides one', () => {
    expect(cachedTranslation(translated)).toEqual({ title_tr: 'Tavşan', description_tr: 'Yumuşak tavşan' });
  });
  it('needs a fresh translation when source is English-only and no prev exists', () => {
    expect(cachedTranslation(en)).toBeNull();
  });
  it('reuses a previous translation when the English source is unchanged', () => {
    expect(cachedTranslation(en, translated)).toEqual({ title_tr: 'Tavşan', description_tr: 'Yumuşak tavşan' });
  });
  it('needs a fresh translation when the English source changed', () => {
    const changed: Translatable = { ...en, description_en: 'A NEW description', description_tr: 'A NEW description' };
    expect(cachedTranslation(changed, translated)).toBeNull();
  });
  it('needs a fresh translation when prev was never translated', () => {
    expect(cachedTranslation(en, en)).toBeNull();
  });
});
