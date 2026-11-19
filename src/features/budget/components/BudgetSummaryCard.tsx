import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getBudgetSummary } from '@/features/budget/summary';
import { useLocale } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { GroupOverview } from '@/types/database';

/**
 * One compact budget line for both group cards and the group header.
 * The item list is the primary content, so this deliberately avoids a
 * separate "Budget" label, period row and repeated "planned" captions.
 */
export function BudgetSummaryCard({ group }: { group: GroupOverview }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { palette } = useTheme();
  const summary = getBudgetSummary(group);

  if (!summary.hasBudget) {
    return (
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="caption" muted numberOfLines={1}>
          {t('groups.noBudget')}
        </AppText>
        <AppText variant="bodySmall" className="font-semibold" numberOfLines={1}>
          {t('budget.planned')}:{' '}
          {formatMoney(summary.plannedCents, group.currency, locale)}
        </AppText>
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="caption" muted numberOfLines={1}>
          {t('budget.spentOf', {
            spent: formatMoney(summary.spentCents, group.currency, locale),
            budget: formatMoney(summary.budgetCents, group.currency, locale),
          })}
        </AppText>
        <AppText
          variant="caption"
          className="font-semibold"
          style={{
            color: summary.overBudget ? palette.danger : palette.success,
          }}
          numberOfLines={1}
        >
          {summary.overBudget
            ? t('budget.over', {
                amount: formatMoney(
                  Math.abs(summary.remainingCents ?? 0),
                  group.currency,
                  locale,
                ),
              })
            : `${t('budget.remaining')}: ${formatMoney(
                summary.remainingCents,
                group.currency,
                locale,
              )}`}
        </AppText>
      </View>
      <ProgressBar
        ratio={summary.ratio}
        tone={summary.overBudget ? 'danger' : 'accent'}
        height={6}
      />
    </View>
  );
}
