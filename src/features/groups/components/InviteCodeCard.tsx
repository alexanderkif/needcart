import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/components/ui/ToastProvider';
import { getInviteUrl } from '@/lib/app-url';
import { useTheme } from '@/theme/ThemeProvider';

export function InviteCodeCard({
  code,
  canRotate,
  rotating = false,
  onRotate,
}: {
  code: string;
  canRotate: boolean;
  rotating?: boolean;
  onRotate: () => void;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const displayCode = code.replace(/(.{4})/g, '$1 ').trim();

  const copy = async (value: string, successKey: string) => {
    try {
      await Clipboard.setStringAsync(value);
      showToast(t(successKey), 'success');
    } catch {
      showToast(t('errors.generic'), 'error');
    }
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <View
          className="flex-1 flex-row items-center justify-between gap-2 rounded-md border px-4 py-3"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surfaceAlt,
          }}
        >
          <AppText
            variant="title"
            style={{ letterSpacing: 2 }}
            selectable
            numberOfLines={1}
          >
            {displayCode}
          </AppText>
          <IconButton
            name="copy-outline"
            accessibilityLabel={t('groups.copyCode')}
            onPress={() => void copy(code, 'groups.codeCopied')}
          />
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button
          title={t('groups.copyLink')}
          variant="secondary"
          icon="link-outline"
          size="sm"
          onPress={() => void copy(getInviteUrl(code), 'groups.linkCopied')}
        />
        {canRotate ? (
          <Button
            title={t('groups.rotateCode')}
            variant="ghost"
            icon="refresh-outline"
            size="sm"
            loading={rotating}
            onPress={onRotate}
          />
        ) : null}
      </View>

      <View className="flex-row items-start gap-2">
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={palette.muted}
          style={{ marginTop: 1 }}
        />
        <AppText variant="caption" muted className="flex-1">
          {t('groups.inviteHint')}
        </AppText>
      </View>
    </View>
  );
}
