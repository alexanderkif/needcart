import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteAccount,
  deleteAvatarFiles,
  sendMagicLink,
  updateProfile,
  uploadAvatar,
  type ProfilePatch,
} from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';

export function useSendMagicLink() {
  return useMutation({
    mutationFn: (email: string) => sendMagicLink(email),
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: ProfilePatch) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      return updateProfile(user.id, patch);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(profile.id), profile);
    },
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { base64: string; mimeType: string }) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      const avatarUrl = await uploadAvatar(
        user.id,
        input.base64,
        input.mimeType,
      );
      return updateProfile(user.id, { avatar_url: avatarUrl });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(profile.id), profile);
    },
  });
}

export function useRemoveAvatar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      const profile = await updateProfile(user.id, { avatar_url: null });
      void deleteAvatarFiles(user.id);
      return profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(profile.id), profile);
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deleteOwnedGroups: boolean) => {
      await deleteAccount(deleteOwnedGroups);
      try {
        // The auth user may already be gone, so a failed signOut must not turn
        // a successful deletion into an error.
        await supabase.auth.signOut();
      } catch {
        // Ignore.
      }
      queryClient.clear();
    },
  });
}
