import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export function getAppBaseUrl(): string {
  // On web, the current origin is always the canonical callback host. This
  // keeps magic links on the deployed Vercel domain even if EXPO_PUBLIC_APP_URL
  // is missing or still points to localhost.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }

  const configured = process.env.EXPO_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  return Linking.createURL('/').replace(/\/+$/, '');
}

export function getAuthCallbackUrl(): string {
  return `${getAppBaseUrl()}/auth/callback`;
}

export function getInviteUrl(code: string): string {
  return `${getAppBaseUrl()}/join/${encodeURIComponent(code)}`;
}
