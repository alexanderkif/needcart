import { describe, expect, it } from 'vitest';

import {
  categoryFormSchema,
  emailSchema,
  groupFormSchema,
  inviteCodeSchema,
  itemFormSchema,
} from '@/lib/validation';

describe('emailSchema', () => {
  it('accepts normal emails', () => {
    expect(emailSchema.safeParse('alice@example.com').success).toBe(true);
  });

  it('rejects empty and malformed emails', () => {
    expect(emailSchema.safeParse('').success).toBe(false);
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

describe('inviteCodeSchema', () => {
  it('uppercases and accepts valid codes', () => {
    const parsed = inviteCodeSchema.parse('abcd2345efgh');
    expect(parsed).toBe('ABCD2345EFGH');
  });

  it('rejects ambiguous characters and wrong length', () => {
    expect(inviteCodeSchema.safeParse('ABCD2345EFGI').success).toBe(false);
    expect(inviteCodeSchema.safeParse('ABC').success).toBe(false);
  });
});

describe('groupFormSchema', () => {
  it('normalizes currency and accepts an empty budget', () => {
    const parsed = groupFormSchema.parse({
      name: ' Home ',
      description: '',
      currency: 'eur',
      budget: '',
      budgetPeriod: 'none',
      timezone: 'Europe/Berlin',
    });

    expect(parsed.name).toBe('Home');
    expect(parsed.currency).toBe('EUR');
  });

  it('rejects invalid budgets', () => {
    const parsed = groupFormSchema.safeParse({
      name: 'Home',
      description: '',
      currency: 'EUR',
      budget: '12.345',
      budgetPeriod: 'month',
      timezone: 'Europe/Berlin',
    });

    expect(parsed.success).toBe(false);
  });
});

describe('itemFormSchema', () => {
  it('accepts an item without a category or price', () => {
    const parsed = itemFormSchema.parse({
      name: 'Milk',
      quantity: '2 l',
      price: '',
      categoryId: null,
      description: '',
    });

    expect(parsed.quantity).toBe('2 l');
    expect(parsed.categoryId).toBeNull();
  });

  it('rejects an invalid category id', () => {
    const parsed = itemFormSchema.safeParse({
      name: 'Milk',
      quantity: '2 l',
      price: '',
      categoryId: 'not-a-uuid',
      description: '',
    });

    expect(parsed.success).toBe(false);
  });
});

describe('categoryFormSchema', () => {
  it('validates color and name', () => {
    expect(
      categoryFormSchema.safeParse({
        name: 'Food',
        color: '#F5B301',
        icon: 'basket',
      }).success,
    ).toBe(true);

    expect(
      categoryFormSchema.safeParse({
        name: '',
        color: 'orange',
        icon: 'basket',
      }).success,
    ).toBe(false);
  });
});
