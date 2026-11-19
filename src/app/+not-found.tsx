import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen scroll contentContainerClassName="justify-center">
      <EmptyState
        icon="compass-outline"
        title={t('common.error')}
        body={t('errors.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
