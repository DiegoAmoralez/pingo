import { describe, expect, it } from 'vitest';
import { detectLocale, localeFromAcceptLanguage, localeFromCountry } from './locale-detect';

describe('localeFromCountry', () => {
  it('maps Russian-speaking countries to ru and others to en', () => {
    expect(localeFromCountry('RU')).toBe('ru');
    expect(localeFromCountry('kz')).toBe('ru');
    expect(localeFromCountry('BY')).toBe('ru');
    expect(localeFromCountry('US')).toBe('en');
    expect(localeFromCountry('DE')).toBe('en');
  });

  it('ignores unknown or placeholder codes', () => {
    expect(localeFromCountry(null)).toBeNull();
    expect(localeFromCountry('')).toBeNull();
    expect(localeFromCountry('XX')).toBeNull();
    expect(localeFromCountry('T1')).toBeNull();
  });
});

describe('localeFromAcceptLanguage', () => {
  it('prefers the higher-ranked of ru/en', () => {
    expect(localeFromAcceptLanguage('ru-RU,ru;q=0.9,en-US;q=0.8')).toBe('ru');
    expect(localeFromAcceptLanguage('en-GB,en;q=0.9,ru;q=0.5')).toBe('en');
    expect(localeFromAcceptLanguage('uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7')).toBe('ru');
    expect(localeFromAcceptLanguage('de-DE,de;q=0.9,en;q=0.5')).toBe('en');
  });

  it('returns null when neither ru nor en is listed', () => {
    expect(localeFromAcceptLanguage('de-DE,fr;q=0.8')).toBeNull();
    expect(localeFromAcceptLanguage('')).toBeNull();
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });
});

describe('detectLocale', () => {
  it('lets the country win over Accept-Language', () => {
    expect(detectLocale({ country: 'RU', acceptLanguage: 'en-US' })).toBe('ru');
    expect(detectLocale({ country: 'US', acceptLanguage: 'ru-RU' })).toBe('en');
  });

  it('falls back to Accept-Language and then to English', () => {
    expect(detectLocale({ acceptLanguage: 'ru' })).toBe('ru');
    expect(detectLocale({})).toBe('en');
    expect(detectLocale({ country: 'XX', acceptLanguage: 'ja' })).toBe('en');
  });
});
