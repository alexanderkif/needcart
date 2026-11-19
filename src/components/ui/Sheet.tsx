import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { isWeb } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  className?: string;
};

export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  scrollable = true,
  className,
}: SheetProps) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const animation = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const dialog = isWeb && width >= 640;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(animation, {
        toValue: 1,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
      return;
    }

    // Do not leave a closed modal mounted if the animation never runs (for
    // example a backgrounded web tab where requestAnimationFrame is paused).
    const fallback = setTimeout(() => setMounted(false), 260);
    Animated.timing(animation, {
      toValue: 0,
      duration: 140,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });

    return () => clearTimeout(fallback);
  }, [visible, animation]);

  if (!mounted) {
    return null;
  }

  const content = (
    <Animated.View
      style={{
        width: '100%',
        maxWidth: dialog ? 520 : undefined,
        opacity: animation,
        maxHeight: dialog ? Math.min(height - 64, 720) : height * 0.9,
        transform: dialog
          ? [
              {
                scale: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ]
          : [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
      }}
    >
      <View
        className={cn(
          'w-full border border-border bg-surface dark:border-border-dark dark:bg-surface-dark',
          dialog ? 'rounded-xl p-6' : 'rounded-t-xl px-5 pt-4',
          className,
        )}
        style={[
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderWidth: 1,
            flexShrink: 1,
            overflow: 'hidden',
          },
          !dialog && { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {dialog ? (
        <>
          {title ? (
            <View className="mb-1 flex-row items-start gap-2">
              <View className="flex-1">
                <AppText variant="h2">{title}</AppText>
                {description ? (
                  <AppText variant="bodySmall" muted className="mt-1">
                    {description}
                  </AppText>
                ) : null}
              </View>
              <IconButton
                name="close"
                accessibilityLabel={t('common.close')}
                onPress={onClose}
              />
            </View>
          ) : null}
          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              className="mt-4"
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {children}
            </ScrollView>
          ) : (
            <View className="mt-4">{children}</View>
          )}
          {footer ? <View className="mt-5">{footer}</View> : null}
        </>
      ) : (
        <>
          <View className="mb-4 flex-row items-center">
            <View className="w-10 items-center">
              <View
                className="h-1 w-10 rounded-full"
                style={{ backgroundColor: palette.border }}
              />
            </View>
            <View className="flex-1" />
            <IconButton
              name="close"
              accessibilityLabel={t('common.close')}
              onPress={onClose}
            />
          </View>
          {title ? (
            <AppText variant="h2" className="mb-1">
              {title}
            </AppText>
          ) : null}
          {description ? (
            <AppText variant="bodySmall" muted className="mb-3">
              {description}
            </AppText>
          ) : null}
          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
          {footer ? <View className="mt-5">{footer}</View> : null}
        </>
      )}
      </View>
    </Animated.View>
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        <Pressable
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          className="absolute inset-0 bg-black/50"
        />
        <View
          pointerEvents="box-none"
          className={cn(
            'flex-1 p-4',
            dialog ? 'items-center justify-center' : 'justify-end p-0',
          )}
        >
          {content}
        </View>
      </View>
    </Modal>
  );
}
