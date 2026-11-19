import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/DialogProvider';
import { ErrorState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/ToastProvider';
import { useCategories } from '@/features/categories/hooks';
import { useItem, useItemPurchases, useDeleteItem, usePurchaseItem, useReorderItem } from '@/features/items/hooks';
import {
  useGroupMembers,
  useGroupOverview,
  useGroupRealtime,
  useGroupRole,
} from '@/features/groups/hooks';
import { PurchaseSheet } from '@/features/purchases/components/PurchaseSheet';
import { useLocale } from '@/i18n';
import {
  getItemLineTotalCents,
  parseQuantityMultiplier,
} from '@/features/items/utils';
import { formatDateTime } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { useGoBack } from '@/lib/use-go-back';
import { useTheme } from '@/theme/ThemeProvider';

export default function ItemDetailScreen() {
  const { t } = useTranslation();
  const locale = useLocale();
  const router = useRouter();
  const { palette } = useTheme();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ id?: string }>();
  const itemId = typeof params.id === 'string' ? params.id : undefined;
  const itemQuery = useItem(itemId);
  const groupId = itemQuery.data?.group_id;
  const goBack = useGoBack(
    groupId ? { pathname: '/groups/[id]', params: { id: groupId } } : '/',
  );
  const overview = useGroupOverview(groupId);
  const categories = useCategories(groupId);
  const members = useGroupMembers(groupId);
  const role = useGroupRole(groupId);
  const purchases = useItemPurchases(itemId);
  const purchaseItem = usePurchaseItem(groupId ?? '');
  const reorderItem = useReorderItem(groupId ?? '');
  const deleteItem = useDeleteItem(groupId ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  useGroupRealtime(groupId);

  const memberNames = useMemo(
    () =>
      new Map(
        (members.data ?? []).map((member) => [
          member.user_id,
          member.profile?.display_name ?? null,
        ]),
      ),
    [members.data],
  );

  if (!itemId) {
    return <ErrorState title={t('errors.notFound')} />;
  }

  if (itemQuery.isPending) {
    return <LoadingScreen />;
  }

  if (itemQuery.isError || !itemQuery.data || itemQuery.data.deleted_at) {
    return (
      <Screen>
        <Header onBack={goBack} />
        <ErrorState
          title={t('errors.notFound')}
          message={t('errors.generic')}
          onRetry={() => void itemQuery.refetch()}
          retryLabel={t('common.retry')}
        />
      </Screen>
    );
  }

  const item = itemQuery.data;
  const currency = overview.data?.currency ?? 'USD';
  const quantityMultiplier = parseQuantityMultiplier(item.quantity);
  const lineTotalCents = getItemLineTotalCents(item);
  const category = (categories.data ?? []).find(
    (entry) => entry.id === item.category_id,
  );
  const canEdit =
    role.isAdmin || (item.created_by === role.userId && !item.is_checked);
  const mode = item.is_checked ? 'reorder' : 'purchase';
  const checkedByName = item.checked_by
    ? memberNames.get(item.checked_by)
    : null;
  const createdByName = item.created_by
    ? memberNames.get(item.created_by)
    : null;

  const handleConfirm = async (values: {
    quantity: string;
    priceCents: number | null;
  }) => {
    try {
      if (item.is_checked) {
        await reorderItem.mutateAsync({
          itemId: item.id,
          quantity: values.quantity,
          priceCents: values.priceCents,
        });
        showToast(t('items.reorderSuccess'), 'success');
      } else {
        await purchaseItem.mutateAsync({
          itemId: item.id,
          quantity: values.quantity,
          priceCents: values.priceCents,
        });
        showToast(t('items.purchaseSuccess'), 'success');
      }
      setSheetOpen(false);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    } catch (error) {
      showToast(
        errorMessage(
          error,
          t,
          item.is_checked ? 'errors.reorderFailed' : 'errors.purchaseFailed',
        ),
        'error',
      );
    }
  };

  const askDelete = async () => {
    const confirmed = await confirm({
      title: t('items.deleteTitle'),
      message: t('items.deleteBody'),
      confirmLabel: t('items.deleteAction'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteItem.mutateAsync(item.id);
      showToast(t('items.deleted'), 'success');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({
          pathname: '/groups/[id]',
          params: { id: item.group_id },
        });
      }
    } catch (error) {
      showToast(errorMessage(error, t, 'items.deleteFailed'), 'error');
    }
  };

  return (
    <Screen scroll contentContainerClassName="pt-1">
      <Header
        title={t('items.detailsTitle')}
        onBack={goBack}
        right={
          canEdit ? (
            <View className="flex-row">
              <IconButton
                name="pencil-outline"
                accessibilityLabel={t('common.edit')}
                onPress={() =>
                  router.push({
                    pathname: '/items/[id]/edit',
                    params: { id: item.id },
                  })
                }
              />
              <IconButton
                name="trash-outline"
                color={palette.danger}
                accessibilityLabel={t('common.delete')}
                onPress={() => void askDelete()}
              />
            </View>
          ) : undefined
        }
      />

      <View className="gap-4 pt-2">
        <Card className="gap-3">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-1">
              <AppText variant="h1">{item.name}</AppText>
              <Badge
                label={
                  item.is_checked
                    ? t('items.filterPurchased')
                    : t('items.filterActive')
                }
                tone={item.is_checked ? 'success' : 'accent'}
              />
            </View>
            <View className="items-end gap-0.5">
              <AppText variant="h2">
                {formatMoney(lineTotalCents, currency, locale)}
              </AppText>
              {quantityMultiplier > 1 ? (
                <AppText variant="caption" muted>
                  {item.quantity} ×{' '}
                  {formatMoney(item.price_cents, currency, locale)}
                </AppText>
              ) : null}
            </View>
          </View>

          {item.description ? (
            <AppText variant="body" muted>
              {item.description}
            </AppText>
          ) : null}

          <Divider />

          <InfoRow label={t('items.quantityLabel')} value={item.quantity} />
          {quantityMultiplier > 1 ? (
            <InfoRow
              label={t('items.totalLabel')}
              value={formatMoney(lineTotalCents, currency, locale)}
            />
          ) : null}
          <InfoRow
            label={t('items.categoryLabel')}
            value={category?.name ?? t('items.uncategorized')}
          />
          <InfoRow
            label={t('items.addedBy', {
              name: createdByName || t('common.unknown'),
            })}
            value={formatDateTime(item.created_at, locale)}
          />
          {item.is_checked && item.checked_at ? (
            <InfoRow
              label={t('items.checkedBy', {
                name: checkedByName || t('common.unknown'),
              })}
              value={formatDateTime(item.checked_at, locale)}
            />
          ) : null}
        </Card>

        <Button
          title={
            item.is_checked ? t('items.reorderTitle') : t('items.purchaseTitle')
          }
          icon={item.is_checked ? 'refresh-outline' : 'checkmark-circle-outline'}
          variant={item.is_checked ? 'secondary' : 'primary'}
          onPress={() => setSheetOpen(true)}
          fullWidth
        />

        <Card className="gap-3">
          <AppText variant="h2">{t('items.historyTitle')}</AppText>
          {purchases.isPending ? (
            <AppText variant="bodySmall" muted>
              {t('common.loading')}
            </AppText>
          ) : purchases.isError ? (
            <AppText variant="bodySmall" muted>
              {t('common.error')}
            </AppText>
          ) : (purchases.data ?? []).length === 0 ? (
            <AppText variant="bodySmall" muted>
              {t('items.historyEmpty')}
            </AppText>
          ) : (
            (purchases.data ?? []).map((purchase, index) => (
              <View
                key={purchase.id}
                className={
                  index > 0
                    ? 'gap-1 border-t border-border pt-3 dark:border-border-dark'
                    : 'gap-1'
                }
              >
                <View className="flex-row items-start justify-between gap-3">
                  <AppText variant="bodySmall" className="font-medium">
                    {formatDateTime(purchase.purchased_at, locale)}
                  </AppText>
                  <AppText variant="bodySmall" className="font-semibold">
                    {formatMoney(purchase.price_cents, currency, locale)}
                  </AppText>
                </View>
                <AppText variant="caption" muted>
                  {t('items.quantityShort')}: {purchase.quantity}
                </AppText>
                <AppText variant="caption" muted>
                  {t('items.orderedBy', {
                    name: purchase.ordered_by_name || t('common.unknown'),
                  })}{' '}
                  ·{' '}
                  {t('items.purchasedBy', {
                    name: purchase.purchased_by_name || t('common.unknown'),
                  })}
                </AppText>
              </View>
            ))
          )}
        </Card>
      </View>

      <PurchaseSheet
        visible={sheetOpen}
        item={item}
        mode={mode}
        currency={currency}
        loading={purchaseItem.isPending || reorderItem.isPending}
        onClose={() => setSheetOpen(false)}
        onConfirm={(values) => void handleConfirm(values)}
      />
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <AppText variant="bodySmall" muted className="flex-1">
        {label}
      </AppText>
      <AppText variant="bodySmall" className="flex-1 text-right">
        {value}
      </AppText>
    </View>
  );
}
