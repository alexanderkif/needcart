import { describe, expect, it } from 'vitest';

import { getBudgetSummary } from '@/features/budget/summary';

const base = {
  budget_cents: 5000,
  budget_period: 'week' as const,
  spent_cents: 2300,
  planned_cents: 1200,
  period_start: '2026-11-16T00:00:00.000Z',
};

describe('getBudgetSummary', () => {
  it('computes remaining and projected amounts', () => {
    const summary = getBudgetSummary(base);

    expect(summary.hasBudget).toBe(true);
    expect(summary.remainingCents).toBe(2700);
    expect(summary.projectedCents).toBe(3500);
    expect(summary.overBudget).toBe(false);
    expect(summary.ratio).toBeCloseTo(0.46);
  });

  it('marks overspending', () => {
    const summary = getBudgetSummary({ ...base, spent_cents: 6100 });

    expect(summary.overBudget).toBe(true);
    expect(summary.remainingCents).toBe(-1100);
    expect(summary.ratio).toBeGreaterThan(1);
  });

  it('ignores a budget when the period is none', () => {
    const summary = getBudgetSummary({
      ...base,
      budget_period: 'none',
      period_start: null,
    });

    expect(summary.hasBudget).toBe(false);
    expect(summary.budgetCents).toBeNull();
    expect(summary.remainingCents).toBeNull();
    expect(summary.plannedCents).toBe(1200);
  });

  it('treats a missing budget as no budget', () => {
    const summary = getBudgetSummary({ ...base, budget_cents: null });
    expect(summary.hasBudget).toBe(false);
  });
});
