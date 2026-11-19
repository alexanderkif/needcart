import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { useLinkingURL } from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  completeAuthFromUrl,
  getCurrentAuthUrl,
} from '@/features/auth/deep-links';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

type CallbackState = 'working' | 'error';

const AUTH_PARAM_KEYS = [
  'code',
  'token_hash',
  'type',
  'access_token',
  'refresh_token',
  'error',
  'error_code',
  'error_description',
] as const;

function authUrlFromParams(
  params: Record<string, string | string[] | undefined>,
): string | null {
  const search = new URLSearchParams();

  for (const key of AUTH_PARAM_KEYS) {
    const value = params[key];
    if (typeof value === 'string' && value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : null;
}

export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { palette } = useTheme();
  const { refreshProfile } = useAuth();
  const params = useLocalSearchParams<
    Record<(typeof AUTH_PARAM_KEYS)[number], string | string[] | undefined>
  >();
  const url = useLinkingURL();
  const started = useRef(false);
  const [state, setState] = useState<CallbackState>('working');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) {
      return;
    }

    const run = async () => {
      try {
        if (!isSupabaseConfigured) {
          throw new Error('Supabase is not configured');
        }

        // Expo Router puts query parameters from the deep link on the route.
        // On a cold start this is more reliable than waiting for useURL().
        let authUrl = authUrlFromParams(params) ?? url;

        if (!authUrl && Platform.OS !== 'web') {
          authUrl = await Linking.getInitialURL();
        }

        if (!authUrl && Platform.OS === 'web' && typeof window !== 'undefined') {
          authUrl = window.location.href;
        }

        if (!authUrl) {
          throw new Error('Missing auth parameters');
        }

        started.current = true;
        await completeAuthFromUrl(getCurrentAuthUrl(authUrl));
        await refreshProfile();
        router.replace('/');
      } catch (error) {
        started.current = true;
        setErrorMessage(
          error instanceof Error ? error.message : String(error),
        );
        setState('error');
      }
    };

    void run();
  }, [params, refreshProfile, router, url]);

  if (state === 'working') {
    return <LoadingScreen label={t('auth.callbackTitle')} />;
  }

  return (
    <Screen scroll contentContainerClassName="justify-center">
      <View className="flex-1 items-center justify-center gap-4 py-10">
        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: `${palette.danger}22` }}
        >
          <AppText variant="h1" style={{ color: palette.danger }}>
            !
          </AppText>
        </View>
        <AppText variant="h1" className="text-center">
          {t('auth.callbackErrorTitle')}
        </AppText>
        <AppText variant="body" muted className="max-w-[420px] text-center">
          {t('auth.callbackErrorBody')}
        </AppText>
        {errorMessage ? (
          <AppText
            variant="caption"
            muted
            className="max-w-[420px] text-center"
          >
            {errorMessage}
          </AppText>
        ) : null}
        <Button
          title={t('auth.backToSignIn')}
          onPress={() => router.replace('/sign-in')}
        />
      </View>
    </Screen>
  );
}
