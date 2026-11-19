import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/ToastProvider';
import { useSendMagicLink } from '@/features/auth/hooks';
import {
  getAuthRateLimitInfo,
  type AuthRateLimitReason,
} from '@/features/auth/rate-limit';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme/ThemeProvider';

const RESEND_SECONDS = 60;

export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { palette } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const sendMagicLink = useSendMagicLink();
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [rateLimitReason, setRateLimitReason] =
    useState<AuthRateLimitReason | null>(null);

  const rateLimitText =
    rateLimitReason === 'perUser'
      ? t('errors.rateLimited', { seconds })
      : rateLimitReason === 'projectEmail'
        ? t('errors.emailRateLimited')
        : rateLimitReason === 'request'
          ? t('errors.rateLimitedNoTime')
          : null;

  useEffect(() => {
    if (!email) {
      router.replace('/sign-in');
      return;
    }
    const timer = setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [email, router]);

  useEffect(() => {
    if (seconds === 0 && rateLimitReason) {
      setRateLimitReason(null);
    }
  }, [seconds, rateLimitReason]);

  const resend = async () => {
    if (!email || seconds > 0) {
      return;
    }
    try {
      await sendMagicLink.mutateAsync(email);
      setRateLimitReason(null);
      setSeconds(RESEND_SECONDS);
      showToast(t('auth.linkSent'), 'success');
    } catch (err) {
      const limit = getAuthRateLimitInfo(err);
      if (limit) {
        setRateLimitReason(limit.reason);
        setSeconds(limit.retryAfterSeconds ?? RESEND_SECONDS);
        return;
      }
      showToast(errorMessage(err, t), 'error');
    }
  };

  return (
    <Screen scroll keyboard contentContainerClassName="justify-center">
      <View className="flex-1 items-center justify-center py-10">
        <Card className="w-full max-w-[480px] gap-5">
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${palette.accent}22` }}
          >
            <Ionicons name="mail-open-outline" size={26} color={palette.accent} />
          </View>

          <View className="gap-2">
            <AppText variant="h1">{t('auth.checkEmailTitle')}</AppText>
            <AppText variant="body">
              {t('auth.checkEmailBody', { email })}
            </AppText>
            <AppText variant="bodySmall" muted>
              {t('auth.checkEmailHint')}
            </AppText>
          </View>

          <View className="gap-2">
            <Button
              title={
                seconds > 0
                  ? t('auth.resendIn', { seconds })
                  : t('auth.resend')
              }
              variant="secondary"
              onPress={() => void resend()}
              loading={sendMagicLink.isPending}
              disabled={seconds > 0}
              fullWidth
            />
            {rateLimitText ? (
              <AppText variant="caption" style={{ color: palette.danger }}>
                {rateLimitText}
              </AppText>
            ) : null}
            <Button
              title={t('auth.changeEmail')}
              variant="ghost"
              onPress={() => router.replace('/sign-in')}
              fullWidth
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
