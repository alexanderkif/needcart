import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Screen } from '@/components/ui/Screen';
import { useCategories } from '@/features/categories/hooks';
import { ItemForm } from '@/features/items/components/ItemForm';
import { useItem } from '@/features/items/hooks';
import { useGroupRole } from '@/features/groups/hooks';
import { useGoBack } from '@/lib/use-go-back';

export default function EditItemScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const itemId = typeof params.id === 'string' ? params.id : undefined;
  const itemQuery = useItem(itemId);
  const groupId = itemQuery.data?.group_id;
  const categories = useCategories(groupId);
  const role = useGroupRole(groupId);
  const goBack = useGoBack(
    groupId ? { pathname: '/groups/[id]', params: { id: groupId } } : '/',
  );

  if (!itemId) {
    return <ErrorState title={t('errors.notFound')} />;
  }

  if (itemQuery.isPending) {
    return <LoadingScreen />;
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <Screen>
        <Header onBack={goBack} />
        <ErrorState
          title={t('errors.notFound')}
          message={t('errors.generic')}
          onRetry={() => void itemQuery.refetch()}
          retryLabel={t('common.retry')}
        />
      </Screen>
    );
  }

  const item = itemQuery.data;

  if (role.isLoading) {
    return <LoadingScreen />;
  }

  const canEdit =
    role.isAdmin || (item.created_by === role.userId && !item.is_checked);

  if (!canEdit) {
    return (
      <Screen>
        <Header onBack={goBack} />
        <ErrorState title={t('errors.forbidden')} />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard contentContainerClassName="pt-1">
      <Header title={t('items.editTitle')} onBack={goBack} />
      <ItemForm
        groupId={item.group_id}
        item={item}
        categories={categories.data ?? []}
        onSuccess={goBack}
      />
    </Screen>
  );
}
