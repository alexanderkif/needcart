import { decode as decodeBase64 } from 'base64-arraybuffer';

import { getAuthCallbackUrl } from '@/lib/app-url';
import { OwnedGroupsError, type OwnedGroup } from '@/lib/errors';
import { getDeviceLocale } from '@/lib/locale';
import { supabase } from '@/lib/supabase';
import type { Locale, Profile, ThemeMode } from '@/types/database';

const AVATAR_BUCKET = 'needcart-avatars';

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: getAuthCallbackUrl(),
      shouldCreateUser: true,
      // The database trigger uses this for the initial profile locale, so a
      // first-time user lands in their device language instead of English.
      data: { locale: getDeviceLocale() },
    },
  });

  if (error) {
    throw error;
  }
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!error) {
    return data;
  }

  // The trigger covers new auth users. In a database that already had auth
  // accounts before this schema was installed, or after a trigger issue, the
  // profile may be missing. Create it lazily on first load (RLS allows a user
  // to insert only their own profile).
  if (error.code !== 'PGRST116') {
    throw error;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metadata = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
  };
  const displayName = (
    metadata.full_name ||
    metadata.name ||
    user?.email?.split('@')[0] ||
    'User'
  )
    .trim()
    .slice(0, 60);

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      display_name: displayName || 'User',
      locale: getDeviceLocale(),
    })
    .select('*')
    .single();

  if (!createError) {
    return created;
  }

  // Another request may have created the row between the select and insert.
  if (createError.code === '23505') {
    const { data: existing, error: retryError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!retryError) {
      return existing;
    }
  }

  throw createError;
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    'display_name' | 'avatar_url' | 'locale' | 'theme_mode' | 'accent_color'
  >
>;

export async function updateProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function uploadAvatar(
  userId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const extension =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, decodeBase64(base64), {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteAvatarFiles(userId: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId);
  if (error || !data?.length) {
    return;
  }
  await supabase.storage
    .from(AVATAR_BUCKET)
    .remove(data.map((file) => `${userId}/${file.name}`));
}

type DeleteAccountResponse = {
  error?: string;
  groups?: OwnedGroup[];
  message?: string;
};

export async function deleteAccount(
  deleteOwnedGroups: boolean,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>(
    'needcart-delete-account',
    {
      body: { delete_owned_groups: deleteOwnedGroups },
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    },
  );

  if (error) {
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === 'function') {
      const payload = (await response.json().catch(() => null)) as
        | DeleteAccountResponse
        | null;
      if (payload?.error === 'owned_groups' && payload.groups?.length) {
        throw new OwnedGroupsError(payload.groups);
      }
    }
    throw error;
  }

  if (data?.error === 'owned_groups' && data.groups?.length) {
    throw new OwnedGroupsError(data.groups);
  }
}

export type { Locale, ThemeMode };
