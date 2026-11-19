import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuth } from '@/features/auth/AuthProvider';
import { setPendingJoinCode } from '@/features/groups/pending-invite';

export default function JoinLinkScreen() {
  const router = useRouter();
  const { isLoading, session } = useAuth();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!code) {
      router.replace('/');
      return;
    }

    if (session) {
      router.replace({ pathname: '/groups/join', params: { code } });
      return;
    }

    let active = true;
    void setPendingJoinCode(code).then(() => {
      if (active) {
        router.replace('/sign-in');
      }
    });

    return () => {
      active = false;
    };
  }, [code, isLoading, router, session]);

  return <LoadingScreen />;
}
