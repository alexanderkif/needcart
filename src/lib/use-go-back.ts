import { useRouter, type Href } from 'expo-router';

/**
 * Router.back() emits a dev error and does nothing when a screen was opened
 * directly (for example after a web refresh). Always provide a sensible
 * fallback route.
 */
export function useGoBack(fallback: Href = '/') {
  const router = useRouter();

  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  };
}
