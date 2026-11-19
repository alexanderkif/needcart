import { useState, type ReactNode } from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  required?: boolean;
};

export function Input({
  label,
  hint,
  error,
  left,
  right,
  containerClassName,
  inputClassName,
  required,
  multiline,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? (
        <View className="flex-row items-center gap-1">
          <AppText variant="label" muted>
            {label}
          </AppText>
          {required ? (
            <AppText variant="caption" style={{ color: palette.danger }}>
              *
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View
        className={cn(
          'flex-row items-center rounded-md border bg-surface px-4 dark:bg-surface-dark',
          error
            ? 'border-danger'
            : focused
              ? 'border-accent dark:border-accent-dark'
              : 'border-border dark:border-border-dark',
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
        {left ? <View className="pr-2">{left}</View> : null}
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={palette.muted}
          selectionColor={palette.accent}
          className={cn(
            'min-h-[48px] flex-1 py-3 text-[16px] text-ink dark:text-ink-dark',
            multiline && 'min-h-[96px]',
            inputClassName,
          )}
          style={multiline ? { textAlignVertical: 'top' } : undefined}
        />
        {right ? <View className="pl-2">{right}</View> : null}
      </View>

      {error ? (
        <AppText variant="caption" style={{ color: palette.danger }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
