import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export function LoadingScreen({ label }: { label?: string }) {
  const { t } = useTranslation();
  const { palette } = useTheme();

  return (
    <View
      className="flex-1 items-center justify-center gap-3 px-6"
      style={{ backgroundColor: palette.background }}
    >
      <ActivityIndicator size="large" color={palette.accent} />
      <AppText variant="bodySmall" muted>
        {label ?? t('common.loading')}
      </AppText>
    </View>
  );
}
