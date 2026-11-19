import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { ConfigNotice } from '@/components/ui/ConfigNotice';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/ToastProvider';
import { useSendMagicLink } from '@/features/auth/hooks';
import {
  getAuthRateLimitInfo,
  type AuthRateLimitReason,
} from '@/features/auth/rate-limit';
import { errorMessage } from '@/lib/errors';
import { emailSchema } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeProvider';

export default function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { palette } = useTheme();
  const { showToast } = useToast();
  const sendMagicLink = useSendMagicLink();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [rateLimitReason, setRateLimitReason] =
    useState<AuthRateLimitReason | null>(null);

  const isCoolingDown = cooldown > 0;
  const rateLimitText =
    rateLimitReason === 'perUser'
      ? t('errors.rateLimited', { seconds: cooldown })
      : rateLimitReason === 'projectEmail'
        ? t('errors.emailRateLimited')
        : rateLimitReason === 'request'
          ? t('errors.rateLimitedNoTime')
          : null;

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (cooldown === 0 && rateLimitReason) {
      setRateLimitReason(null);
    }
  }, [cooldown, rateLimitReason]);

  const openLegal = (path: 'privacy' | 'terms') => {
    void Linking.openURL(`https://needcart.app/${path}`).catch(() => undefined);
  };

  const submit = async () => {
    if (isCoolingDown) {
      return;
    }

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(t(parsed.error.issues[0]?.message ?? 'validation.emailInvalid'));
      return;
    }
    setError(null);

    try {
      await sendMagicLink.mutateAsync(parsed.data);
      router.push({
        pathname: '/check-email',
        params: { email: parsed.data },
      });
    } catch (err) {
      const limit = getAuthRateLimitInfo(err);
      if (limit) {
        setRateLimitReason(limit.reason);
        setCooldown(limit.retryAfterSeconds ?? 60);
        return;
      }
      showToast(errorMessage(err, t), 'error');
    }
  };

  return (
    <Screen scroll keyboard contentContainerClassName="pt-6 pb-10">
      <View className="flex-1 justify-center gap-8 py-6">
        <View className="items-start gap-4">
          <BrandLogo size={72} />
          <View className="gap-2">
            <AppText variant="display">{t('common.appName')}</AppText>
            <AppText variant="h2" className="max-w-[560px]">
              {t('auth.valuePropTitle')}
            </AppText>
            <AppText variant="body" muted className="max-w-[560px]">
              {t('auth.valuePropBody')}
            </AppText>
          </View>
        </View>

        <ConfigNotice />

        <View className="w-full max-w-[460px] gap-4">
          <View className="gap-1">
            <AppText variant="h2">{t('auth.signInTitle')}</AppText>
            <AppText variant="bodySmall" muted>
              {t('auth.signInBody')}
            </AppText>
          </View>

          <Input
            label={t('auth.emailLabel')}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
              if (rateLimitReason === 'perUser') {
                setRateLimitReason(null);
                setCooldown(0);
              }
            }}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
            error={rateLimitText ?? error}
            left={<Ionicons name="mail-outline" size={18} color={palette.muted} />}
          />

          <Button
            title={
              isCoolingDown
                ? t('auth.retryIn', { seconds: cooldown })
                : sendMagicLink.isPending
                  ? t('auth.sendingLink')
                  : t('auth.sendLink')
            }
            onPress={() => void submit()}
            loading={sendMagicLink.isPending}
            disabled={isCoolingDown}
            fullWidth
          />

          <AppText variant="caption" muted>
            {t('auth.privacyPrefix')}{' '}
            <Pressable
              accessibilityRole="link"
              onPress={() => openLegal('privacy')}
            >
              <AppText variant="caption" style={{ color: palette.accent }}>
                {t('auth.privacy')}
              </AppText>
            </Pressable>{' '}
            {t('auth.and')}{' '}
            <Pressable
              accessibilityRole="link"
              onPress={() => openLegal('terms')}
            >
              <AppText variant="caption" style={{ color: palette.accent }}>
                {t('auth.terms')}
              </AppText>
            </Pressable>
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
