import type { BudgetPeriod, GroupOverviewRow } from '@/types/database';

export type BudgetSummary = {
  hasBudget: boolean;
  budgetCents: number | null;
  spentCents: number;
  plannedCents: number;
  remainingCents: number | null;
  projectedCents: number;
  overBudget: boolean;
  ratio: number;
  period: BudgetPeriod;
  periodStart: string | null;
};

type BudgetSource = Pick<
  GroupOverviewRow,
  | 'budget_cents'
  | 'budget_period'
  | 'spent_cents'
  | 'planned_cents'
  | 'period_start'
>;

export function getBudgetSummary(group: BudgetSource): BudgetSummary {
  const budgetCents = group.budget_cents;
  const hasBudget =
    budgetCents !== null &&
    budgetCents !== undefined &&
    group.budget_period !== 'none';
  const spentCents = Number(group.spent_cents) || 0;
  const plannedCents = Number(group.planned_cents) || 0;

  return {
    hasBudget,
    budgetCents: hasBudget ? budgetCents : null,
    spentCents,
    plannedCents,
    remainingCents: hasBudget ? budgetCents - spentCents : null,
    projectedCents: spentCents + plannedCents,
    overBudget: hasBudget ? spentCents > budgetCents : false,
    ratio: hasBudget && budgetCents > 0 ? spentCents / budgetCents : 0,
    period: group.budget_period,
    periodStart: group.period_start,
  };
}
