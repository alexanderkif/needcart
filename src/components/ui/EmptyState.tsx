import type { ComponentProps, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function EmptyState({
  icon = 'cart-outline',
  title,
  body,
  actionLabel,
  onAction,
  children,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const { palette } = useTheme();

  return (
    <View className="items-center justify-center gap-3 px-6 py-12">
      <View
        className="h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: `${palette.accent}22` }}
      >
        <Ionicons name={icon} size={28} color={palette.accent} />
      </View>
      <AppText variant="title" className="text-center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="bodySmall" muted className="max-w-[420px] text-center">
          {body}
        </AppText>
      ) : null}
      {children}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          className="mt-2 min-w-[180px]"
        />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { palette } = useTheme();

  return (
    <View className="items-center justify-center gap-3 px-6 py-12">
      <Ionicons name="alert-circle-outline" size={36} color={palette.danger} />
      <AppText variant="title" className="text-center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodySmall" muted className="max-w-[420px] text-center">
          {message}
        </AppText>
      ) : null}
      {onRetry && retryLabel ? (
        <Button title={retryLabel} variant="secondary" onPress={onRetry} />
      ) : null}
    </View>
  );
}
