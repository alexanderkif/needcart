import { Slot, Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, View, useWindowDimensions } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

const DESKTOP_BREAKPOINT = 900;
const TAB_ICON_SIZE = 32;

export default function TabsLayout() {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  if (isDesktop) {
    return <DesktopShell />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarShowLabel: false,
        tabBarIconStyle: { width: TAB_ICON_SIZE, height: '100%' },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.lists'),
          tabBarAccessibilityLabel: t('tabs.lists'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'cart' : 'cart-outline'}
              size={TAB_ICON_SIZE}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={TAB_ICON_SIZE}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function DesktopShell() {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const items = [
    { href: '/', label: t('tabs.lists'), icon: 'cart-outline' as const },
    { href: '/settings', label: t('tabs.profile'), icon: 'person-outline' as const },
  ];

  return (
    <SafeAreaView
      style={{ backgroundColor: palette.background }}
      className="flex-1 flex-row"
    >
      <View className="w-[240px] border-r border-border bg-surface px-3 py-4 dark:border-border-dark dark:bg-surface-dark">
        <View className="mb-6 flex-row items-center gap-2 px-2">
          <BrandLogo size={36} />
          <AppText variant="title">{t('common.appName')}</AppText>
        </View>

        <View className="gap-1">
          {items.map((item) => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Pressable
                key={item.href}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                onPress={() => router.push(item.href as never)}
                className="min-h-[44px] flex-row items-center gap-3 rounded-md px-3"
                style={{
                  backgroundColor: active ? `${palette.accent}1F` : 'transparent',
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? palette.accent : palette.muted}
                />
                <AppText
                  variant="bodySmall"
                  className={active ? 'font-semibold' : undefined}
                  style={{ color: active ? palette.text : palette.muted }}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-auto flex-row items-center gap-3 rounded-md px-2 py-2">
          <Avatar
            name={profile?.display_name}
            uri={profile?.avatar_url}
            size={36}
          />
          <View className="flex-1">
            <AppText variant="bodySmall" className="font-medium" numberOfLines={1}>
              {profile?.display_name ?? t('common.unknown')}
            </AppText>
          </View>
        </View>
      </View>

      <View className="flex-1">
        <Slot />
      </View>
    </SafeAreaView>
  );
}
