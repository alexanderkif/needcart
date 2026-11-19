import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { useIsOnline } from '@/lib/network';
import { useTheme } from '@/theme/ThemeProvider';

export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const { palette } = useTheme();

  if (online) {
    return null;
  }

  return (
    <View
      className="mx-4 mb-2 flex-row items-center gap-2 rounded-md px-3 py-2"
      style={{ backgroundColor: `${palette.danger}18` }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={palette.danger} />
      <AppText variant="caption" style={{ color: palette.danger }} className="flex-1">
        {t('common.noConnectionTitle')}
      </AppText>
    </View>
  );
}
