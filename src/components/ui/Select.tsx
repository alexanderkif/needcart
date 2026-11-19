import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  hint,
  disabled = false,
  className,
}: {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <AppText variant="label" muted>
          {label}
        </AppText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={() => setOpen(true)}
        className={cn(
          'min-h-[48px] flex-row items-center gap-2 rounded-md border bg-surface px-4 py-3 outline-none dark:bg-surface-dark',
          error
            ? 'border-danger'
            : 'border-border dark:border-border-dark',
          disabled && 'opacity-50',
        )}
        style={
          focused
            ? {
                borderColor: error ? palette.danger : palette.accent,
                borderWidth: 2,
              }
            : undefined
        }
      >
        <AppText
          className="flex-1"
          style={selected ? undefined : { color: palette.muted }}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder ?? ''}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={palette.muted} />
      </Pressable>

      {error ? (
        <AppText variant="caption" style={{ color: palette.danger }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      ) : null}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        scrollable={options.length > 8}
      >
        <View className="gap-1">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="min-h-[48px] flex-row items-center gap-3 rounded-md px-2 py-2 active:bg-surface-alt dark:active:bg-surface-alt-dark"
              >
                <View className="flex-1">
                  <AppText
                    variant="body"
                    className={isSelected ? 'font-semibold' : undefined}
                  >
                    {option.label}
                  </AppText>
                  {option.description ? (
                    <AppText variant="caption" muted>
                      {option.description}
                    </AppText>
                  ) : null}
                </View>
                {isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={palette.accent}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}
