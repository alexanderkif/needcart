import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      {...props}
      className={cn(
        'rounded-lg border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark',
        className,
      )}
    />
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'h-px w-full bg-border dark:bg-border-dark',
        className,
      )}
    />
  );
}
