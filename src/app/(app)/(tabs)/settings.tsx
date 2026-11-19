import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/DialogProvider';
import { ErrorState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useDeleteAccount,
  useRemoveAvatar,
  useUpdateProfile,
  useUploadAvatar,
} from '@/features/auth/hooks';
import { SUPPORTED_LOCALES } from '@/i18n';
import { OwnedGroupsError, errorMessage } from '@/lib/errors';
import { profileFormSchema } from '@/lib/validation';
import { accentPresets, getAccentContrast, type ThemeScheme } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { Locale, ThemeMode } from '@/types/database';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const {
    profile,
    user,
    isProfileLoading,
    profileError,
    refreshProfile,
    signOut,
  } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const deleteAccount = useDeleteAccount();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  const languageOptions = useMemo(
    () =>
      SUPPORTED_LOCALES.map((code) => ({
        value: code,
        label: t(`languages.${code}`),
      })),
    [t],
  );

  const themeOptions = useMemo(
    () => [
      { value: 'light' as ThemeMode, label: t('profile.themeLight') },
      { value: 'dark' as ThemeMode, label: t('profile.themeDark') },
      { value: 'system' as ThemeMode, label: t('profile.themeSystem') },
    ],
    [t],
  );

  if (isProfileLoading) {
    return <LoadingScreen />;
  }

  if (!profile || profileError) {
    return (
      <Screen>
        <Header title={t('profile.title')} />
        <ErrorState
          title={t('common.error')}
          message={t('errors.generic')}
          onRetry={() => void refreshProfile()}
          retryLabel={t('common.retry')}
        />
      </Screen>
    );
  }

  const saveName = async () => {
    const parsed = profileFormSchema.safeParse({ displayName: name });
    if (!parsed.success) {
      setNameError(
        t(parsed.error.issues[0]?.message ?? 'validation.displayNameRequired'),
      );
      return;
    }
    setNameError(null);
    try {
      await updateProfile.mutateAsync({ display_name: parsed.data.displayName });
      showToast(t('profile.nameUpdated'), 'success');
    } catch (error) {
      showToast(errorMessage(error, t, 'errors.saveFailed'), 'error');
    }
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset?.base64) {
        showToast(t('profile.uploadError'), 'error');
        return;
      }
      const mimeType = asset.mimeType ?? 'image/jpeg';
      await uploadAvatar.mutateAsync({
        base64: asset.base64,
        mimeType:
          mimeType === 'image/png' || mimeType === 'image/webp'
            ? mimeType
            : 'image/jpeg',
      });
      showToast(t('profile.avatarUpdated'), 'success');
    } catch (error) {
      showToast(errorMessage(error, t, 'profile.uploadError'), 'error');
    }
  };

  const askRemoveAvatar = async () => {
    const confirmed = await confirm({
      title: t('profile.removeAvatar'),
      confirmLabel: t('common.remove'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await removeAvatar.mutateAsync();
      showToast(t('profile.avatarRemoved'), 'success');
    } catch (error) {
      showToast(errorMessage(error, t, 'profile.uploadError'), 'error');
    }
  };

  const changeLanguage = async (locale: string) => {
    try {
      await updateProfile.mutateAsync({ locale: locale as Locale });
    } catch (error) {
      showToast(errorMessage(error, t, 'errors.saveFailed'), 'error');
    }
  };

  const changeTheme = async (theme: ThemeScheme | ThemeMode) => {
    try {
      await updateProfile.mutateAsync({ theme_mode: theme as ThemeMode });
    } catch (error) {
      showToast(errorMessage(error, t, 'errors.saveFailed'), 'error');
    }
  };

  const changeAccent = async (color: string) => {
    try {
      await updateProfile.mutateAsync({ accent_color: color });
    } catch (error) {
      showToast(errorMessage(error, t, 'errors.saveFailed'), 'error');
    }
  };

  const askSignOut = async () => {
    const confirmed = await confirm({
      title: t('profile.signOutConfirmTitle'),
      message: t('profile.signOutConfirmBody'),
      confirmLabel: t('profile.signOutAction'),
    });
    if (!confirmed) {
      return;
    }
    await signOut();
    router.replace('/sign-in');
  };

  const askDeleteAccount = async () => {
    const confirmed = await confirm({
      title: t('profile.deleteAccountTitle'),
      message: t('profile.deleteAccountBody'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteAccount.mutateAsync(false);
      router.replace('/sign-in');
    } catch (error) {
      if (error instanceof OwnedGroupsError) {
        const names = error.groups.map((group) => group.name).join('\n');
        const alsoDelete = await confirm({
          title: t('profile.deleteAccountOwned'),
          message: `${t('profile.deleteAccountOwnedBody')}\n\n${names}`,
          confirmLabel: t('profile.deleteOwnedAndAccount'),
          destructive: true,
        });
        if (!alsoDelete) {
          return;
        }
        try {
          await deleteAccount.mutateAsync(true);
          router.replace('/sign-in');
        } catch (secondError) {
          showToast(
            errorMessage(secondError, t, 'errors.deleteAccountFailed'),
            'error',
          );
        }
        return;
      }
      showToast(
        errorMessage(error, t, 'errors.deleteAccountFailed'),
        'error',
      );
    }
  };

  const openLegal = (path: 'privacy' | 'terms') => {
    void Linking.openURL(`https://needcart.app/${path}`).catch(() => undefined);
  };

  const currentName = profile.display_name;

  return (
    <Screen scroll contentContainerClassName="pt-1">
      <Header title={t('profile.title')} subtitle={user?.email ?? undefined} />

      <View className="gap-5 pt-3">
        <Card className="gap-4">
          <View className="flex-row items-center gap-4">
            <Avatar
              name={profile.display_name}
              uri={profile.avatar_url}
              size={72}
            />
            <View className="flex-1 gap-2">
              <AppText variant="bodySmall" muted>
                {t('profile.avatarHint')}
              </AppText>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  title={t('profile.changeAvatar')}
                  variant="secondary"
                  size="sm"
                  icon="image-outline"
                  onPress={() => void pickAvatar()}
                  loading={uploadAvatar.isPending}
                />
                {profile.avatar_url ? (
                  <Button
                    title={t('profile.removeAvatar')}
                    variant="ghost"
                    size="sm"
                    onPress={() => void askRemoveAvatar()}
                  />
                ) : null}
              </View>
            </View>
          </View>

          <Divider />

          <Input
            label={t('profile.nameLabel')}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setNameError(null);
            }}
            placeholder={t('profile.namePlaceholder')}
            error={nameError}
          />
          <Button
            title={t('common.save')}
            variant="secondary"
            onPress={() => void saveName()}
            loading={updateProfile.isPending}
            disabled={!name.trim() || name.trim() === currentName}
          />
        </Card>

        <Card className="gap-4">
          <Select
            label={t('profile.language')}
            value={profile.locale}
            options={languageOptions}
            onChange={(value) => void changeLanguage(value)}
            hint={t('profile.languageHint')}
          />

          <View className="gap-2">
            <AppText variant="label" muted>
              {t('profile.theme')}
            </AppText>
            <SegmentedControl
              value={profile.theme_mode}
              options={themeOptions}
              onChange={(value) => void changeTheme(value)}
            />
            <AppText variant="caption" muted>
              {t('profile.themeHint')}
            </AppText>
          </View>

          <View className="gap-2">
            <AppText variant="label" muted>
              {t('profile.accent')}
            </AppText>
            <View className="flex-row flex-wrap gap-3">
              {accentPresets.map((preset) => (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityLabel={preset.value}
                  accessibilityState={{
                    selected:
                      profile.accent_color.toLowerCase() ===
                      preset.value.toLowerCase(),
                  }}
                  onPress={() => void changeAccent(preset.value)}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: preset.value }}
                >
                  {profile.accent_color.toLowerCase() ===
                  preset.value.toLowerCase() ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={getAccentContrast(preset.value)}
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
            <AppText variant="caption" muted>
              {t('profile.accentHint')}
            </AppText>
          </View>
        </Card>

        <Card className="gap-2">
          <AppText variant="label" muted>
            {t('profile.account')}
          </AppText>
          {user?.email ? (
            <AppText variant="bodySmall" muted>
              {user.email}
            </AppText>
          ) : null}
          <Divider className="my-2" />
          <Button
            title={t('profile.signOut')}
            variant="secondary"
            icon="log-out-outline"
            onPress={() => void askSignOut()}
            fullWidth
          />
          <Button
            title={t('profile.deleteAccount')}
            variant="danger"
            icon="trash-outline"
            onPress={() => void askDeleteAccount()}
            loading={deleteAccount.isPending}
            fullWidth
          />
          <AppText variant="caption" muted>
            {t('profile.deleteAccountHint')}
          </AppText>
        </Card>

        <Card className="gap-1">
          <LegalRow
            label={t('profile.privacy')}
            onPress={() => openLegal('privacy')}
          />
          <Divider />
          <LegalRow
            label={t('profile.terms')}
            onPress={() => openLegal('terms')}
          />
          <Divider />
          <View className="flex-row items-center justify-between py-3">
            <AppText variant="bodySmall" muted>
              {t('common.version', {
                version: Constants.expoConfig?.version ?? '0.1.0',
              })}
            </AppText>
            <AppText variant="caption" muted>
              {t('common.appName')}
            </AppText>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function LegalRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      className="min-h-[48px] flex-row items-center justify-between gap-2 py-3 active:opacity-70"
    >
      <AppText variant="bodySmall">{label}</AppText>
      <Ionicons name="open-outline" size={16} color={palette.muted} />
    </Pressable>
  );
}
