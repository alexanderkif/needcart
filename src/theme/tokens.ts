export type ThemeScheme = 'light' | 'dark';

export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentContrast: string;
  danger: string;
  success: string;
  overlay: string;
};

export const basePalettes: Record<ThemeScheme, Omit<Palette, 'accent' | 'accentContrast'>> = {
  light: {
    background: '#FAF7F0',
    surface: '#FFFFFF',
    surfaceAlt: '#F3EEE4',
    text: '#1F1B16',
    muted: '#7A7166',
    border: '#E8E1D5',
    danger: '#D64545',
    success: '#2E7D32',
    overlay: 'rgba(31, 27, 22, 0.45)',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceAlt: '#262320',
    text: '#F5F1E8',
    muted: '#A8A095',
    border: '#2E2A24',
    danger: '#FF6B6B',
    success: '#66BB6A',
    overlay: 'rgba(0, 0, 0, 0.65)',
  },
};

export const DEFAULT_ACCENT = '#F5B301';
export const DEFAULT_ACCENT_DARK = '#FFC83D';

export const accentPresets = [
  { id: 'amber', value: '#F5B301' },
  { id: 'coral', value: '#EF6A5A' },
  { id: 'rose', value: '#D9558A' },
  { id: 'violet', value: '#8B6FE8' },
  { id: 'blue', value: '#3F7FDC' },
  { id: 'teal', value: '#1FA79A' },
  { id: 'green', value: '#4F9D55' },
  { id: 'graphite', value: '#6B6B6B' },
] as const;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) {
    return null;
  }
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

export function mixHex(base: string, overlay: string, ratio: number): string {
  const from = hexToRgb(base);
  const to = hexToRgb(overlay);
  if (!from || !to) {
    return base;
  }
  const amount = Math.max(0, Math.min(1, ratio));
  const channel = (a: number, b: number) =>
    Math.round(a * (1 - amount) + b * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(from.r, to.r)}${channel(from.g, to.g)}${channel(from.b, to.b)}`;
}

/** Subtle background derived from the user's accent color. */
export function tintedBackground(
  accent: string,
  scheme: ThemeScheme,
): string {
  return scheme === 'dark'
    ? mixHex('#121212', accent, 0.09)
    : mixHex('#FBFAF7', accent, 0.055);
}

export function tintedSurfaceAlt(
  accent: string,
  scheme: ThemeScheme,
): string {
  const base = scheme === 'dark' ? '#262320' : '#F3EEE4';
  return mixHex(base, accent, scheme === 'dark' ? 0.06 : 0.045);
}

export function getAccentContrast(hex: string): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) {
    return '#1F1B16';
  }
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  const linear = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminance > 0.45 ? '#2A1D00' : '#FFFFFF';
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const maxContentWidth = 960;
export const mobileBreakpoint = 900;
