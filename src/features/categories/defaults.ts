import type { CreateGroupCategory } from '@/types/database';

export function getDefaultCategories(
  t: (key: string) => string,
): CreateGroupCategory[] {
  return [
    {
      name: t('groups.defaultCategories.groceries'),
      color: '#F5B301',
      icon: 'basket',
      sort_order: 0,
    },
    {
      name: t('groups.defaultCategories.home'),
      color: '#4CAF50',
      icon: 'home',
      sort_order: 1,
    },
    {
      name: t('groups.defaultCategories.pharmacy'),
      color: '#2196F3',
      icon: 'medkit',
      sort_order: 2,
    },
    {
      name: t('groups.defaultCategories.other'),
      color: '#9E9E9E',
      icon: 'pricetag',
      sort_order: 3,
    },
  ];
}

export const CATEGORY_COLORS = [
  '#F5B301',
  '#EF6A5A',
  '#D9558A',
  '#8B6FE8',
  '#3F7FDC',
  '#1FA79A',
  '#4CAF50',
  '#9E9E9E',
];

export const CATEGORY_ICONS = [
  'basket',
  'home',
  'medkit',
  'pricetag',
  'cafe',
  'beer',
  'gift',
  'paw',
  'car',
  'school',
  'fitness',
  'shirt',
];
