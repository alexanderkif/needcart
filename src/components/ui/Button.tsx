import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  textClassName?: string;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className,
  textClassName,
  onPress,
  ...rest
}: ButtonProps) {
  const { palette } = useTheme();
  const isDisabled = disabled || loading;

  const containerClasses = cn(
    'flex-row items-center justify-center gap-2 rounded-md',
    size === 'sm' ? 'min-h-[40px] px-3 py-2' : 'min-h-[48px] px-4 py-3',
    variant === 'secondary' &&
      'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark',
    variant === 'ghost' && 'bg-transparent',
    variant === 'danger' && 'bg-danger',
    fullWidth && 'w-full',
    isDisabled && 'opacity-50',
    className,
  );

  const textColor =
    variant === 'primary'
      ? palette.accentContrast
      : variant === 'danger'
        ? '#FFFFFF'
        : variant === 'secondary'
          ? palette.text
          : palette.muted;

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={cn(containerClasses, 'active:opacity-80')}
      style={
        variant === 'primary'
          ? { backgroundColor: palette.accent }
          : undefined
      }
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={textColor} />
      ) : null}
      <AppText
        className={cn('font-semibold', textClassName)}
        style={{ color: textColor }}
        numberOfLines={1}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View className="flex-row gap-2">{children}</View>;
}
