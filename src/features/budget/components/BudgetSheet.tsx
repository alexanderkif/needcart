import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Sheet } from '@/components/ui/Sheet';
import { getBudgetSummary } from '@/features/budget/summary';
import { useLocale } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { GroupOverview } from '@/types/database';

export function BudgetSheet({
  visible,
  group,
  onClose,
  onOpenSettings,
}: {
  visible: boolean;
  group: GroupOverview;
  onClose: () => void;
  onOpenSettings?: () => void;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const summary = getBudgetSummary(group);

  const periodLabel =
    summary.period === 'week'
      ? t('budget.periodWeek')
      : summary.period === 'month'
        ? t('budget.periodMonth')
        : t('budget.noBudget');

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('budget.title')}
      scrollable={false}
      footer={
        onOpenSettings ? (
          <Button
            title={t('groups.settingsTitle')}
            variant="secondary"
            onPress={onOpenSettings}
            fullWidth
          />
        ) : null
      }
    >
      {summary.hasBudget ? (
        <View className="gap-4">
          <AppText variant="caption" muted>
            {periodLabel}
          </AppText>

          <View className="gap-1">
            <View className="flex-row items-baseline gap-2">
              <AppText variant="h1">
                {formatMoney(summary.spentCents, group.currency, locale)}
              </AppText>
              <AppText variant="bodySmall" muted>
                {t('budget.ofBudget', {
                  budget: formatMoney(
                    summary.budgetCents,
                    group.currency,
                    locale,
                  ),
                })}
              </AppText>
            </View>
            <ProgressBar
              ratio={summary.ratio}
              tone={summary.overBudget ? 'danger' : 'accent'}
              height={8}
            />
          </View>

          <View className="gap-2">
            <InfoRow
              label={
                summary.overBudget ? t('groups.overBudget') : t('budget.remaining')
              }
              value={
                summary.overBudget
                  ? formatMoney(
                      Math.abs(summary.remainingCents ?? 0),
                      group.currency,
                      locale,
                    )
                  : formatMoney(
                      summary.remainingCents,
                      group.currency,
                      locale,
                    )
              }
              tone={summary.overBudget ? 'danger' : 'success'}
            />
            <InfoRow
              label={t('budget.planned')}
              value={formatMoney(
                summary.plannedCents,
                group.currency,
                locale,
              )}
            />
          </View>
        </View>
      ) : (
        <View className="gap-2">
          <AppText variant="h1">
            {formatMoney(summary.plannedCents, group.currency, locale)}
          </AppText>
          <AppText variant="bodySmall" muted>
            {t('budget.planned')}
          </AppText>
          <AppText variant="caption" muted>
            {t('budget.noBudget')}
          </AppText>
        </View>
      )}
    </Sheet>
  );
}

function InfoRow({
  label,
  value,
  tone = 'text',
}: {
  label: string;
  value: string;
  tone?: 'text' | 'success' | 'danger';
}) {
  const { palette } = useTheme();
  const color =
    tone === 'success'
      ? palette.success
      : tone === 'danger'
        ? palette.danger
        : palette.text;

  return (
    <View className="flex-row items-center justify-between gap-3">
      <AppText variant="bodySmall" muted>
        {label}
      </AppText>
      <AppText variant="bodySmall" className="font-semibold" style={{ color }}>
        {value}
      </AppText>
    </View>
  );
}
