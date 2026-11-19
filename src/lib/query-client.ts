import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (status) => {
      handleFocus(status === 'active');
    });

    return () => subscription.remove();
  });

  onlineManager.setEventListener((setOnline) => {
    let mounted = true;

    void Network.getNetworkStateAsync().then((state) => {
      if (mounted) {
        setOnline(
          state.isConnected !== false && state.isInternetReachable !== false,
        );
      }
    });

    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      );
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error) => {
        if (isClientError(error)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

function isClientError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const status = (error as { status?: number }).status;
  const code = (error as { code?: string }).code;
  return (
    (typeof status === 'number' && status >= 400 && status < 500) ||
    code === 'PGRST116' ||
    code === 'P0002' ||
    code === '42501' ||
    code === '28000'
  );
}
