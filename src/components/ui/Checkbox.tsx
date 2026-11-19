import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';

export function Checkbox({
  checked,
  onPress,
  disabled = false,
  accessibilityLabel,
  size = 28,
}: {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  size?: number;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      className="h-11 w-11 items-center justify-center"
    >
      <View
        className="items-center justify-center rounded-full border-2"
        style={{
          width: size,
          height: size,
          borderColor: checked ? palette.accent : palette.muted,
          backgroundColor: checked ? palette.accent : 'transparent',
        }}
      >
        {checked ? (
          <Ionicons name="checkmark" size={size * 0.65} color={palette.accentContrast} />
        ) : null}
      </View>
    </Pressable>
  );
}
