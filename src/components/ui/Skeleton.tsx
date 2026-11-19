import { useEffect, useRef } from 'react';
import { Animated, Platform, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Skeleton({
  width,
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const { palette } = useTheme();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          opacity,
          backgroundColor: palette.surfaceAlt,
        },
        style,
      ]}
    />
  );
}

export function GroupCardSkeleton() {
  return (
    <View className="gap-3 rounded-lg border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
      <Skeleton width="55%" height={20} />
      <Skeleton width="80%" height={14} />
      <View className="flex-row gap-2">
        <Skeleton width={64} height={14} />
        <Skeleton width={64} height={14} />
      </View>
      <Skeleton height={8} radius={999} />
    </View>
  );
}

export function ItemRowSkeleton() {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Skeleton width={28} height={28} radius={999} />
      <View className="flex-1 gap-2">
        <Skeleton width="60%" height={16} />
        <Skeleton width="35%" height={12} />
      </View>
      <Skeleton width={56} height={16} />
    </View>
  );
}
