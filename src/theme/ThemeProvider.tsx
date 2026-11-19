import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useColorScheme } from 'nativewind';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  DEFAULT_ACCENT,
  DEFAULT_ACCENT_DARK,
  basePalettes,
  getAccentContrast,
  tintedBackground,
  tintedSurfaceAlt,
  type Palette,
  type ThemeScheme,
} from '@/theme/tokens';

const THEME_STORAGE_KEY = 'needcart.theme';
const SYSTEM_CHROME_COLOR = '#121212';

type ThemeContextValue = {
  scheme: ThemeScheme;
  palette: Palette;
  accent: string;
  accentContrast: string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): 'light' | 'dark' | 'system' {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return 'system';
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage can be unavailable in private mode.
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const preference = profile?.theme_mode ?? readStoredPreference();
  const { colorScheme, setColorScheme } = useColorScheme();

  const scheme: ThemeScheme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    setColorScheme(preference);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, preference);
      } catch {
        // Ignore storage failures.
      }
    }
  }, [preference, setColorScheme]);

  const accent =
    profile?.accent_color ??
    (scheme === 'dark' ? DEFAULT_ACCENT_DARK : DEFAULT_ACCENT);
  const accentContrast = getAccentContrast(accent);

  const palette = useMemo<Palette>(
    () => ({
      ...basePalettes[scheme],
      background: tintedBackground(accent, scheme),
      surfaceAlt: tintedSurfaceAlt(accent, scheme),
      accent,
      accentContrast,
    }),
    [scheme, accent, accentContrast],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const root = window.document.documentElement;
    root.classList.toggle('dark', scheme === 'dark');
    root.style.colorScheme = scheme;
    root.style.backgroundColor = palette.background;
    window.document.body.style.backgroundColor = palette.background;

    let meta = window.document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!meta) {
      meta = window.document.createElement('meta');
      meta.name = 'theme-color';
      window.document.head.appendChild(meta);
    }
    // Keep Android/iOS system chrome neutral instead of tinting the status and
    // navigation bars with the user's accent color.
    meta.content = SYSTEM_CHROME_COLOR;

    try {
      window.localStorage.setItem('needcart.background', palette.background);
    } catch {
      // Ignore storage failures.
    }
  }, [scheme, palette.background]);

  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, palette, accent, accentContrast }),
    [scheme, palette, accent, accentContrast],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
