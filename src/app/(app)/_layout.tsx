import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="groups/new" />
      <Stack.Screen name="groups/join" />
      <Stack.Screen name="groups/[id]/index" />
      <Stack.Screen name="groups/[id]/settings" />
      <Stack.Screen name="items/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="items/[id]/index" />
      <Stack.Screen name="items/[id]/edit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
