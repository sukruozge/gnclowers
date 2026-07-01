import { describe, it, expect } from 'vitest';
import { pickLocale } from '@lib/locale';

describe('pickLocale', () => {
  it('routes Turkey to tr', () => expect(pickLocale('TR')).toBe('tr'));
  it('routes the US to en', () => expect(pickLocale('US')).toBe('en'));
  it('defaults null to en', () => expect(pickLocale(null)).toBe('en'));
});
