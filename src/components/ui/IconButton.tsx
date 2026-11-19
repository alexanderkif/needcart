import type { ComponentProps } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  name: IconName;
  size?: number;
  color?: string;
  variant?: 'ghost' | 'surface';
  badge?: boolean;
  className?: string;
  accessibilityLabel: string;
};

export function IconButton({
  name,
  size = 22,
  color,
  variant = 'ghost',
  badge = false,
  className,
  accessibilityLabel,
  onPress,
  ...rest
}: IconButtonProps) {
  const { palette } = useTheme();

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      className={cn(
        'relative h-11 w-11 items-center justify-center rounded-full active:opacity-70',
        variant === 'surface' &&
          'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark',
        className,
      )}
    >
      <Ionicons name={name} size={size} color={color ?? palette.text} />
      {badge ? (
        <View
          className="absolute right-[9px] top-[8px] h-2 w-2 rounded-full"
          style={{ backgroundColor: palette.accent }}
        />
      ) : null}
    </Pressable>
  );
}
