import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { getDefaultCategories } from '@/features/categories/defaults';
import { useCreateGroup } from '@/features/groups/hooks';
import { useLocale } from '@/i18n';
import { currencyOptions, defaultCurrencyForDevice } from '@/lib/currencies';
import { getDeviceTimezone } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { parseMoneyToCents } from '@/lib/money';
import { useGoBack } from '@/lib/use-go-back';
import { groupFormSchema } from '@/lib/validation';
import type { BudgetPeriod } from '@/types/database';

type FormState = {
  name: string;
  description: string;
  currency: string;
  budget: string;
  budgetPeriod: BudgetPeriod;
  timezone: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export default function NewGroupScreen() {
  const { t } = useTranslation();
  const locale = useLocale();
  const router = useRouter();
  const goBack = useGoBack('/');
  const { showToast } = useToast();
  const createGroup = useCreateGroup();

  const [values, setValues] = useState<FormState>(() => ({
    name: '',
    description: '',
    currency: defaultCurrencyForDevice(),
    budget: '',
    budgetPeriod: 'none',
    timezone: getDeviceTimezone(),
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  const currencies = useMemo(() => currencyOptions(locale), [locale]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async () => {
    const parsed = groupFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && key in values) {
          nextErrors[key as keyof FormState] = t(issue.message);
        }
      }
      setErrors(nextErrors);
      return;
    }

    const budgetCents = values.budget.trim()
      ? parseMoneyToCents(values.budget)
      : null;

    if (values.budget.trim() && (budgetCents === null || budgetCents < 0)) {
      setErrors({ budget: t('validation.budgetInvalid') });
      return;
    }

    try {
      const group = await createGroup.mutateAsync({
        name: parsed.data.name,
        description: parsed.data.description || null,
        currency: parsed.data.currency,
        budget_cents:
          parsed.data.budgetPeriod === 'none' ? null : budgetCents,
        budget_period: parsed.data.budgetPeriod,
        timezone: parsed.data.timezone,
        categories: getDefaultCategories(t),
      });
      router.replace({ pathname: '/groups/[id]', params: { id: group.id } });
    } catch (error) {
      showToast(
        errorMessage(error, t, 'errors.groupCreationFailed'),
        'error',
      );
    }
  };

  return (
    <Screen scroll keyboard contentContainerClassName="pt-1">
      <Header
        title={t('groups.newTitle')}
        subtitle={t('groups.newSubtitle')}
        onBack={goBack}
      />

      <View className="gap-4 pt-3">
        <Input
          label={t('groups.nameLabel')}
          required
          value={values.name}
          onChangeText={(value) => update('name', value)}
          placeholder={t('groups.namePlaceholder')}
          error={errors.name}
          autoFocus
        />

        <Input
          label={t('groups.descriptionLabel')}
          value={values.description}
          onChangeText={(value) => update('description', value)}
          placeholder={t('groups.descriptionPlaceholder')}
          error={errors.description}
          multiline
        />

        <Select
          label={t('groups.currencyLabel')}
          value={values.currency}
          options={currencies}
          onChange={(value) => update('currency', value)}
          error={errors.currency}
        />

        <View className="gap-2">
          <AppText variant="label" muted>
            {t('groups.periodLabel')}
          </AppText>
          <SegmentedControl
            value={values.budgetPeriod}
            onChange={(value) => update('budgetPeriod', value)}
            options={[
              { value: 'none', label: t('groups.periodNone') },
              { value: 'week', label: t('groups.periodWeek') },
              { value: 'month', label: t('groups.periodMonth') },
            ]}
          />
        </View>

        {values.budgetPeriod !== 'none' ? (
          <Input
            label={t('groups.budgetFieldLabel')}
            value={values.budget}
            onChangeText={(value) => update('budget', value)}
            placeholder={t('groups.budgetPlaceholder')}
            error={errors.budget}
            keyboardType="decimal-pad"
          />
        ) : null}

        <Input
          label={t('groups.timezoneLabel')}
          value={values.timezone}
          onChangeText={(value) => update('timezone', value)}
          placeholder="Europe/Moscow"
          error={errors.timezone}
          hint={t('groups.timezoneHint')}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Button
          title={
            createGroup.isPending
              ? t('groups.creating')
              : t('groups.createAction')
          }
          onPress={() => void submit()}
          loading={createGroup.isPending}
          fullWidth
        />
      </View>
    </Screen>
  );
}
