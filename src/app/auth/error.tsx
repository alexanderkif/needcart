import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';

export default function AuthErrorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ reason?: string }>();

  return (
    <Screen scroll contentContainerClassName="justify-center">
      <View className="flex-1 items-center justify-center gap-4 py-10">
        <View
          className="h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${palette.danger}22` }}
        >
          <AppText variant="display" style={{ color: palette.danger }}>
            !
          </AppText>
        </View>
        <AppText variant="h1" className="text-center">
          {t('auth.errorTitle')}
        </AppText>
        <AppText variant="body" muted className="max-w-[460px] text-center">
          {t('auth.errorBody')}
        </AppText>
        {typeof params.reason === 'string' && params.reason ? (
          <AppText variant="caption" muted className="max-w-[460px] text-center">
            {params.reason}
          </AppText>
        ) : null}
        <AppText variant="bodySmall" muted className="max-w-[460px] text-center">
          {t('auth.errorHint')}
        </AppText>
        <Button
          title={t('auth.backToSignIn')}
          onPress={() => router.replace('/sign-in')}
        />
      </View>
    </Screen>
  );
}
