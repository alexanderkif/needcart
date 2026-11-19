import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/theme/ThemeProvider';
import type { GroupMemberWithProfile, GroupRole } from '@/types/database';

export function roleLabelKey(role: GroupRole): string {
  if (role === 'owner') {
    return 'groups.roleOwner';
  }
  if (role === 'admin') {
    return 'groups.roleAdmin';
  }
  return 'groups.roleMember';
}

export function MemberRow({
  member,
  isCurrentUser,
  canManage = false,
  onPress,
}: {
  member: GroupMemberWithProfile;
  isCurrentUser?: boolean;
  canManage?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const name = member.profile?.display_name ?? t('common.unknown');

  return (
    <Pressable
      accessibilityRole={canManage ? 'button' : undefined}
      accessibilityLabel={name}
      disabled={!canManage}
      onPress={onPress}
      className="min-h-[56px] flex-row items-center gap-3 py-2 active:opacity-70"
    >
      <Avatar
        name={name}
        uri={member.profile?.avatar_url}
        size={40}
      />
      <View className="flex-1">
        <AppText variant="body" className="font-medium" numberOfLines={1}>
          {name}
          {isCurrentUser ? ` · ${t('common.you')}` : ''}
        </AppText>
        <Badge label={t(roleLabelKey(member.role))} className="mt-1" />
      </View>
      {canManage ? (
        <Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />
      ) : null}
    </Pressable>
  );
}
