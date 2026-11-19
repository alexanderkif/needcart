import { supabase } from '@/lib/supabase';
import type {
  CreateGroupInput,
  Group,
  GroupMember,
  GroupMemberWithProfile,
  GroupOverview,
  GroupRole,
  GroupRow,
  Profile,
} from '@/types/database';

export async function listGroups(): Promise<GroupOverview[]> {
  const { data, error } = await supabase
    .from('group_overview')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getGroup(groupId: string): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getGroupOverview(groupId: string): Promise<GroupOverview> {
  const { data, error } = await supabase
    .from('group_overview')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: input.name,
    p_description: input.description ?? null,
    p_currency: input.currency ?? 'USD',
    p_budget_cents: input.budget_cents ?? null,
    p_budget_period: input.budget_period ?? 'none',
    p_timezone: input.timezone ?? 'UTC',
    p_categories: input.categories ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function joinGroupByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group_by_code', {
    p_code: code.trim().toUpperCase(),
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) {
    throw error;
  }
}

export async function rotateInviteCode(groupId: string): Promise<string> {
  const { data, error } = await supabase.rpc('rotate_invite_code', {
    p_group_id: groupId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export type GroupPatch = Partial<
  Pick<
    GroupRow,
    'name' | 'description' | 'currency' | 'budget_cents' | 'budget_period' | 'timezone'
  >
>;

export async function updateGroup(
  groupId: string,
  patch: GroupPatch,
): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .update(patch)
    .eq('id', groupId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) {
    throw error;
  }
}

export async function listGroupMembers(
  groupId: string,
): Promise<GroupMemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw error;
  }

  if (members.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in(
      'id',
      members.map((member) => member.user_id),
    );

  if (profilesError) {
    throw profilesError;
  }

  const profileById = new Map(
    (profiles as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]).map(
      (profile) => [profile.id, profile],
    ),
  );

  return members.map((member) => ({
    ...member,
    profile: profileById.get(member.user_id) ?? null,
  }));
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: Exclude<GroupRole, 'owner'>,
): Promise<GroupMember> {
  const { data, error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function removeMember(
  groupId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
