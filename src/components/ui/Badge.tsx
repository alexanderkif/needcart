import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

export function Badge({
  label,
  tone = 'muted',
  className,
}: {
  label: string;
  tone?: 'muted' | 'accent' | 'success' | 'danger';
  className?: string;
}) {
  const { palette } = useTheme();

  const color =
    tone === 'accent'
      ? palette.accent
      : tone === 'success'
        ? palette.success
        : tone === 'danger'
          ? palette.danger
          : palette.muted;

  return (
    <View
      className={cn(
        'self-start rounded-full px-2.5 py-1',
        className,
      )}
      style={{ backgroundColor: `${color}22` }}
    >
      <AppText
        variant="caption"
        className="font-semibold"
        style={{ color }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}
