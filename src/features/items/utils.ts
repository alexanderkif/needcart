import type {
  Category,
  CategorySummary,
  Item,
  ItemWithCategory,
} from '@/types/database';

export type ItemFilter = 'all' | 'active' | 'purchased';

/**
 * Quantities are free text ("2", "2 l", "1,5 kg"). The leading number is the
 * multiplier used for money math; anything without a positive number counts
 * as one unit.
 */
export function parseQuantityMultiplier(quantity: string): number {
  const match = quantity.trim().match(/^(\d+(?:[.,]\d+)?)/);
  const rawValue = match?.[1];
  if (!rawValue) {
    return 1;
  }
  const value = Number(rawValue.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function getItemLineTotalCents(
  item: Pick<Item, 'price_cents' | 'quantity'>,
): number | null {
  if (item.price_cents === null || item.price_cents === undefined) {
    return null;
  }
  return Math.round(item.price_cents * parseQuantityMultiplier(item.quantity));
}

export function getPlannedTotalCents(
  items: Pick<Item, 'price_cents' | 'quantity' | 'is_checked' | 'deleted_at'>[],
): number {
  return items.reduce((total, item) => {
    if (item.is_checked || item.deleted_at) {
      return total;
    }
    const lineTotal = getItemLineTotalCents(item);
    return lineTotal === null ? total : total + lineTotal;
  }, 0);
}

export function withCategory(
  items: Item[],
  categories: Category[],
): ItemWithCategory[] {
  const categoryById = new Map<string, CategorySummary>(
    categories.map((category) => [
      category.id,
      {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
      },
    ]),
  );

  return items.map((item) => ({
    ...item,
    category: item.category_id
      ? (categoryById.get(item.category_id) ?? null)
      : null,
  }));
}

export function filterItems(
  items: ItemWithCategory[],
  options: {
    filter: ItemFilter;
    search: string;
    categoryId: string | null;
  },
): ItemWithCategory[] {
  const search = options.search.trim().toLowerCase();

  return items.filter((item) => {
    if (options.filter === 'active' && item.is_checked) {
      return false;
    }
    if (options.filter === 'purchased' && !item.is_checked) {
      return false;
    }
    if (options.categoryId && item.category_id !== options.categoryId) {
      return false;
    }
    if (search) {
      const haystack = `${item.name} ${item.description ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

export type ItemSection = {
  key: string;
  title: string;
  color: string | null;
  purchased: boolean;
  data: ItemWithCategory[];
};

export function buildItemSections(
  items: ItemWithCategory[],
  categories: Category[],
  options: {
    filter: ItemFilter;
    boughtTitle: string;
    uncategorizedTitle: string;
  },
): ItemSection[] {
  const sections: ItemSection[] = [];
  const active = items.filter((item) => !item.is_checked);
  const purchased = items.filter((item) => item.is_checked);
  const activeSections = new Map<string, ItemSection>();

  for (const category of categories) {
    if (!active.some((item) => item.category_id === category.id)) {
      continue;
    }
    activeSections.set(category.id, {
      key: category.id,
      title: category.name,
      color: category.color,
      purchased: false,
      data: [],
    });
  }

  const uncategorized: ItemSection = {
    key: 'uncategorized',
    title: options.uncategorizedTitle,
    color: null,
    purchased: false,
    data: [],
  };

  for (const item of active) {
    if (!item.category_id || !activeSections.has(item.category_id)) {
      uncategorized.data.push(item);
      continue;
    }
    activeSections.get(item.category_id)?.data.push(item);
  }

  sections.push(
    ...Array.from(activeSections.values()).filter(
      (section) => section.data.length > 0,
    ),
  );

  if (uncategorized.data.length > 0) {
    sections.push(uncategorized);
  }

  if (options.filter !== 'active' && purchased.length > 0) {
    sections.push({
      key: 'purchased',
      title: options.boughtTitle,
      color: null,
      purchased: true,
      data: purchased.sort((a, b) => {
        const left = a.checked_at ?? a.updated_at;
        const right = b.checked_at ?? b.updated_at;
        return right.localeCompare(left);
      }),
    });
  }

  return sections;
}

export function itemMatchesSearch(
  item: ItemWithCategory,
  search: string,
): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }
  return `${item.name} ${item.description ?? ''}`.toLowerCase().includes(query);
}
