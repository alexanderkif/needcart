import { getLocales } from 'expo-localization';

export const CURRENCY_CODES = [
  'USD',
  'EUR',
  'RUB',
  'GBP',
  'RSD',
  'BRL',
  'CAD',
  'AUD',
  'CHF',
  'PLN',
  'TRY',
  'UAH',
  'KZT',
  'GEL',
  'ILS',
  'CNY',
  'INR',
];

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  RU: 'RUB',
  BR: 'BRL',
  RS: 'RSD',
  CA: 'CAD',
  AU: 'AUD',
  CH: 'CHF',
  PL: 'PLN',
  TR: 'TRY',
  UA: 'UAH',
  KZ: 'KZT',
  GE: 'GEL',
  IL: 'ILS',
  CN: 'CNY',
  IN: 'INR',
};

const EURO_REGIONS = new Set([
  'DE',
  'FR',
  'ES',
  'IT',
  'PT',
  'NL',
  'BE',
  'AT',
  'IE',
  'FI',
  'GR',
  'SK',
  'SI',
  'LT',
  'LV',
  'EE',
  'LU',
  'MT',
  'CY',
  'HR',
]);

const LANGUAGE_CURRENCY: Record<string, string> = {
  ru: 'RUB',
  sr: 'RSD',
  pt: 'BRL',
  de: 'EUR',
  fr: 'EUR',
  es: 'EUR',
  it: 'EUR',
  pl: 'PLN',
  tr: 'TRY',
  uk: 'UAH',
  zh: 'CNY',
  hi: 'INR',
};

export function defaultCurrencyForDevice(): string {
  try {
    const locale = getLocales()[0];
    const region = locale?.regionCode?.toUpperCase();
    if (region && REGION_CURRENCY[region]) {
      return REGION_CURRENCY[region];
    }
    if (region && EURO_REGIONS.has(region)) {
      return 'EUR';
    }
    const language = locale?.languageCode?.toLowerCase();
    if (language && LANGUAGE_CURRENCY[language]) {
      return LANGUAGE_CURRENCY[language];
    }
  } catch {
    // Fall through to USD.
  }
  return 'USD';
}

export function currencyOptions(locale: string): {
  value: string;
  label: string;
}[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], {
      type: 'currency',
      fallback: 'code',
    });
  } catch {
    names = null;
  }

  return CURRENCY_CODES.map((code) => {
    const name = names?.of(code);
    return {
      value: code,
      label: name && name !== code ? `${code} · ${name}` : code,
    };
  });
}
