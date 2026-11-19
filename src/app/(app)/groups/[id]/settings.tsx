import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { useConfirm } from '@/components/ui/DialogProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { CategoryFormSheet, type CategoryFormResult } from '@/features/categories/components/CategoryFormSheet';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/categories/hooks';
import { InviteCodeCard } from '@/features/groups/components/InviteCodeCard';
import { MemberRow, roleLabelKey } from '@/features/groups/components/MemberRow';
import {
  useDeleteGroup,
  useGroup,
  useGroupMembers,
  useGroupRealtime,
  useGroupRole,
  useLeaveGroup,
  useRemoveMember,
  useRotateInviteCode,
  useUpdateGroup,
  useUpdateMemberRole,
} from '@/features/groups/hooks';
import { useLocale } from '@/i18n';
import { currencyOptions } from '@/lib/currencies';
import { errorMessage } from '@/lib/errors';
import { formatMoney, parseMoneyToCents } from '@/lib/money';
import { groupFormSchema } from '@/lib/validation';
import { useGoBack } from '@/lib/use-go-back';
import { useTheme } from '@/theme/ThemeProvider';
import type {
  BudgetPeriod,
  Category,
  Group,
  GroupMemberWithProfile,
  GroupRole,
} from '@/types/database';

type GeneralForm = {
  name: string;
  description: string;
  currency: string;
  budget: string;
  budgetPeriod: BudgetPeriod;
  timezone: string;
};

type FormErrors = Partial<Record<keyof GeneralForm, string>>;

function toForm(group: Group): GeneralForm {
  return {
    name: group.name,
    description: group.description ?? '',
    currency: group.currency,
    budget:
      group.budget_cents === null
        ? ''
        : (group.budget_cents / 100).toFixed(2),
    budgetPeriod: group.budget_period,
    timezone: group.timezone,
  };
}

const ROLE_WEIGHT: Record<GroupRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

