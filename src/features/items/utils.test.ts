import { describe, expect, it } from 'vitest';

import {
  buildItemSections,
  filterItems,
  getItemLineTotalCents,
  getPlannedTotalCents,
  parseQuantityMultiplier,
  withCategory,
} from '@/features/items/utils';
import type { Category, Item } from '@/types/database';

const categories: Category[] = [
  {
    id: 'cat-food',
    group_id: 'group-1',
    name: 'Food',
    color: '#F5B301',
    icon: 'basket',
    sort_order: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'cat-home',
    group_id: 'group-1',
    name: 'Home',
    color: '#4CAF50',
    icon: 'home',
    sort_order: 1,
    created_at: '',
    updated_at: '',
  },
];

const baseItem: Item = {
  id: 'item-1',
  group_id: 'group-1',
  category_id: 'cat-food',
  name: 'Milk',
  quantity: '2 l',
  description: null,
  price_cents: 350,
  is_checked: false,
  created_by: 'user-1',
  checked_by: null,
  checked_at: null,
  deleted_at: null,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
};

const items: Item[] = [
  baseItem,
  {
    ...baseItem,
    id: 'item-2',
    name: 'Bread',
    category_id: 'cat-food',
    price_cents: 280,
  },
  {
    ...baseItem,
    id: 'item-3',
    name: 'Soap',
    category_id: 'cat-home',
    description: 'Lemon',
    price_cents: 220,
  },
  {
    ...baseItem,
    id: 'item-4',
    name: 'Apples',
    category_id: null,
    is_checked: true,
    checked_by: 'user-2',
    checked_at: '2026-11-02T12:00:00.000Z',
  },
];

describe('quantity and money helpers', () => {
  it('parses the leading quantity number', () => {
    expect(parseQuantityMultiplier('2')).toBe(2);
    expect(parseQuantityMultiplier('2,5 l')).toBe(2.5);
    expect(parseQuantityMultiplier('3 packs')).toBe(3);
    expect(parseQuantityMultiplier('1')).toBe(1);
    expect(parseQuantityMultiplier('large')).toBe(1);
    expect(parseQuantityMultiplier('0')).toBe(1);
  });

  it('multiplies the unit price by the quantity', () => {
    expect(getItemLineTotalCents({ price_cents: 150, quantity: '2' })).toBe(300);
    expect(getItemLineTotalCents({ price_cents: 150, quantity: '2,5' })).toBe(
      375,
    );
    expect(getItemLineTotalCents({ price_cents: null, quantity: '2' })).toBe(
      null,
    );
  });

  it('sums only active items into the planned total', () => {
    const pricedItems: Item[] = [
      { ...baseItem, id: 'a', price_cents: 150, quantity: '2' },
      { ...baseItem, id: 'b', price_cents: 110, quantity: '1' },
      {
        ...baseItem,
        id: 'c',
        price_cents: 100,
        quantity: '2',
        is_checked: true,
      },
      {
        ...baseItem,
        id: 'd',
        price_cents: 100,
        quantity: '2',
        deleted_at: '2026-11-02T00:00:00.000Z',
      },
    ];

    expect(getPlannedTotalCents(pricedItems)).toBe(410);
  });
});

describe('withCategory', () => {
  it('attaches category summaries and keeps uncategorized items', () => {
    const result = withCategory(items, categories);

    expect(result[0]?.category?.name).toBe('Food');
    expect(result[3]?.category).toBeNull();
  });
});

describe('filterItems', () => {
  const enriched = withCategory(items, categories);

  it('filters by status', () => {
    expect(
      filterItems(enriched, {
        filter: 'active',
        search: '',
        categoryId: null,
      }),
    ).toHaveLength(3);
    expect(
      filterItems(enriched, {
        filter: 'purchased',
        search: '',
        categoryId: null,
      }),
    ).toHaveLength(1);
  });

  it('filters by search across name and description', () => {
    expect(
      filterItems(enriched, {
        filter: 'all',
        search: 'lemon',
        categoryId: null,
      }).map((item) => item.id),
    ).toEqual(['item-3']);
  });

  it('filters by category', () => {
    expect(
      filterItems(enriched, {
        filter: 'all',
        search: '',
        categoryId: 'cat-home',
      }).map((item) => item.id),
    ).toEqual(['item-3']);
  });
});

describe('buildItemSections', () => {
  const enriched = withCategory(items, categories);

  it('groups active items by category and appends purchased last', () => {
    const sections = buildItemSections(enriched, categories, {
      filter: 'all',
      boughtTitle: 'Bought',
      uncategorizedTitle: 'Uncategorized',
    });

    expect(sections.map((section) => section.title)).toEqual([
      'Food',
      'Home',
      'Bought',
    ]);
    expect(sections[0]?.data).toHaveLength(2);
    expect(sections.at(-1)?.purchased).toBe(true);
  });

  it('does not add a purchased section in active mode', () => {
    const sections = buildItemSections(enriched, categories, {
      filter: 'active',
      boughtTitle: 'Bought',
      uncategorizedTitle: 'Uncategorized',
    });

    expect(sections.some((section) => section.purchased)).toBe(false);
  });

  it('adds an uncategorized section when needed', () => {
    const withUncategorized = withCategory(
      [
        {
          ...baseItem,
          id: 'item-5',
          category_id: null,
          name: 'Salt',
        },
      ],
      categories,
    );

    const sections = buildItemSections(withUncategorized, categories, {
      filter: 'all',
      boughtTitle: 'Bought',
      uncategorizedTitle: 'Uncategorized',
    });

    expect(sections[0]?.title).toBe('Uncategorized');
  });
});
