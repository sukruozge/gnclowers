import { describe, it, expect } from 'vitest';
import { slugify } from '@lib/slug';

describe('slugify', () => {
  it('folds Turkish characters and appends id', () => {
    expect(slugify('El Yapımı Tavşan', '1234')).toBe('el-yapimi-tavsan-1234');
  });
  it('collapses spaces and symbols', () => {
    expect(slugify('Handmade  Bunny!! Toy', '9')).toBe('handmade-bunny-toy-9');
  });
  it('handles empty title', () => {
    expect(slugify('', '5')).toBe('5');
  });
});
