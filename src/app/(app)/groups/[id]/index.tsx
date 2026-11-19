import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { ItemRowSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/ToastProvider';
import { BudgetSheet } from '@/features/budget/components/BudgetSheet';
import { getBudgetSummary } from '@/features/budget/summary';
import { CategoryFilterChips, ItemFilterTabs, SearchField } from '@/features/items/components/Filters';
import { ItemRow } from '@/features/items/components/ItemRow';
import { useCategories } from '@/features/categories/hooks';
import { MemberRow } from '@/features/groups/components/MemberRow';
import { useGroupOverview, useGroupMembers, useGroupRealtime, useGroupRole } from '@/features/groups/hooks';
import { useItems, usePurchaseItem, useReorderItem } from '@/features/items/hooks';
import {
  buildItemSections,
  filterItems,
  getPlannedTotalCents,
  withCategory,
  type ItemFilter,
} from '@/features/items/utils';
import { PurchaseSheet } from '@/features/purchases/components/PurchaseSheet';
import { useLocale } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatAmount, formatMoney } from '@/lib/money';
import { useGoBack } from '@/lib/use-go-back';
import { useTheme } from '@/theme/ThemeProvider';
import type { ItemWithCategory } from '@/types/database';

export default function GroupScreen() {
  const { t } = useTranslation();
  const locale = useLocale();
  const router = useRouter();
  const goBack = useGoBack('/');
  const { palette } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const groupId = typeof params.id === 'string' ? params.id : undefined;

  const group = useGroupOverview(groupId);
  const members = useGroupMembers(groupId);
  const categoriesQuery = useCategories(groupId);
  const itemsQuery = useItems(groupId);
  const role = useGroupRole(groupId);
  const purchaseItem = usePurchaseItem(groupId ?? '');
  const reorderItem = useReorderItem(groupId ?? '');
  useGroupRealtime(groupId);

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showPurchased, setShowPurchased] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<ItemWithCategory | null>(null);
  const sheetMode = sheetItem?.is_checked ? ('reorder' as const) : ('purchase' as const);

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );

  const items = useMemo(
    () => withCategory(itemsQuery.data ?? [], categories),
    [itemsQuery.data, categories],
  );

  const plannedCents = useMemo(
    () =>
      itemsQuery.data
        ? getPlannedTotalCents(items)
        : Number(group.data?.planned_cents) || 0,
    [items, itemsQuery.data, group.data?.planned_cents],
  );

  const filteredItems = useMemo(
    () => filterItems(items, { filter, search, categoryId }),
    [items, filter, search, categoryId],
  );

  const sections = useMemo(
    () =>
      buildItemSections(filteredItems, categories, {
        filter,
        boughtTitle: t('items.boughtSection', {
          count: filteredItems.filter((item) => item.is_checked).length,
        }),
        uncategorizedTitle: t('items.uncategorized'),
      }),
    [filteredItems, categories, filter, t],
  );

  const visibleSections = useMemo(
    () =>
      sections.filter(
        (section) => !section.purchased || showPurchased || filter === 'purchased',
      ),
    [sections, showPurchased, filter],
  );

  const memberById = useMemo(
    () =>
      new Map(
        (members.data ?? []).map((member) => [member.user_id, member]),
      ),
    [members.data],
  );

  const memberProfiles = useMemo(
    () =>
      (members.data ?? [])
        .map((member) => member.profile)
        .filter(
          (
            profile,
          ): profile is {
            id: string;
            display_name: string;
            avatar_url: string | null;
          } => Boolean(profile),
        ),
    [members.data],
  );

  const refreshAll = useCallback(() => {
    void Promise.all([
      group.refetch(),
      members.refetch(),
      categoriesQuery.refetch(),
      itemsQuery.refetch(),
    ]);
  }, [group, members, categoriesQuery, itemsQuery]);

  const closeSheet = () => setSheetItem(null);

  const toggleSearch = () => {
    if (searchOpen) {
      setSearch('');
    }
    setSearchOpen((open) => !open);
  };

  const openSettings = () => {
    if (groupId) {
      router.push({
        pathname: '/groups/[id]/settings',
        params: { id: groupId },
      });
    }
  };

  const handlePurchase = async (values: {
    quantity: string;
    priceCents: number | null;
  }) => {
    if (!sheetItem) {
      return;
    }
    try {
      if (sheetItem.is_checked) {
        await reorderItem.mutateAsync({
          itemId: sheetItem.id,
          quantity: values.quantity,
          priceCents: values.priceCents,
        });
        showToast(t('items.reorderSuccess'), 'success');
      } else {
        await purchaseItem.mutateAsync({
          itemId: sheetItem.id,
          quantity: values.quantity,
          priceCents: values.priceCents,
        });
        showToast(t('items.purchaseSuccess'), 'success');
      }
      setSheetItem(null);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    } catch (error) {
      showToast(
        errorMessage(
          error,
          t,
          sheetItem.is_checked ? 'errors.reorderFailed' : 'errors.purchaseFailed',
        ),
        'error',
      );
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
      <Screen contentContainerClassName="flex-1">
        <Header onBack={goBack} />
        <View className="gap-3 p-4">
          <ItemRowSkeleton />
          <ItemRowSkeleton />
          <ItemRowSkeleton />
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

  const overview = group.data;
  const overviewWithPlanned = { ...overview, planned_cents: plannedCents };
  const summary = getBudgetSummary(overviewWithPlanned);
  const firstMember = memberProfiles[0] ?? null;
  const selectedCategory =
    categories.find((category) => category.id === categoryId) ?? null;
  const hasActiveFilters = filter !== 'all' || Boolean(categoryId);
  const plannedTotalLabel = formatAmount(summary.plannedCents, locale);
  const plannedTotalAccessibilityLabel = `${t('budget.planned')}: ${formatMoney(
    summary.plannedCents,
    overview.currency,
    locale,
  )}`;

  const emptyState = itemsQuery.isPending ? (
    <View className="gap-1">
      <ItemRowSkeleton />
      <ItemRowSkeleton />
      <ItemRowSkeleton />
    </View>
  ) : (
    <EmptyState
      icon={items.length === 0 ? 'cart-outline' : 'search-outline'}
      title={
        items.length === 0
          ? t('items.emptyTitle')
          : filter === 'active'
            ? t('items.emptyTitle')
            : t('items.emptyFiltered')
      }
      body={
        items.length === 0
          ? t('items.emptyBody')
          : filter === 'active' && items.every((item) => item.is_checked)
            ? t('items.noActive')
            : t('items.emptyFiltered')
      }
      actionLabel={items.length === 0 ? t('items.addAction') : undefined}
      onAction={
        items.length === 0
          ? () =>
              router.push({
                pathname: '/items/new',
                params: { groupId },
              })
          : undefined
      }
    />
  );

  return (
    <Screen contentContainerClassName="flex-1">
      <Header
        title={overview.name}
        subtitle={plannedTotalLabel}
        subtitlePill
        subtitlePlacement="inline"
        subtitleAccessibilityLabel={plannedTotalAccessibilityLabel}
        onSubtitlePress={() => setBudgetOpen(true)}
        onBack={goBack}
        right={
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('groups.membersSection')}
              onPress={() => setMembersOpen(true)}
              className="h-11 flex-row items-center gap-1 px-1 active:opacity-70"
            >
              {firstMember ? (
                <Avatar
                  name={firstMember.display_name}
                  uri={firstMember.avatar_url}
                  size={24}
                />
              ) : (
                <Ionicons name="people-outline" size={20} color={palette.text} />
              )}
              <AppText variant="caption" className="font-semibold">
                {overview.member_count}
              </AppText>
            </Pressable>
            <IconButton
              name="options-outline"
              badge={hasActiveFilters}
              accessibilityLabel={t('common.filters')}
              onPress={() => setFilterOpen(true)}
            />
            <IconButton
              name={searchOpen ? 'close' : 'search-outline'}
              accessibilityLabel={
                searchOpen ? t('common.close') : t('common.search')
              }
              onPress={toggleSearch}
            />
            <IconButton
              name="settings-outline"
              accessibilityLabel={t('groups.settingsTitle')}
              onPress={openSettings}
            />
          </View>
        }
      />

      {summary.hasBudget ? (
        <View className="px-4 pb-1">
          <ProgressBar
            ratio={summary.ratio}
            tone={summary.overBudget ? 'danger' : 'accent'}
            height={3}
          />
        </View>
      ) : null}

      <OfflineBanner />

      {searchOpen ? (
        <View className="flex-row items-center gap-2 px-4 pt-2">
          <View className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('items.searchPlaceholder')}
              autoFocus
            />
          </View>
          <IconButton
            name="close"
            accessibilityLabel={t('common.close')}
            onPress={toggleSearch}
          />
        </View>
      ) : null}

      {hasActiveFilters ? (
        <View className="flex-row flex-wrap gap-2 px-4 pt-2">
          {filter !== 'all' ? (
            <ActiveFilterChip
              label={
                filter === 'active'
                  ? t('items.filterActive')
                  : t('items.filterPurchased')
              }
              onClear={() => setFilter('all')}
            />
          ) : null}
          {selectedCategory ? (
            <ActiveFilterChip
              label={selectedCategory.name}
              color={selectedCategory.color}
              onClear={() => setCategoryId(null)}
            />
          ) : null}
        </View>
      ) : null}

      <SectionList
        sections={visibleSections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={itemsQuery.isRefetching || group.isRefetching}
            onRefresh={refreshAll}
            tintColor={palette.accent}
            colors={[palette.accent]}
          />
        }
        renderSectionHeader={({ section }) => {
          const isPurchased = section.purchased;
          return (
            <View
              style={{ backgroundColor: palette.background }}
              className="px-4 pb-1 pt-2"
            >
              <Pressable
                accessibilityRole={isPurchased ? 'button' : undefined}
                accessibilityState={
                  isPurchased ? { expanded: showPurchased } : undefined
                }
                disabled={!isPurchased || filter === 'purchased'}
                onPress={() => setShowPurchased((current) => !current)}
                className="flex-row items-center gap-2"
              >
                {section.color ? (
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                ) : null}
                <AppText variant="label" muted>
                  {section.title}
                </AppText>
                <View className="flex-1" />
                {isPurchased ? (
                  <Ionicons
                    name={showPurchased ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={palette.muted}
                  />
                ) : null}
              </Pressable>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <View className="px-4">
            <ItemRow
              item={item}
              currency={overview.currency}
              checkedByName={
                item.checked_by
                  ? memberById.get(item.checked_by)?.profile?.display_name
                  : null
              }
              onOpen={() =>
                router.push({ pathname: '/items/[id]', params: { id: item.id } })
              }
              onToggle={() => setSheetItem(item)}
            />
          </View>
        )}
        ListEmptyComponent={<View>{emptyState}</View>}
      />

      <FloatingActionButton
        accessibilityLabel={t('items.addAction')}
        label={t('items.addAction')}
        onPress={() =>
          router.push({
            pathname: '/items/new',
            params: {
              groupId,
              ...(categoryId ? { categoryId } : {}),
            },
          })
        }
      />

      <PurchaseSheet
        visible={Boolean(sheetItem)}
        item={sheetItem}
        mode={sheetMode}
        currency={overview.currency}
        loading={purchaseItem.isPending || reorderItem.isPending}
        onClose={closeSheet}
        onConfirm={(values) => void handlePurchase(values)}
      />

      <BudgetSheet
        visible={budgetOpen}
        group={overviewWithPlanned}
        onClose={() => setBudgetOpen(false)}
        onOpenSettings={
          role.isOwner
            ? () => {
                setBudgetOpen(false);
                openSettings();
              }
            : undefined
        }
      />

      <Sheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={t('common.filters')}
        footer={
          <Button
            title={t('common.done')}
            onPress={() => setFilterOpen(false)}
            fullWidth
          />
        }
      >
        <View className="gap-4">
          <View className="gap-2">
            <AppText variant="label" muted>
              {t('items.statusLabel')}
            </AppText>
            <ItemFilterTabs value={filter} onChange={setFilter} />
          </View>
          {categories.length > 0 ? (
            <View className="gap-2">
              <AppText variant="label" muted>
                {t('items.categoryLabel')}
              </AppText>
              <CategoryFilterChips
                categories={categories}
                selected={categoryId}
                onSelect={setCategoryId}
              />
            </View>
          ) : null}
          {hasActiveFilters ? (
            <Button
              title={t('common.clear')}
              variant="ghost"
              onPress={() => {
                setFilter('all');
                setCategoryId(null);
              }}
            />
          ) : null}
        </View>
      </Sheet>

      <Sheet
        visible={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={t('groups.membersSection')}
      >
        {members.isPending ? (
          <AppText variant="bodySmall" muted>
            {t('common.loading')}
          </AppText>
        ) : (
          <View>
            {(members.data ?? []).map((member, index) => (
              <View key={member.user_id}>
                {index > 0 ? <Divider /> : null}
                <MemberRow
                  member={member}
                  isCurrentUser={member.user_id === role.userId}
                />
              </View>
            ))}
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function ActiveFilterChip({
  label,
  color,
  onClear,
}: {
  label: string;
  color?: string;
  onClear: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onClear}
      hitSlop={6}
      className="min-h-[32px] flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 active:opacity-70"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      {color ? (
        <View
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <AppText variant="caption" numberOfLines={1}>
        {label}
      </AppText>
      <Ionicons name="close" size={13} color={palette.muted} />
    </Pressable>
  );
}
