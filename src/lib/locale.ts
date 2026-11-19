import { getLocales } from 'expo-localization';

import type { Locale } from '@/types/database';

export const SUPPORTED_LOCALES: Locale[] = [
  'en',
  'ru',
  'es',
  'de',
  'pt-BR',
  'fr',
  'sr-Latn',
  'it',
];

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return 'en';
  }
  if (SUPPORTED_LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  const language = value.toLowerCase().split(/[-_]/)[0];
  if (language === 'pt') {
    return 'pt-BR';
  }
  if (language === 'sr') {
    return 'sr-Latn';
  }
  if (language && SUPPORTED_LOCALES.includes(language as Locale)) {
    return language as Locale;
  }
  return 'en';
}

export function getDeviceLocale(): Locale {
  try {
    const locale = getLocales()[0];
    if (!locale) {
      return 'en';
    }
    if (locale.languageCode?.toLowerCase() === 'pt') {
      return 'pt-BR';
    }
    if (locale.languageCode?.toLowerCase() === 'sr') {
      return 'sr-Latn';
    }
    return normalizeLocale(locale.languageTag ?? locale.languageCode);
  } catch {
    return 'en';
  }
}
