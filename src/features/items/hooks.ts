import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  createItem,
  getItem,
  listItemPurchases,
  listItems,
  purchaseItem,
  reorderItem,
  softDeleteItem,
  updateItem,
  type ItemPatch,
} from '@/features/items/api';
import { queryKeys } from '@/lib/query-keys';
import type { Item } from '@/types/database';

export function useItems(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.items(groupId ?? 'none'),
    queryFn: () => listItems(groupId as string),
    enabled: Boolean(groupId),
    staleTime: 15_000,
  });
}

export function useItem(itemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.item(itemId ?? 'none'),
    queryFn: () => getItem(itemId as string),
    enabled: Boolean(itemId),
  });
}

export function useItemPurchases(itemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.purchases(itemId ?? 'none'),
    queryFn: () => listItemPurchases(itemId as string),
    enabled: Boolean(itemId),
  });
}

export function useCreateItem(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      name: string;
      quantity: string;
      priceCents: number | null;
      categoryId: string | null;
      description: string | null;
    }) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      return createItem({ ...input, groupId, createdBy: user.id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items(groupId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

type UpdateItemInput = {
  itemId: string;
  name: string;
  quantity: string;
  priceCents: number | null;
  categoryId: string | null;
  description: string | null;
};

function toItemPatch(input: UpdateItemInput): ItemPatch {
  return {
    name: input.name,
    quantity: input.quantity,
    price_cents: input.priceCents,
    category_id: input.categoryId,
    description: input.description,
  };
}

export function useUpdateItem(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateItemInput) =>
      updateItem(input.itemId, toItemPatch(input)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.items(groupId) });
      const previousItems = queryClient.getQueryData<Item[]>(
        queryKeys.items(groupId),
      );
      const previousItem = queryClient.getQueryData<Item>(
        queryKeys.item(input.itemId),
      );
      const patch = toItemPatch(input);

      queryClient.setQueryData<Item[]>(
        queryKeys.items(groupId),
        (current) =>
          current?.map((item) =>
            item.id === input.itemId ? { ...item, ...patch } : item,
          ),
      );
      queryClient.setQueryData<Item>(queryKeys.item(input.itemId), (current) =>
        current ? { ...current, ...patch } : current,
      );

      return { previousItems, previousItem };
    },
    onError: (_error, input, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          queryKeys.items(groupId),
          context.previousItems,
        );
      }
      if (context?.previousItem) {
        queryClient.setQueryData(
          queryKeys.item(input.itemId),
          context.previousItem,
        );
      }
    },
    onSuccess: (item) => {
      queryClient.setQueryData(queryKeys.item(item.id), item);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items(groupId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useDeleteItem(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => softDeleteItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.items(groupId) });
      const previousItems = queryClient.getQueryData<Item[]>(
        queryKeys.items(groupId),
      );
      queryClient.setQueryData<Item[]>(
        queryKeys.items(groupId),
        (current) => current?.filter((item) => item.id !== itemId),
      );
      queryClient.removeQueries({ queryKey: queryKeys.item(itemId) });
      return { previousItems };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          queryKeys.items(groupId),
          context.previousItems,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items(groupId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function usePurchaseItem(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      itemId: string;
      priceCents?: number | null;
      quantity?: string | null;
    }) => purchaseItem(input),
    onMutate: async (input) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      await queryClient.cancelQueries({ queryKey: queryKeys.items(groupId) });
      const previousItems = queryClient.getQueryData<Item[]>(
        queryKeys.items(groupId),
      );
      const previousItem = queryClient.getQueryData<Item>(
        queryKeys.item(input.itemId),
      );
      const now = new Date().toISOString();

      const apply = (item: Item): Item =>
        item.id === input.itemId
          ? {
              ...item,
              is_checked: true,
              checked_by: user.id,
              checked_at: now,
              quantity: input.quantity ?? item.quantity,
              price_cents:
                input.priceCents === undefined
                  ? item.price_cents
                  : input.priceCents,
            }
          : item;

      queryClient.setQueryData<Item[]>(queryKeys.items(groupId), (current) =>
        current?.map(apply),
      );
      queryClient.setQueryData<Item>(queryKeys.item(input.itemId), (current) =>
        current ? apply(current) : current,
      );

      return { previousItems, previousItem };
    },
    onError: (_error, input, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          queryKeys.items(groupId),
          context.previousItems,
        );
      }
      if (context?.previousItem) {
        queryClient.setQueryData(
          queryKeys.item(input.itemId),
          context.previousItem,
        );
      }
    },
    onSuccess: (item) => {
      queryClient.setQueryData(queryKeys.item(item.id), item);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchases(item.id),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items(groupId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useReorderItem(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      itemId: string;
      quantity: string;
      priceCents?: number | null;
    }) => reorderItem(input),
    onMutate: async (input) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      await queryClient.cancelQueries({ queryKey: queryKeys.items(groupId) });
      const previousItems = queryClient.getQueryData<Item[]>(
        queryKeys.items(groupId),
      );
      const previousItem = queryClient.getQueryData<Item>(
        queryKeys.item(input.itemId),
      );
      const now = new Date().toISOString();

      const apply = (item: Item): Item =>
        item.id === input.itemId
          ? {
              ...item,
              is_checked: false,
              checked_by: null,
              checked_at: null,
              quantity: input.quantity,
              price_cents:
                input.priceCents === undefined
                  ? item.price_cents
                  : input.priceCents,
              created_by: user.id,
              created_at: now,
            }
          : item;

      queryClient.setQueryData<Item[]>(queryKeys.items(groupId), (current) =>
        current?.map(apply),
      );
      queryClient.setQueryData<Item>(queryKeys.item(input.itemId), (current) =>
        current ? apply(current) : current,
      );

      return { previousItems, previousItem };
    },
    onError: (_error, input, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          queryKeys.items(groupId),
          context.previousItems,
        );
      }
      if (context?.previousItem) {
        queryClient.setQueryData(
          queryKeys.item(input.itemId),
          context.previousItem,
        );
      }
    },
    onSuccess: (item) => {
      queryClient.setQueryData(queryKeys.item(item.id), item);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items(groupId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.groupOverview(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}
