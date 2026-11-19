import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { useCategories } from '@/features/categories/hooks';
import { ItemForm } from '@/features/items/components/ItemForm';

export default function NewItemScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId?: string;
    categoryId?: string;
  }>();
  const groupId = typeof params.groupId === 'string' ? params.groupId : '';
  const categoryId =
    typeof params.categoryId === 'string' ? params.categoryId : null;
  const categories = useCategories(groupId || undefined);

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (groupId) {
      router.replace({ pathname: '/groups/[id]', params: { id: groupId } });
    } else {
      router.replace('/');
    }
  };

  if (!groupId) {
    return (
      <Screen>
        <Header onBack={() => router.replace('/')} />
        <ErrorState title={t('errors.notFound')} />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard contentContainerClassName="pt-1">
      <Header
        title={t('items.addTitle')}
        onBack={close}
      />
      <ItemForm
        groupId={groupId}
        categories={categories.data ?? []}
        initialCategoryId={categoryId}
        onSuccess={close}
      />
    </Screen>
  );
}
