import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export function FloatingActionButton({
  onPress,
  label,
  accessibilityLabel,
}: {
  onPress: () => void;
  label?: string;
  accessibilityLabel: string;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="absolute right-5 min-h-[56px] flex-row items-center gap-2 rounded-full px-4 active:opacity-80"
      style={{
        bottom: insets.bottom + 20,
        backgroundColor: palette.accent,
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Ionicons name="add" size={26} color={palette.accentContrast} />
      {label ? (
        <AppText
          className="font-semibold"
          style={{ color: palette.accentContrast }}
        >
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}
