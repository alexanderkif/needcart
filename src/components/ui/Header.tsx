import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/theme/ThemeProvider';

export function Header({
  title,
  subtitle,
  onSubtitlePress,
  subtitleAccessibilityLabel,
  subtitlePill = false,
  subtitlePlacement = 'below',
  onBack,
  right,
  className,
}: {
  title?: string;
  subtitle?: string;
  onSubtitlePress?: () => void;
  subtitleAccessibilityLabel?: string;
  subtitlePill?: boolean;
  subtitlePlacement?: 'below' | 'inline';
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();

  const titleNode = title ? (
    <AppText
      variant="title"
      numberOfLines={1}
      className={subtitlePlacement === 'inline' ? 'min-w-0 shrink' : undefined}
    >
      {title}
    </AppText>
  ) : null;

  const subtitleContent = subtitle ? (
    <AppText
      variant={subtitlePill ? 'body' : 'caption'}
      muted={!subtitlePill}
      numberOfLines={1}
      className={subtitlePill ? 'font-semibold' : 'shrink'}
    >
      {subtitle}
    </AppText>
  ) : null;

  const subtitleNode = subtitle ? (
    onSubtitlePress ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={subtitleAccessibilityLabel ?? subtitle}
        onPress={onSubtitlePress}
        hitSlop={8}
        className={
          subtitlePill
            ? `shrink-0 flex-row items-center gap-1 rounded-full border border-border px-2.5 py-1 active:opacity-70 dark:border-border-dark ${
                subtitlePlacement === 'inline'
                  ? 'self-center'
                  : 'mt-0.5 self-start'
              }`
            : 'flex-row items-center gap-1 active:opacity-70'
        }
        style={
          subtitlePill
            ? {
                backgroundColor: `${palette.accent}1F`,
                borderColor: `${palette.accent}3D`,
              }
            : undefined
        }
      >
        {subtitleContent}
        <Ionicons
          name="chevron-down"
          size={subtitlePill ? 14 : 12}
          color={subtitlePill ? palette.text : palette.muted}
        />
      </Pressable>
    ) : (
      subtitleContent
    )
  ) : null;

  return (
    <View
      className={`min-h-[56px] flex-row items-center gap-2 px-2 py-1 ${className ?? ''}`}
    >
      {onBack ? (
        <IconButton
          name="arrow-back"
          accessibilityLabel={t('common.back')}
          onPress={onBack}
        />
      ) : (
        <View className="w-2" />
      )}
      <View className="flex-1">
        {subtitlePlacement === 'inline' ? (
          <View className="flex-row items-center gap-2">
            {titleNode}
            {subtitleNode}
          </View>
        ) : (
          <>
            {titleNode}
            {subtitleNode}
          </>
        )}
      </View>
      {right ?? <View className="w-2" />}
    </View>
  );
}
