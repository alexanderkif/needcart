import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { ItemFilter } from '@/features/items/utils';
import { useTheme } from '@/theme/ThemeProvider';
import type { Category } from '@/types/database';

export function ItemFilterTabs({
  value,
  onChange,
}: {
  value: ItemFilter;
  onChange: (value: ItemFilter) => void;
}) {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={[
        { value: 'all', label: t('items.filterAll') },
        { value: 'active', label: t('items.filterActive') },
        { value: 'purchased', label: t('items.filterPurchased') },
      ]}
    />
  );
}

export function CategoryFilterChips({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: selected === null }}
        onPress={() => onSelect(null)}
        className="min-h-[36px] flex-row items-center gap-1.5 rounded-full border px-3"
        style={{
          borderColor: selected === null ? palette.accent : palette.border,
          backgroundColor:
            selected === null ? `${palette.accent}22` : palette.surface,
        }}
      >
        <Ionicons name="apps-outline" size={14} color={palette.muted} />
        <AppText variant="caption" className="font-medium">
          {t('items.filterAll')}
        </AppText>
      </Pressable>

      {categories.map((category) => {
        const isSelected = selected === category.id;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(isSelected ? null : category.id)}
            className="min-h-[36px] flex-row items-center gap-1.5 rounded-full border px-3"
            style={{
              borderColor: isSelected ? category.color : palette.border,
              backgroundColor: isSelected
                ? `${category.color}22`
                : palette.surface,
            }}
          >
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <AppText variant="caption" numberOfLines={1}>
              {category.name}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();

  return (
    <Input
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      left={<Ionicons name="search" size={18} color={palette.muted} />}
      right={
        value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.clear')}
            onPress={() => onChange('')}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Pressable>
        ) : null
      }
    />
  );
}
