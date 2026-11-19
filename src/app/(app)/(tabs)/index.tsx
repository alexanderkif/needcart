import { useEffect, useRef } from 'react';
import { Pressable, RefreshControl, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { GroupCardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { GroupCard } from '@/features/groups/components/GroupCard';
import { useGroups } from '@/features/groups/hooks';
import { consumePendingJoinCode } from '@/features/groups/pending-invite';
import { useTheme } from '@/theme/ThemeProvider';

export default function GroupsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { palette } = useTheme();
  const { profile } = useAuth();
  const groups = useGroups();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const checkedPending = useRef(false);

  useEffect(() => {
    if (checkedPending.current) {
      return;
    }
    checkedPending.current = true;

    void consumePendingJoinCode().then((code) => {
      if (code) {
        router.push({ pathname: '/groups/join', params: { code } });
      }
    });
  }, [router]);

  const data = groups.data ?? [];

  return (
    <Screen
      scroll
      contentContainerClassName="pt-2"
      refreshControl={
        <RefreshControl
          refreshing={groups.isRefetching}
          onRefresh={() => void groups.refetch()}
          tintColor={palette.accent}
          colors={[palette.accent]}
        />
      }
    >
      <OfflineBanner />

      <View className="mb-5 flex-row items-start gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="caption" muted>
            {t('common.appName')}
          </AppText>
          <AppText variant="h1">
            {t('groups.greeting', {
              name: profile?.display_name?.split(/\s+/)[0] ?? t('common.you'),
            })}
          </AppText>
          <AppText variant="bodySmall" muted>
            {t('groups.subtitle')}
          </AppText>
        </View>
        {!isDesktop && profile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tabs.profile')}
            onPress={() => router.push('/settings')}
            className="active:opacity-80"
          >
            <Avatar
              name={profile.display_name}
              uri={profile.avatar_url}
              size={44}
            />
          </Pressable>
        ) : null}
      </View>

      <View className="mb-5 flex-row flex-wrap gap-2">
        <Button
          title={t('groups.create')}
          icon="add"
          onPress={() => router.push('/groups/new')}
        />
        <Button
          title={t('groups.join')}
          icon="key-outline"
          variant="secondary"
          onPress={() => router.push('/groups/join')}
        />
      </View>

      {groups.isPending ? (
        <View className="gap-3">
          <GroupCardSkeleton />
          <GroupCardSkeleton />
        </View>
      ) : groups.isError ? (
        <ErrorState
          title={t('common.error')}
          message={t('errors.generic')}
          onRetry={() => void groups.refetch()}
          retryLabel={t('common.retry')}
        />
      ) : data.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title={t('groups.emptyTitle')}
          body={t('groups.emptyBody')}
          actionLabel={t('groups.create')}
          onAction={() => router.push('/groups/new')}
        >
          <Button
            title={t('groups.join')}
            variant="secondary"
            onPress={() => router.push('/groups/join')}
          />
        </EmptyState>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {data.map((group) => (
            <View
              key={group.id}
              style={{ width: isDesktop ? '48.8%' : '100%' }}
            >
              <GroupCard
                group={group}
                onPress={() =>
                  router.push({
                    pathname: '/groups/[id]',
                    params: { id: group.id },
                  })
                }
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
