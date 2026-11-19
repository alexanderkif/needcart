import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

export type ParsedAuthUrl = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenHash: string | null;
  type: string | null;
  error: string | null;
  errorDescription: string | null;
};

function readParams(part: string): URLSearchParams {
  return new URLSearchParams(part.startsWith('?') ? part.slice(1) : part);
}

export function parseAuthUrl(url: string): ParsedAuthUrl {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  const query =
    queryIndex >= 0
      ? readParams(
          url.slice(
            queryIndex + 1,
            hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : undefined,
          ),
        )
      : new URLSearchParams();

  const hash =
    hashIndex >= 0 ? readParams(url.slice(hashIndex)) : new URLSearchParams();

  const pick = (key: string): string | null =>
    hash.get(key) ?? query.get(key) ?? null;

  return {
    code: pick('code'),
    accessToken: pick('access_token'),
    refreshToken: pick('refresh_token'),
    tokenHash: pick('token_hash'),
    type: pick('type'),
    error: pick('error') ?? pick('error_code'),
    errorDescription: pick('error_description'),
  };
}

export async function completeAuthFromUrl(url: string): Promise<void> {
  const parsed = parseAuthUrl(url);

  if (parsed.error) {
    throw new Error(
      parsed.errorDescription ?? parsed.error ?? 'Authorization failed',
    );
  }

  if (parsed.accessToken && parsed.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: parsed.accessToken,
      refresh_token: parsed.refreshToken,
    });
    if (error) {
      throw error;
    }
    return;
  }

  if (parsed.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
    if (error) {
      throw error;
    }
    return;
  }

  if (parsed.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: parsed.tokenHash,
      type: (parsed.type ?? 'magiclink') as
        | 'magiclink'
        | 'signup'
        | 'recovery'
        | 'invite'
        | 'email'
        | 'email_change',
    });
    if (error) {
      throw error;
    }
    return;
  }

  throw new Error('Missing auth parameters');
}

export function getCurrentAuthUrl(fallbackUrl: string | null): string {
  if (fallbackUrl) {
    return fallbackUrl;
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.href;
  }
  return Linking.createURL('/auth/callback');
}
