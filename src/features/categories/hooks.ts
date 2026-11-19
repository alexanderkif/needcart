import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryInput,
} from '@/features/categories/api';
import { queryKeys } from '@/lib/query-keys';
import type { CategoryRow } from '@/types/database';

export function useCategories(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.categories(groupId ?? 'none'),
    queryFn: () => listCategories(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useCreateCategory(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CategoryInput, 'groupId'>) =>
      createCategory({ ...input, groupId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories(groupId),
      });
    },
  });
}

export function useUpdateCategory(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      patch: Pick<CategoryRow, 'name' | 'color' | 'icon' | 'sort_order'>;
    }) => updateCategory(input.id, input.patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.items(groupId) });
    },
  });
}

export function useDeleteCategory(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.items(groupId) });
    },
  });
}
