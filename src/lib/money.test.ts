import { describe, expect, it } from 'vitest';

import {
  centsToInput,
  formatAmount,
  formatMoney,
  formatMoneyCompact,
  parseMoneyToCents,
} from '@/lib/money';

describe('parseMoneyToCents', () => {
  it('parses dot decimals', () => {
    expect(parseMoneyToCents('12.34')).toBe(1234);
    expect(parseMoneyToCents('0.05')).toBe(5);
    expect(parseMoneyToCents('7')).toBe(700);
  });

  it('parses comma decimals', () => {
    expect(parseMoneyToCents('12,34')).toBe(1234);
    expect(parseMoneyToCents('0,5')).toBe(50);
  });

  it('handles grouping characters and currency symbols', () => {
    expect(parseMoneyToCents('$ 1 234,50')).toBe(123450);
    expect(parseMoneyToCents('1.234,50 €')).toBe(123450);
    expect(parseMoneyToCents("1'234.50")).toBe(123450);
  });

  it('rejects ambiguous or invalid input', () => {
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('   ')).toBeNull();
    expect(parseMoneyToCents('abc')).toBeNull();
    expect(parseMoneyToCents('12.345')).toBeNull();
    expect(parseMoneyToCents('.')).toBeNull();
  });

  it('keeps negatives for validation by callers', () => {
    expect(parseMoneyToCents('-5.00')).toBe(-500);
  });
});

describe('centsToInput', () => {
  it('formats cents for a decimal input', () => {
    expect(centsToInput(1234)).toBe('12.34');
    expect(centsToInput(5)).toBe('0.05');
    expect(centsToInput(null)).toBe('');
    expect(centsToInput(-250)).toBe('-2.50');
  });
});

describe('formatAmount', () => {
  it('formats an amount without a currency', () => {
    expect(formatAmount(56000, 'en-US')).toBe('560');
    expect(formatAmount(1234, 'de-DE')).toContain('12,34');
    expect(formatAmount(null, 'en-US')).toBe('—');
  });
});

describe('formatMoney', () => {
  it('formats currency for a locale', () => {
    expect(formatMoney(1234, 'USD', 'en-US')).toContain('12.34');
    expect(formatMoney(1234, 'EUR', 'de-DE')).toContain('12,34');
    expect(formatMoney(null, 'USD', 'en-US')).toBe('—');
  });

  it('has a compact fallback', () => {
    expect(formatMoneyCompact(123400, 'USD', 'en-US')).toContain('$');
  });
});
