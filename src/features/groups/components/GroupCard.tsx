import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BudgetSummaryCard } from '@/features/budget/components/BudgetSummaryCard';
import { useTheme } from '@/theme/ThemeProvider';
import type { GroupOverview } from '@/types/database';

export function GroupCard({
  group,
  onPress,
}: {
  group: GroupOverview;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={group.name}
      onPress={onPress}
      className="gap-3 rounded-lg border border-border bg-surface p-4 active:opacity-90 dark:border-border-dark dark:bg-surface-dark"
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="title" numberOfLines={1}>
            {group.name}
          </AppText>
          {group.description ? (
            <AppText variant="bodySmall" muted numberOfLines={2}>
              {group.description}
            </AppText>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={palette.muted}
          style={{ marginTop: 4 }}
        />
      </View>

      <View className="flex-row flex-wrap items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="people-outline" size={16} color={palette.muted} />
          <AppText variant="caption" muted>
            {t('groups.membersLabel')}: {group.member_count}
          </AppText>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="cart-outline" size={16} color={palette.muted} />
          <AppText variant="caption" muted>
            {t('groups.activeItemsLabel')}: {group.active_items_count}
          </AppText>
        </View>
      </View>

      <BudgetSummaryCard group={group} />
    </Pressable>
  );
}
