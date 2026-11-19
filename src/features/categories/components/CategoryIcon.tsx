import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICON_BY_NAME: Record<string, IconName> = {
  basket: 'basket',
  home: 'home',
  medkit: 'medkit',
  pricetag: 'pricetag',
  cafe: 'cafe',
  beer: 'beer',
  gift: 'gift',
  paw: 'paw',
  car: 'car',
  school: 'school',
  fitness: 'fitness',
  shirt: 'shirt',
};

export function categoryIconName(name: string): IconName {
  return ICON_BY_NAME[name] ?? 'pricetag';
}

export function CategoryIcon({
  name,
  size = 18,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const { palette } = useTheme();
  return (
    <Ionicons
      name={categoryIconName(name)}
      size={size}
      color={color ?? palette.text}
    />
  );
}
