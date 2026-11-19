import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const { palette } = useTheme();

  return (
    <View
      className={cn(
        'flex-row rounded-md bg-surface-alt p-1 dark:bg-surface-alt-dark',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className="min-h-[40px] flex-1 items-center justify-center rounded-sm px-2"
            style={
              selected
                ? { backgroundColor: palette.surface }
                : undefined
            }
          >
            <AppText
              variant="bodySmall"
              className={cn('text-center', selected && 'font-semibold')}
              style={selected ? { color: palette.text } : { color: palette.muted }}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
