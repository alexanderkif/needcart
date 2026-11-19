import { supabase } from '@/lib/supabase';
import type { Item, ItemPurchase, ItemRow } from '@/types/database';

export async function listItems(groupId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('is_checked', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function getItem(itemId: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export type ItemInput = {
  groupId: string;
  name: string;
  quantity: string;
  priceCents: number | null;
  categoryId: string | null;
  description: string | null;
  createdBy: string;
};

export async function createItem(input: ItemInput): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert({
      group_id: input.groupId,
      name: input.name,
      quantity: input.quantity,
      price_cents: input.priceCents,
      category_id: input.categoryId,
      description: input.description,
      created_by: input.createdBy,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export type ItemPatch = Partial<
  Pick<
    ItemRow,
    'name' | 'quantity' | 'description' | 'price_cents' | 'category_id' | 'deleted_at'
  >
>;

export async function updateItem(
  itemId: string,
  patch: ItemPatch,
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(patch)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function softDeleteItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    throw error;
  }
}

export async function listItemPurchases(itemId: string): Promise<ItemPurchase[]> {
  const { data, error } = await supabase
    .from('item_purchases')
    .select('*')
    .eq('item_id', itemId)
    .order('purchased_at', { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  return data;
}

export async function purchaseItem(input: {
  itemId: string;
  priceCents?: number | null;
  quantity?: string | null;
}): Promise<Item> {
  const { data, error } = await supabase.rpc('purchase_item', {
    p_item_id: input.itemId,
    p_price_cents: input.priceCents ?? null,
    p_quantity: input.quantity ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function reorderItem(input: {
  itemId: string;
  quantity: string;
  priceCents?: number | null;
}): Promise<Item> {
  const { data, error } = await supabase.rpc('reorder_item', {
    p_item_id: input.itemId,
    p_quantity: input.quantity,
    p_price_cents: input.priceCents ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}
