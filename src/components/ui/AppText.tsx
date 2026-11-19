import { Text, type TextProps } from 'react-native';

import { cn } from '@/lib/cn';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label';

const variantClasses: Record<TextVariant, string> = {
  display: 'text-[30px] leading-[38px] font-bold',
  h1: 'text-[26px] leading-[34px] font-bold',
  h2: 'text-[21px] leading-[28px] font-semibold',
  title: 'text-[18px] leading-[24px] font-semibold',
  body: 'text-[16px] leading-[24px]',
  bodySmall: 'text-[14px] leading-[20px]',
  caption: 'text-[12px] leading-[16px]',
  label: 'text-[12px] leading-[16px] font-semibold uppercase tracking-[0.08em]',
};

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  muted?: boolean;
  className?: string;
};

export function AppText({
  variant = 'body',
  muted = false,
  className,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      className={cn(
        'text-ink dark:text-ink-dark',
        variantClasses[variant],
        muted && 'text-muted dark:text-muted-dark',
        className,
      )}
    />
  );
}
