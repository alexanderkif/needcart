import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { useCreateItem, useUpdateItem } from '@/features/items/hooks';
import { errorMessage } from '@/lib/errors';
import { parseMoneyToCents } from '@/lib/money';
import { itemFormSchema } from '@/lib/validation';
import type { Category, Item } from '@/types/database';

type ItemFormState = {
  name: string;
  quantity: string;
  price: string;
  categoryId: string | null;
  description: string;
};

type FormErrors = Partial<Record<keyof ItemFormState, string>>;

function initialValues(
  item?: Item | null,
  initialCategoryId?: string | null,
): ItemFormState {
  return {
    name: item?.name ?? '',
    quantity: item?.quantity ?? '1',
    price:
      item?.price_cents === null || item?.price_cents === undefined
        ? ''
        : (item.price_cents / 100).toFixed(2),
    categoryId: item?.category_id ?? initialCategoryId ?? null,
    description: item?.description ?? '',
  };
}

export function ItemForm({
  groupId,
  item,
  categories,
  initialCategoryId,
  onSuccess,
}: {
  groupId: string;
  item?: Item | null;
  categories: Category[];
  initialCategoryId?: string | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const createItem = useCreateItem(groupId);
  const updateItem = useUpdateItem(groupId);
  const [values, setValues] = useState<ItemFormState>(() =>
    initialValues(item, initialCategoryId),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = Boolean(item);
  const pending = createItem.isPending || updateItem.isPending;

  const update = <K extends keyof ItemFormState>(
    key: K,
    value: ItemFormState[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const parsed = itemFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && key in values) {
          nextErrors[key as keyof ItemFormState] = t(issue.message);
        }
      }
      setErrors(nextErrors);
      return;
    }

    const priceCents = values.price.trim()
      ? parseMoneyToCents(values.price)
      : null;

    if (values.price.trim() && (priceCents === null || priceCents < 0)) {
      setErrors({ price: t('validation.priceInvalid') });
      return;
    }

    const input = {
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      priceCents,
      categoryId: parsed.data.categoryId,
      description: parsed.data.description || null,
    };

    try {
      if (item) {
        await updateItem.mutateAsync({ itemId: item.id, ...input });
        showToast(t('items.saved'), 'success');
      } else {
        await createItem.mutateAsync(input);
        showToast(t('items.created'), 'success');
      }
      onSuccess();
    } catch (error) {
      showToast(
        errorMessage(
          error,
          t,
          item ? 'items.saveFailed' : 'items.createFailed',
        ),
        'error',
      );
    }
  };

  return (
    <View className="gap-4">
      <Input
        label={t('items.nameLabel')}
        required
        value={values.name}
        onChangeText={(value) => update('name', value)}
        placeholder={t('items.namePlaceholder')}
        error={errors.name}
        autoCapitalize="sentences"
        autoFocus={!isEditing}
        returnKeyType="next"
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label={t('items.quantityLabel')}
            required
            value={values.quantity}
            onChangeText={(value) => update('quantity', value)}
            placeholder={t('items.quantityPlaceholder')}
            error={errors.quantity}
          />
        </View>
        <View className="flex-1">
          <Input
            label={t('items.priceLabel')}
            value={values.price}
            onChangeText={(value) => update('price', value)}
            placeholder={t('items.pricePlaceholder')}
            error={errors.price}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      <View className="-mt-2">
        <AppText variant="caption" muted>
          {t('items.priceHint')}
        </AppText>
      </View>

      <Select
        label={t('items.categoryLabel')}
        value={values.categoryId ?? 'none'}
        onChange={(value) =>
          update('categoryId', value === 'none' ? null : value)
        }
        options={[
          { value: 'none', label: t('items.noCategory') },
          ...categories.map((category) => ({
            value: category.id,
            label: category.name,
          })),
        ]}
      />

      <Input
        label={t('items.descriptionLabel')}
        value={values.description}
        onChangeText={(value) => update('description', value)}
        placeholder={t('items.descriptionPlaceholder')}
        error={errors.description}
        multiline
      />

      <Button
        title={
          isEditing
            ? t('items.saveAction')
            : pending
              ? t('items.adding')
              : t('items.addAction')
        }
        onPress={handleSubmit}
        loading={pending}
        fullWidth
      />
    </View>
  );
}
