import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

export function ConfigNotice() {
  const { t } = useTranslation();
  const { palette } = useTheme();

  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <Card className="gap-2 border-danger/40 bg-danger/10">
      <View className="flex-row items-center gap-2">
        <Ionicons name="construct-outline" size={18} color={palette.danger} />
        <AppText variant="title" style={{ color: palette.danger }}>
          {t('common.configTitle')}
        </AppText>
      </View>
      <AppText variant="bodySmall" muted>
        {t('common.configBody')}
      </AppText>
    </Card>
  );
}
