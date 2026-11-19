import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type RefreshControlProps,
} from 'react-native';
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

export function Screen({
  children,
  scroll = false,
  keyboard = false,
  className,
  contentContainerClassName,
  refreshControl,
  edges = ['top', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  className?: string;
  contentContainerClassName?: string;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  edges?: Edge[];
}) {
  const { palette } = useTheme();
  const body = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <View
        className={cn(
          'w-full max-w-[960px] grow self-center px-4 pb-24',
          contentContainerClassName,
        )}
      >
        {children}
      </View>
    </ScrollView>
  ) : (
    <View
      className={cn(
        'w-full max-w-[960px] flex-1 self-center',
        contentContainerClassName,
      )}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={{ backgroundColor: palette.background }}
      className={cn('flex-1', className)}
    >
      {keyboard ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn(
        'w-full max-w-[960px] self-center px-4',
        className,
      )}
    >
      {children}
    </View>
  );
}
