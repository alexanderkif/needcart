import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/ToastProvider';
import { useJoinGroup } from '@/features/groups/hooks';
import { classifyError } from '@/lib/errors';
import { useGoBack } from '@/lib/use-go-back';
import { inviteCodeSchema } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeProvider';

function cleanCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

export default function JoinGroupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const goBack = useGoBack('/');
  const { palette } = useTheme();
  const { showToast } = useToast();
  const joinGroup = useJoinGroup();
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode =
    typeof params.code === 'string' ? cleanCode(params.code) : '';
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const paste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setCode(cleanCode(text));
      setError(null);
    } catch {
      // Ignore clipboard errors.
    }
  };

  const submit = async () => {
    const parsed = inviteCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(t('validation.inviteCodeInvalid'));
      return;
    }
    setError(null);

    try {
      const groupId = await joinGroup.mutateAsync(parsed.data);
      showToast(t('groups.joined'), 'success');
      router.replace({ pathname: '/groups/[id]', params: { id: groupId } });
    } catch (joinError) {
      const kind = classifyError(joinError);
      if (kind === 'invalidCode' || kind === 'notFound') {
        setError(t('groups.invalidCodeBody'));
      } else {
        showToast(t('errors.joinFailed'), 'error');
      }
    }
  };

  return (
    <Screen scroll keyboard contentContainerClassName="pt-1">
      <Header
        title={t('groups.joinTitle')}
        subtitle={t('groups.joinSubtitle')}
        onBack={goBack}
      />

      <View className="gap-4 pt-4">
        <Input
          label={t('groups.inviteCodeLabel')}
          value={code}
          onChangeText={(value) => {
            setCode(cleanCode(value));
            setError(null);
          }}
          placeholder={t('groups.inviteCodePlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus={!code}
          maxLength={12}
          error={error}
          hint={t('groups.joinHint')}
          inputClassName="text-[18px] tracking-[3px]"
          right={
            <Button
              title={t('groups.paste')}
              variant="ghost"
              size="sm"
              onPress={() => void paste()}
            />
          }
        />

        <Button
          title={
            joinGroup.isPending
              ? t('groups.joining')
              : t('groups.joinAction')
          }
          onPress={() => void submit()}
          loading={joinGroup.isPending}
          fullWidth
        />

        <View
          className="flex-row items-start gap-2 rounded-md p-3"
          style={{ backgroundColor: `${palette.accent}14` }}
        >
          <AppText variant="caption" muted className="flex-1">
            {t('groups.inviteHint')}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
