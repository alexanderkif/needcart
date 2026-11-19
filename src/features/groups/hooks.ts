import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  createGroup,
  deleteGroup,
  getGroup,
  getGroupOverview,
  joinGroupByCode,
  leaveGroup,
  listGroupMembers,
  listGroups,
  removeMember,
  rotateInviteCode,
  updateGroup,
  updateMemberRole,
  type GroupPatch,
} from '@/features/groups/api';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { CreateGroupInput, GroupRole } from '@/types/database';

let channelSequence = 0;

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups(),
    queryFn: listGroups,
    staleTime: 15_000,
  });
}

export function useGroupOverview(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupOverview(groupId ?? 'none'),
    queryFn: () => getGroupOverview(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.group(groupId ?? 'none'),
    queryFn: () => getGroup(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members(groupId ?? 'none'),
    queryFn: () => listGroupMembers(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGroupInput) => createGroup(input),
    onSuccess: (group) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.group(group.id),
      });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => joinGroupByCode(code),
    onSuccess: (groupId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.group(groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => leaveGroup(groupId),
    onSuccess: (_data, groupId) => {
      queryClient.removeQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.groupOverview(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.members(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.items(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.categories(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: (_data, groupId) => {
      queryClient.removeQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.groupOverview(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.members(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.items(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.categories(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: GroupPatch) => updateGroup(groupId, patch),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.group(groupId), group);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useRotateInviteCode(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => rotateInviteCode(groupId),
    onSuccess: (code) => {
      queryClient.setQueryData(
        queryKeys.group(groupId),
        (current: { invite_code?: string } | undefined) =>
          current ? { ...current, invite_code: code } : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
    },
  });
}

export function useUpdateMemberRole(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      userId: string;
      role: Exclude<GroupRole, 'owner'>;
    }) => updateMemberRole(groupId, input.userId, input.role),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members(groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeMember(groupId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members(groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useGroupRole(groupId: string | undefined) {
  const { user } = useAuth();
  const { data: members, isPending } = useGroupMembers(groupId);
  const membership = members?.find((member) => member.user_id === user?.id);
  const role = membership?.role ?? null;

  return {
    role,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    isMember: Boolean(membership),
    isLoading: Boolean(groupId) && isPending,
    userId: user?.id ?? null,
  };
}

export function useGroupRealtime(groupId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleInvalidate = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        const keys = [
          queryKeys.group(groupId),
          queryKeys.groupOverview(groupId),
          queryKeys.members(groupId),
          queryKeys.categories(groupId),
          queryKeys.items(groupId),
          queryKeys.groups(),
        ];
        for (const key of keys) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
        void queryClient.invalidateQueries({ queryKey: ['purchases'] });
        void queryClient.invalidateQueries({ queryKey: ['item'] });
      }, 150);
    };

    channelSequence += 1;
    const channel = supabase
      .channel(`group:${groupId}:${channelSequence}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'needcart',
          table: 'items',
          filter: `group_id=eq.${groupId}`,
        },
        scheduleInvalidate,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'needcart',
          table: 'items',
          filter: `group_id=eq.${groupId}`,
        },
        scheduleInvalidate,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'needcart',
          table: 'item_purchases',
          filter: `group_id=eq.${groupId}`,
        },
        scheduleInvalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'needcart',
          table: 'categories',
          filter: `group_id=eq.${groupId}`,
        },
        scheduleInvalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'needcart',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        scheduleInvalidate,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'needcart',
          table: 'groups',
          filter: `id=eq.${groupId}`,
        },
        scheduleInvalidate,
      )
      .subscribe();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      void supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}
