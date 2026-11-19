import { supabase } from '@/lib/supabase';
import type { Category, CategoryRow } from '@/types/database';

export async function listCategories(groupId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export type CategoryInput = {
  groupId: string;
  name: string;
  color: string;
  icon: string;
  sortOrder?: number;
};

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      group_id: input.groupId,
      name: input.name,
      color: input.color,
      icon: input.icon,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCategory(
  id: string,
  patch: Pick<CategoryRow, 'name' | 'color' | 'icon' | 'sort_order'>,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