export default function GroupSettingsScreen() {
  const { t } = useTranslation();
  const locale = useLocale();
  const router = useRouter();
  const { palette } = useTheme();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ id?: string }>();
  const groupId = typeof params.id === 'string' ? params.id : '';
  const goBack = useGoBack(
    groupId ? { pathname: '/groups/[id]', params: { id: groupId } } : '/',
  );
  const group = useGroup(groupId);
  const members = useGroupMembers(groupId);
  const categoriesQuery = useCategories(groupId);
  const role = useGroupRole(groupId);
  const updateGroup = useUpdateGroup(groupId);
  const rotateCode = useRotateInviteCode(groupId);
  const updateMemberRole = useUpdateMemberRole(groupId);
  const removeMember = useRemoveMember(groupId);
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();
  const createCategory = useCreateCategory(groupId);
  const updateCategory = useUpdateCategory(groupId);
  const deleteCategory = useDeleteCategory(groupId);
  useGroupRealtime(groupId);

  const [general, setGeneral] = useState<GeneralForm | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dirty, setDirty] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{
    open: boolean;
    category: Category | null;
  }>({ open: false, category: null });
  const [selectedMember, setSelectedMember] =
    useState<GroupMemberWithProfile | null>(null);

  useEffect(() => {
    if (group.data && !dirty) {
      setGeneral(toForm(group.data));
    }
  }, [group.data, dirty]);

  const currencies = useMemo(() => currencyOptions(locale), [locale]);

  const sortedMembers = useMemo(
    () =>
      [...(members.data ?? [])].sort(
        (left, right) =>
          ROLE_WEIGHT[left.role] - ROLE_WEIGHT[right.role] ||
          left.joined_at.localeCompare(right.joined_at),
      ),
    [members.data],
  );

  const categories = categoriesQuery.data ?? [];

  const updateField = <K extends keyof GeneralForm>(
    key: K,
    value: GeneralForm[K],
  ) => {
    setGeneral((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setDirty(true);
  };

  const saveGeneral = async () => {
    if (!general) {
      return;
    }
    const parsed = groupFormSchema.safeParse(general);
    if (!parsed.success) {
      const nextErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && key in general) {
          nextErrors[key as keyof GeneralForm] = t(issue.message);
        }
      }
      setErrors(nextErrors);
      return;
    }

    const budgetCents = parsed.data.budget
      ? parseMoneyToCents(parsed.data.budget)
      : null;

    if (parsed.data.budget && (budgetCents === null || budgetCents < 0)) {
      setErrors({ budget: t('validation.budgetInvalid') });
      return;
    }

    try {
      const updated = await updateGroup.mutateAsync({
        name: parsed.data.name,
        description: parsed.data.description || null,
        currency: parsed.data.currency,
        budget_cents:
          parsed.data.budgetPeriod === 'none' ? null : budgetCents,
        budget_period: parsed.data.budgetPeriod,
        timezone: parsed.data.timezone,
      });
      setGeneral(toForm(updated));
      setDirty(false);
      showToast(t('groups.settingsSaved'), 'success');
    } catch (error) {
      showToast(errorMessage(error, t, 'errors.saveFailed'), 'error');
    }
  };

  const rotateInviteCode = async () => {
    const confirmed = await confirm({
      title: t('groups.rotateConfirmTitle'),
      message: t('groups.rotateConfirmBody'),
      confirmLabel: t('groups.rotateAction'),
    });
    if (!confirmed) {
      return;
    }
    try {
      await rotateCode.mutateAsync();
      showToast(t('groups.codeRotated'), 'success');
    } catch (error) {
      showToast(errorMessage(error, t, 'errors.saveFailed'), 'error');
    }
  };

  const canManageMember = (member: GroupMemberWithProfile): boolean => {
    if (member.user_id === role.userId) {
      return false;
    }
    if (role.isOwner) {
      return member.role !== 'owner';
    }
    if (role.isAdmin) {
      return member.role === 'member';
    }
    return false;
  };

  const changeRole = async (member: GroupMemberWithProfile, nextRole: GroupRole) => {
    setSelectedMember(null);
    try {
      await updateMemberRole.mutateAsync({
        userId: member.user_id,
        role: nextRole === 'admin' ? 'admin' : 'member',
      });
      showToast(t('groups.roleUpdated'), 'success');
    } catch (error) {
      showToast(errorMessage(error, t), 'error');
    }
  };

  const askRemoveMember = async (member: GroupMemberWithProfile) => {
    setSelectedMember(null);
    const name = member.profile?.display_name ?? t('common.unknown');
    const confirmed = await confirm({
      title: t('groups.removeMemberTitle', { name }),
      message: t('groups.removeMemberBody'),
      confirmLabel: t('groups.removeMemberAction'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await removeMember.mutateAsync(member.user_id);
      showToast(t('groups.memberRemoved'), 'success');
    } catch (error) {
      showToast(errorMessage(error, t), 'error');
    }
  };

  const submitCategory = async (values: CategoryFormResult) => {
    try {
      if (categoryForm.category) {
        await updateCategory.mutateAsync({
          id: categoryForm.category.id,
          patch: {
            name: values.name,
            color: values.color,
            icon: values.icon,
            sort_order: categoryForm.category.sort_order,
          },
        });
        showToast(t('groups.categoryUpdated'), 'success');
      } else {
        const maxOrder = categories.reduce(
          (max, category) => Math.max(max, category.sort_order),
          -1,
        );
        await createCategory.mutateAsync({
          name: values.name,
          color: values.color,
          icon: values.icon,
          sortOrder: maxOrder + 1,
        });
        showToast(t('groups.categoryCreated'), 'success');
      }
      setCategoryForm({ open: false, category: null });
    } catch (error) {
      showToast(errorMessage(error, t), 'error');
    }
  };

  const askDeleteCategory = async (category: Category) => {
    const confirmed = await confirm({
      title: t('groups.deleteCategoryTitle'),
      message: t('groups.deleteCategoryBody'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteCategory.mutateAsync(category.id);
      showToast(t('groups.categoryDeleted'), 'success');
    } catch (error) {
      showToast(errorMessage(error, t), 'error');
    }
  };

  const askLeave = async () => {
    const confirmed = await confirm({
      title: t('groups.leaveConfirmTitle'),
      message: t('groups.leaveConfirmBody'),
      confirmLabel: t('groups.leaveAction'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await leaveGroup.mutateAsync(groupId);
      router.replace('/');
    } catch (error) {
      showToast(errorMessage(error, t), 'error');
    }
  };

  const askDeleteGroup = async () => {
    const confirmed = await confirm({
      title: t('groups.deleteConfirmTitle'),
      message: t('groups.deleteConfirmBody'),
      confirmLabel: t('groups.deleteAction'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteGroup.mutateAsync(groupId);
      router.replace('/');
    } catch (error) {
      showToast(errorMessage(error, t), 'error');
    }
  };

  if (!groupId) {
    return (
      <Screen>
        <Header onBack={() => router.replace('/')} />
        <ErrorState title={t('errors.notFound')} />
      </Screen>
    );
  }

  if (group.isPending) {
    return (
      <Screen>
        <Header
          title={t('groups.settingsTitle')}
          onBack={goBack}
        />
        <View className="p-4">
          <AppText variant="bodySmall" muted>
            {t('common.loading')}
          </AppText>
        </View>
      </Screen>
    );
  }

  if (group.isError || !group.data) {
    return (
      <Screen>
        <Header onBack={goBack} />
        <ErrorState
          title={t('errors.notFound')}
          message={t('errors.generic')}
          onRetry={() => void group.refetch()}
          retryLabel={t('common.retry')}
        />
      </Screen>
    );
  }

  const data = group.data;
  const canManageCategories = role.isOwner || role.isAdmin;

  return (
    <Screen scroll contentContainerClassName="pt-1">
      <Header
        title={t('groups.settingsTitle')}
        subtitle={data.name}
        onBack={goBack}
      />

      <View className="gap-6 pt-3">
        <Section title={t('groups.generalSection')}>
          {role.isOwner ? (
            general ? (
              <View className="gap-4">
                <Input
                  label={t('groups.nameLabel')}
                  value={general.name}
                  onChangeText={(value) => updateField('name', value)}
                  error={errors.name}
                />
                <Input
                  label={t('groups.descriptionLabel')}
                  value={general.description}
                  onChangeText={(value) => updateField('description', value)}
                  error={errors.description}
                  multiline
                />
                <Select
                  label={t('groups.currencyLabel')}
                  value={general.currency}
                  options={currencies}
                  onChange={(value) => updateField('currency', value)}
                  error={errors.currency}
                />
                <View className="gap-2">
                  <AppText variant="label" muted>
                    {t('groups.periodLabel')}
                  </AppText>
                  <SegmentedControl
                    value={general.budgetPeriod}
                    onChange={(value) => updateField('budgetPeriod', value)}
                    options={[
                      { value: 'none', label: t('groups.periodNone') },
                      { value: 'week', label: t('groups.periodWeek') },
                      { value: 'month', label: t('groups.periodMonth') },
                    ]}
                  />
                </View>
                {general.budgetPeriod !== 'none' ? (
                  <Input
                    label={t('groups.budgetFieldLabel')}
                    value={general.budget}
                    onChangeText={(value) => updateField('budget', value)}
                    keyboardType="decimal-pad"
                    error={errors.budget}
                  />
                ) : null}
                <Input
                  label={t('groups.timezoneLabel')}
                  value={general.timezone}
                  onChangeText={(value) => updateField('timezone', value)}
                  error={errors.timezone}
                  hint={t('groups.timezoneHint')}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button
                  title={t('groups.saveSettings')}
                  onPress={() => void saveGeneral()}
                  loading={updateGroup.isPending}
                  disabled={!dirty}
                  fullWidth
                />
              </View>
            ) : null
          ) : (
            <View className="gap-3">
              <InfoRow label={t('groups.nameLabel')} value={data.name} />
              {data.description ? (
                <InfoRow
                  label={t('groups.descriptionLabel')}
                  value={data.description}
                />
              ) : null}
              <InfoRow
                label={t('groups.currencyLabel')}
                value={data.currency}
              />
              <InfoRow
                label={t('groups.budgetLabel')}
                value={formatMoney(data.budget_cents, data.currency, locale)}
              />
              <InfoRow
                label={t('groups.periodLabel')}
                value={
                  data.budget_period === 'week'
                    ? t('groups.periodWeek')
                    : data.budget_period === 'month'
                      ? t('groups.periodMonth')
                      : t('groups.periodNone')
                }
              />
              <InfoRow
                label={t('groups.timezoneLabel')}
                value={data.timezone}
              />
            </View>
          )}
        </Section>

        <Section title={t('groups.inviteSection')}>
          <InviteCodeCard
            code={data.invite_code}
            canRotate={role.isOwner || role.isAdmin}
            rotating={rotateCode.isPending}
            onRotate={() => void rotateInviteCode()}
          />
        </Section>

        <Section title={t('groups.membersSection')}>
          {members.isPending ? (
            <AppText variant="bodySmall" muted>
              {t('common.loading')}
            </AppText>
          ) : (
            <View>
              {sortedMembers.map((member, index) => (
                <View key={member.user_id}>
                  {index > 0 ? <Divider /> : null}
                  <MemberRow
                    member={member}
                    isCurrentUser={member.user_id === role.userId}
                    canManage={canManageMember(member)}
                    onPress={() => setSelectedMember(member)}
                  />
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title={t('groups.categoriesSection')}>
          <View className="gap-2">
            {categories.length === 0 ? (
              <AppText variant="bodySmall" muted>
                {t('groups.noCategories')}
              </AppText>
            ) : (
              categories.map((category, index) => (
                <View key={category.id}>
                  {index > 0 ? <Divider /> : null}
                  <View className="min-h-[52px] flex-row items-center gap-3 py-2">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${category.color}33` }}
                    >
                      <CategoryIcon
                        name={category.icon}
                        size={18}
                        color={category.color}
                      />
                    </View>
                    <AppText variant="body" className="flex-1" numberOfLines={1}>
                      {category.name}
                    </AppText>
                    {canManageCategories ? (
                      <>
                        <IconButton
                          name="pencil-outline"
                          accessibilityLabel={t('groups.editCategory')}
                          onPress={() =>
                            setCategoryForm({ open: true, category })
                          }
                        />
                        <IconButton
                          name="trash-outline"
                          color={palette.danger}
                          accessibilityLabel={t('common.delete')}
                          onPress={() => void askDeleteCategory(category)}
                        />
                      </>
                    ) : null}
                  </View>
                </View>
              ))
            )}

            {canManageCategories ? (
              <Button
                title={t('groups.addCategory')}
                variant="secondary"
                icon="add"
                onPress={() =>
                  setCategoryForm({ open: true, category: null })
                }
              />
            ) : null}
          </View>
        </Section>

        <Section title={t('profile.account')}>
          {role.isOwner ? (
            <Button
              title={t('groups.deleteGroup')}
              variant="danger"
              icon="trash-outline"
              onPress={() => void askDeleteGroup()}
              fullWidth
            />
          ) : (
            <View className="gap-2">
              <Button
                title={t('groups.leaveGroup')}
                variant="danger"
                icon="exit-outline"
                onPress={() => void askLeave()}
                fullWidth
              />
              <AppText variant="caption" muted>
                {t('groups.leaveConfirmBody')}
              </AppText>
            </View>
          )}
        </Section>
      </View>

      <CategoryFormSheet
        visible={categoryForm.open}
        category={categoryForm.category}
        loading={createCategory.isPending || updateCategory.isPending}
        onClose={() => setCategoryForm({ open: false, category: null })}
        onSubmit={(values) => void submitCategory(values)}
      />

      <Sheet
        visible={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={selectedMember?.profile?.display_name ?? t('groups.memberActions')}
        scrollable={false}
        footer={
          selectedMember ? (
            <View className="gap-2">
              {role.isOwner && selectedMember.role !== 'owner' ? (
                <Button
                  title={
                    selectedMember.role === 'admin'
                      ? t('groups.makeMember')
                      : t('groups.makeAdmin')
                  }
                  variant="secondary"
                  onPress={() =>
                    void changeRole(
                      selectedMember,
                      selectedMember.role === 'admin' ? 'member' : 'admin',
                    )
                  }
                  fullWidth
                />
              ) : null}
              <Button
                title={t('groups.removeMemberAction')}
                variant="danger"
                onPress={() => void askRemoveMember(selectedMember)}
                fullWidth
              />
              <Button
                title={t('common.cancel')}
                variant="ghost"
                onPress={() => setSelectedMember(null)}
                fullWidth
              />
            </View>
          ) : null
        }
      >
        {selectedMember ? (
          <View className="gap-2">
            <AppText variant="bodySmall" muted>
              {t(roleLabelKey(selectedMember.role))}
            </AppText>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <AppText variant="label" muted>
        {title}
      </AppText>
      <Card className="gap-3">{children}</Card>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <AppText variant="bodySmall" muted>
        {label}
      </AppText>
      <AppText variant="bodySmall" className="flex-1 text-right">
        {value}
      </AppText>
    </View>
  );
}
