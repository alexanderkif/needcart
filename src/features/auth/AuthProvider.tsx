import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';

import { getProfile } from '@/features/auth/api';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  profileError: Error | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      lastUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
      setIsLoading(false);
      if (data.session) {
        void supabase.realtime.setAuth(data.session.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;

      // Never show one account's cached data after switching accounts or
      // losing the session.
      if (
        !nextUserId ||
        (lastUserId.current && lastUserId.current !== nextUserId)
      ) {
        queryClient.clear();
      }

      lastUserId.current = nextUserId;
      setSession(nextSession);
      setIsLoading(false);

      if (nextSession) {
        void supabase.realtime.setAuth(nextSession.access_token);
      }

      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId ?? 'anonymous'),
    queryFn: () => getProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
    retry: 1,
  });

  const refreshProfile = useCallback(async () => {
    if (userId) {
      await profileQuery.refetch();
    }
  }, [userId, profileQuery]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: profileQuery.data ?? null,
      isLoading,
      isProfileLoading: Boolean(userId) && profileQuery.isPending,
      profileError: (profileQuery.error as Error | null) ?? null,
      refreshProfile,
      signOut,
    }),
    [
      session,
      isLoading,
      profileQuery.data,
      profileQuery.isPending,
      profileQuery.error,
      refreshProfile,
      signOut,
      userId,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
