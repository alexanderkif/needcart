import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Checkbox } from '@/components/ui/Checkbox';
import { parseQuantityMultiplier } from '@/features/items/utils';
import { useLocale } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { ItemWithCategory } from '@/types/database';

export function ItemRow({
  item,
  currency,
  onOpen,
  onToggle,
  checkedByName,
}: {
  item: ItemWithCategory;
  currency: string;
  onOpen: () => void;
  onToggle: () => void;
  checkedByName?: string | null;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { palette } = useTheme();
  const quantityMultiplier = parseQuantityMultiplier(item.quantity);
  const showQuantityBadge = quantityMultiplier > 1;

  return (
    <View className="flex-row items-start border-b border-border dark:border-border-dark">
      <View className="pt-1">
        <Checkbox
          checked={item.is_checked}
          onPress={onToggle}
          accessibilityLabel={item.name}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        onPress={onOpen}
        className="min-h-[52px] flex-1 flex-row items-start gap-3 py-3 pr-3 active:opacity-70"
      >
        <View className="flex-1 gap-1">
          <AppText
            variant="body"
            className={item.is_checked ? 'font-medium' : 'font-semibold'}
            style={
              item.is_checked
                ? {
                    textDecorationLine: 'line-through',
                    color: palette.muted,
                  }
                : undefined
            }
            numberOfLines={2}
          >
            {item.name}
          </AppText>

          <View className="flex-row flex-wrap items-center gap-2">
            {!showQuantityBadge && item.quantity.trim() !== '1' ? (
              <AppText variant="caption" muted>
                {item.quantity}
              </AppText>
            ) : null}
            {item.category ? (
              <View className="flex-row items-center gap-1">
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.category.color }}
                />
                <AppText variant="caption" muted>
                  {item.category.name}
                </AppText>
              </View>
            ) : null}
            {item.is_checked ? (
              <AppText variant="caption" muted numberOfLines={1}>
                {t('items.checkedBy', {
                  name: checkedByName || t('items.unknownBuyer'),
                })}
              </AppText>
            ) : null}
            {item.is_checked && item.checked_at ? (
              <AppText variant="caption" muted>
                {formatDate(item.checked_at, locale, {
                  day: 'numeric',
                  month: 'short',
                })}
              </AppText>
            ) : null}
          </View>

          {item.description ? (
            <AppText variant="caption" muted numberOfLines={2}>
              {item.description}
            </AppText>
          ) : null}
        </View>

        <View className="items-end gap-1">
          <View className="flex-row items-center justify-end gap-1.5">
            {showQuantityBadge ? (
              <View
                className="max-w-[96px] rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: item.is_checked
                    ? `${palette.muted}1F`
                    : `${palette.accent}24`,
                }}
              >
                <AppText
                  variant="bodySmall"
                  className="font-semibold"
                  numberOfLines={1}
                  style={item.is_checked ? { color: palette.muted } : undefined}
                >
                  {item.quantity} ×
                </AppText>
              </View>
            ) : null}
            <AppText
              variant="bodySmall"
              className="font-semibold"
              numberOfLines={1}
              style={item.is_checked ? { color: palette.muted } : undefined}
            >
              {item.price_cents === null
                ? t('items.priceNotSet')
                : formatMoney(item.price_cents, currency, locale)}
            </AppText>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
