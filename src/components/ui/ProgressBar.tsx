import { useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/lib/cn';

export function ProgressBar({
  ratio,
  tone = 'accent',
  height = 8,
  className,
}: {
  ratio: number;
  tone?: 'accent' | 'danger' | 'success';
  height?: number;
  className?: string;
}) {
  const { palette } = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const color =
    tone === 'danger'
      ? palette.danger
      : tone === 'success'
        ? palette.success
        : palette.accent;

  return (
    <View
      className={cn(
        'w-full overflow-hidden rounded-full bg-surface-alt dark:bg-surface-alt-dark',
        className,
      )}
      style={{ height }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View
        className="h-full rounded-full"
        style={{ width: `${clamped * 100}%`, backgroundColor: color }}
      />
    </View>
  );
}

export function useResponsiveWidth() {
  const { width } = useWindowDimensions();
  return {
    width,
    isDesktop: width >= 900,
    isCompact: width < 380,
  };
}

export function Spacer({ size = 16 }: { size?: number }) {
  return <View style={{ height: size }} />;
}
