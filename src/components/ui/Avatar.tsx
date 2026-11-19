import { View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui/AppText';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

const AVATAR_COLORS = [
  '#E8A87C',
  '#A8C686',
  '#93B7E3',
  '#D9A5C7',
  '#E5C07B',
  '#8FCBc4',
  '#B9A7E0',
  '#E39A9A',
];

function hashName(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return hash;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  name,
  uri,
  size = 40,
  className,
  border = false,
}: {
  name: string | null | undefined;
  uri?: string | null;
  size?: number;
  className?: string;
  border?: boolean;
}) {
  const { palette } = useTheme();
  const label = name || '?';
  const background = AVATAR_COLORS[hashName(label) % AVATAR_COLORS.length];
  const fontSize = Math.max(11, Math.round(size * 0.38));

  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: background,
        borderWidth: border ? 2 : 0,
        borderColor: palette.surface,
      }}
      accessibilityLabel={name ?? undefined}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <AppText
          className="font-bold"
          style={{ color: '#3A2A00', fontSize }}
          numberOfLines={1}
        >
          {initialsOf(name)}
        </AppText>
      )}
    </View>
  );
}

export function MemberAvatars({
  members,
  max = 5,
  size = 28,
}: {
  members: { id: string; display_name: string; avatar_url: string | null }[];
  max?: number;
  size?: number;
}) {
  const visible = members.slice(0, max);
  const rest = members.length - visible.length;

  return (
    <View className="flex-row items-center">
      {visible.map((member, index) => (
        <View
          key={member.id}
          style={{ marginLeft: index === 0 ? 0 : -size * 0.3 }}
        >
          <Avatar
            name={member.display_name}
            uri={member.avatar_url}
            size={size}
            border
          />
        </View>
      ))}
      {rest > 0 ? (
        <View
          className="items-center justify-center rounded-full bg-surface-alt dark:bg-surface-alt-dark"
          style={{
            width: size,
            height: size,
            marginLeft: -size * 0.3,
          }}
        >
          <AppText variant="caption" className="font-semibold">
            +{rest}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
