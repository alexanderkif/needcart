import { z } from 'zod';

import { parseMoneyToCents } from '@/lib/money';

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : ''));

const optionalMoney = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : ''))
    .refine(
      (value) => value === '' || parseMoneyToCents(value) !== null,
      message,
    )
    .refine(
      (value) => {
        if (value === '') {
          return true;
        }
        const cents = parseMoneyToCents(value);
        return cents !== null && cents >= 0;
      },
      message,
    );

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'validation.emailRequired')
  .email('validation.emailInvalid');

export const inviteCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => /^[A-HJ-NP-Z2-9]{12}$/.test(value),
    'validation.inviteCodeInvalid',
  );

export const groupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'validation.groupNameRequired')
    .max(80, 'validation.groupNameTooLong'),
  description: optionalText(500, 'validation.descriptionTooLong'),
  currency: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => /^[A-Z]{3}$/.test(value),
      'validation.currencyInvalid',
    ),
  budget: optionalMoney('validation.budgetInvalid'),
  budgetPeriod: z.enum(['none', 'week', 'month']),
  timezone: z
    .string()
    .trim()
    .min(1, 'validation.timezoneRequired')
    .max(64, 'validation.timezoneInvalid'),
});

export type GroupFormValues = z.input<typeof groupFormSchema>;

export const itemFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'validation.itemNameRequired')
    .max(120, 'validation.itemNameTooLong'),
  quantity: z
    .string()
    .trim()
    .min(1, 'validation.quantityRequired')
    .max(40, 'validation.quantityTooLong'),
  price: optionalMoney('validation.priceInvalid'),
  categoryId: z.string().uuid().nullable(),
  description: optionalText(500, 'validation.descriptionTooLong'),
});

export type ItemFormValues = z.input<typeof itemFormSchema>;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'validation.categoryNameRequired')
    .max(40, 'validation.categoryNameTooLong'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'validation.colorInvalid'),
  icon: z
    .string()
    .trim()
    .min(1, 'validation.iconRequired')
    .max(40, 'validation.iconTooLong'),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;

export const profileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'validation.displayNameRequired')
    .max(60, 'validation.displayNameTooLong'),
});

export type ProfileFormValues = z.input<typeof profileFormSchema>;

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'validation.invalid';
}
