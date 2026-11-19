import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { parseQuantityMultiplier } from '@/features/items/utils';
import { useLocale } from '@/i18n';
import { formatMoney, parseMoneyToCents } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { Item } from '@/types/database';

type PurchaseMode = 'purchase' | 'reorder';

export function PurchaseSheet({
  visible,
  item,
  mode,
  currency,
  loading = false,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  item: Item | null;
  mode: PurchaseMode;
  currency: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (values: { quantity: string; priceCents: number | null }) => void;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { palette } = useTheme();
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !item) {
      return;
    }
    setQuantity(item.quantity || '1');
    setPrice(
      item.price_cents === null || item.price_cents === undefined
        ? ''
        : (item.price_cents / 100).toFixed(2),
    );
    setError(null);
  }, [visible, item]);

  const submit = () => {
    const trimmedQuantity = quantity.trim();
    if (!trimmedQuantity || trimmedQuantity.length > 40) {
      setError(t('validation.quantityRequired'));
      return;
    }

    const priceCents = price.trim() ? parseMoneyToCents(price) : null;
    if (price.trim() && (priceCents === null || priceCents < 0)) {
      setError(t('validation.priceInvalid'));
      return;
    }

    setError(null);
    onConfirm({ quantity: trimmedQuantity, priceCents });
  };

  const isPurchase = mode === 'purchase';
  const parsedUnitPriceCents = price.trim()
    ? parseMoneyToCents(price)
    : null;
  const quantityMultiplier = parseQuantityMultiplier(quantity);
  const lineTotalCents =
    parsedUnitPriceCents === null
      ? null
      : Math.round(parsedUnitPriceCents * quantityMultiplier);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={
        isPurchase ? t('items.purchaseTitle') : t('items.reorderTitle')
      }
      description={
        isPurchase ? t('items.purchaseBody') : t('items.reorderBody')
      }
      scrollable={false}
      footer={
        <View className="gap-2">
          {error ? (
            <AppText variant="caption" style={{ color: palette.danger }}>
              {error}
            </AppText>
          ) : null}
          <View className="flex-row gap-2">
            <Button
              title={t('common.cancel')}
              variant="secondary"
              className="flex-1"
              onPress={onClose}
              disabled={loading}
            />
            <Button
              title={
                isPurchase
                  ? t('items.confirmPurchase')
                  : t('items.confirmReorder')
              }
              className="flex-1"
              onPress={submit}
              loading={loading}
            />
          </View>
        </View>
      }
    >
      <View className="gap-4">
        {item ? (
          <View className="gap-1 rounded-md bg-surface-alt p-3 dark:bg-surface-alt-dark">
            <AppText variant="title" numberOfLines={2}>
              {item.name}
            </AppText>
            <AppText variant="caption" muted>
              {t('items.priceShort')}:{' '}
              {formatMoney(item.price_cents, currency, locale)}
            </AppText>
          </View>
        ) : null}

        <Input
          label={t('items.quantityLabel')}
          value={quantity}
          onChangeText={setQuantity}
          placeholder={t('items.quantityPlaceholder')}
          autoFocus
        />
        <Input
          label={t('items.priceLabel')}
          value={price}
          onChangeText={setPrice}
          placeholder={t('items.pricePlaceholder')}
          keyboardType="decimal-pad"
          hint={t('items.priceHint')}
        />
        {lineTotalCents !== null && quantityMultiplier > 1 ? (
          <View className="flex-row items-center justify-between gap-3 rounded-md bg-surface-alt px-3 py-2 dark:bg-surface-alt-dark">
            <AppText variant="caption" muted>
              {quantity} ×{' '}
              {formatMoney(parsedUnitPriceCents, currency, locale)}
            </AppText>
            <AppText variant="bodySmall" className="font-semibold">
              {formatMoney(lineTotalCents, currency, locale)}
            </AppText>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
