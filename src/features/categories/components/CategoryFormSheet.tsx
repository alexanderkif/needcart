import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from '@/features/categories/defaults';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { categoryFormSchema } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeProvider';
import type { Category } from '@/types/database';

export type CategoryFormResult = {
  name: string;
  color: string;
  icon: string;
};

export function CategoryFormSheet({
  visible,
  category,
  loading = false,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  category?: Category | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormResult) => void;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0] as string);
  const [icon, setIcon] = useState('pricetag');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setName(category?.name ?? '');
    setColor(category?.color ?? (CATEGORY_COLORS[0] as string));
    setIcon(category?.icon ?? 'pricetag');
    setError(null);
  }, [visible, category]);

  const submit = () => {
    const parsed = categoryFormSchema.safeParse({ name, color, icon });
    if (!parsed.success) {
      setError(t(parsed.error.issues[0]?.message ?? 'validation.invalid'));
      return;
    }
    setError(null);
    onSubmit({
      name: parsed.data.name,
      color: parsed.data.color,
      icon: parsed.data.icon,
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={category ? t('groups.editCategory') : t('groups.addCategory')}
      scrollable={false}
      footer={
        <View className="gap-2">
          {error ? (
            <AppText variant="caption" style={{ color: palette.danger }}>
              {error}
            </AppText>
          ) : null}
          <View className="flex-row gap-2">
            <Button
              title={t('common.cancel')}
              variant="secondary"
              className="flex-1"
              onPress={onClose}
              disabled={loading}
            />
            <Button
              title={t('common.save')}
              className="flex-1"
              onPress={submit}
              loading={loading}
            />
          </View>
        </View>
      }
    >
      <View className="gap-4">
        <View className="flex-row items-center gap-3">
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}33` }}
          >
            <CategoryIcon name={icon} size={22} color={color} />
          </View>
          <View className="flex-1">
            <Input
              label={t('groups.categoryName')}
              value={name}
              onChangeText={setName}
              placeholder={t('groups.categoryName')}
              autoFocus
            />
          </View>
        </View>

        <View className="gap-2">
          <AppText variant="label" muted>
            {t('groups.categoryColor')}
          </AppText>
          <View className="flex-row flex-wrap gap-3">
            {CATEGORY_COLORS.map((preset) => (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityLabel={preset}
                accessibilityState={{ selected: color === preset }}
                onPress={() => setColor(preset)}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: preset }}
              >
                {color === preset ? (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={preset === '#F5B301' ? '#3A2A00' : '#FFFFFF'}
                  />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <AppText variant="label" muted>
            {t('groups.categoryIcon')}
          </AppText>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORY_ICONS.map((preset) => (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityLabel={preset}
                accessibilityState={{ selected: icon === preset }}
                onPress={() => setIcon(preset)}
                className="h-11 w-11 items-center justify-center rounded-md border"
                style={{
                  borderColor:
                    icon === preset ? palette.accent : palette.border,
                  backgroundColor:
                    icon === preset ? `${palette.accent}22` : palette.surface,
                }}
              >
                <CategoryIcon
                  name={preset}
                  size={20}
                  color={icon === preset ? palette.accent : palette.muted}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Sheet>
  );
}
