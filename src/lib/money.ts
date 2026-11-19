/**
 * Money helpers. All amounts in the app and database are integer minor units
 * (cents). Never use floats for money.
 */

export const MAX_PRICE_CENTS = 1_000_000_000_00;

/**
 * Parses user input like "12.34", "12,34", "$ 1 234,50" into cents.
 * Returns null for empty or ambiguous input.
 */
export function parseMoneyToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Keep digits, dots, commas and a leading minus; drop currency symbols,
  // spaces and grouping characters such as apostrophes.
  let cleaned = trimmed
    .replace(/[\s\u00a0\u202f']/g, '')
    .replace(/[^\d.,-]/g, '');

  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === ',') {
    return null;
  }

  const negative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/-/g, '');

  if (!cleaned) {
    return null;
  }

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  let decimalSeparator: '.' | ',' | null = null;
  if (lastDot >= 0 && lastComma >= 0) {
    decimalSeparator = lastDot > lastComma ? '.' : ',';
  } else if (lastDot >= 0) {
    decimalSeparator = '.';
  } else if (lastComma >= 0) {
    decimalSeparator = ',';
  }

  let integerPart = cleaned;
  let fractionPart = '';

  if (decimalSeparator) {
    const index = cleaned.lastIndexOf(decimalSeparator);
    integerPart = cleaned.slice(0, index).replace(/[.,]/g, '');
    fractionPart = cleaned.slice(index + 1).replace(/[.,]/g, '');
  } else {
    integerPart = cleaned.replace(/[.,]/g, '');
  }

  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return null;
  }

  if (!integerPart && !fractionPart) {
    return null;
  }

  if (fractionPart.length > 2) {
    return null;
  }

  const normalizedInteger = integerPart || '0';
  const normalizedFraction = fractionPart.padEnd(2, '0');
  const cents = Number(`${normalizedInteger}${normalizedFraction}`);

  if (!Number.isSafeInteger(cents) || cents > MAX_PRICE_CENTS) {
    return null;
  }

  return negative ? -cents : cents;
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '';
  }
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

export function formatAmount(
  cents: number | null | undefined,
  locale: string,
): string {
  if (cents === null || cents === undefined) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2);
  }
}

export function formatMoney(
  cents: number | null | undefined,
  currency: string,
  locale: string,
): string {
  if (cents === null || cents === undefined) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatMoneyCompact(
  cents: number | null | undefined,
  currency: string,
  locale: string,
): string {
  if (cents === null || cents === undefined) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(cents / 100);
  } catch {
    return formatMoney(cents, currency, locale);
  }
}
