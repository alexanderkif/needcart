import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export type ToastTone = 'success' | 'error' | 'info';

type ToastState = {
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      setToast({ message, tone });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: Platform.OS !== 'web',
      }).start();

      timeout.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => setToast(null));
      }, 2600);
    },
    [opacity],
  );

  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  const color =
    toast?.tone === 'error'
      ? palette.danger
      : toast?.tone === 'success'
        ? palette.success
        : palette.accent;

  const icon =
    toast?.tone === 'error'
      ? 'alert-circle'
      : toast?.tone === 'success'
        ? 'checkmark-circle'
        : 'information-circle';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 items-center px-4"
          style={{ top: insets.top + 8 }}
        >
          <Animated.View style={{ opacity }}>
            <View
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
              }}
              className="max-w-[520px] flex-row items-center gap-2 rounded-md border px-4 py-3 shadow-lg"
            >
              <Ionicons name={icon} size={18} color={color} />
              <AppText variant="bodySmall" className="flex-1">
                {toast.message}
              </AppText>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return value;
}
