import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { AppText } from '@/components/ui/AppText';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(next);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      <Sheet
        visible={Boolean(options)}
        onClose={() => close(false)}
        title={options?.title}
        scrollable={false}
        footer={
          <View className="flex-row gap-2">
            <Button
              title={options?.cancelLabel ?? t('common.cancel')}
              variant="secondary"
              className="flex-1"
              onPress={() => close(false)}
            />
            <Button
              title={options?.confirmLabel ?? t('common.confirm')}
              variant={options?.destructive ? 'danger' : 'primary'}
              className="flex-1"
              onPress={() => close(true)}
            />
          </View>
        }
      >
        {options?.message ? (
          <AppText variant="bodySmall" muted>
            {options.message}
          </AppText>
        ) : null}
      </Sheet>
    </DialogContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const value = useContext(DialogContext);
  if (!value) {
    throw new Error('useConfirm must be used inside DialogProvider');
  }
  return value.confirm;
}
