/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#FAF7F0',
          dark: '#121212',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1E1E1E',
        },
        ink: {
          DEFAULT: '#1F1B16',
          dark: '#F5F1E8',
        },
        muted: {
          DEFAULT: '#7A7166',
          dark: '#A8A095',
        },
        accent: {
          DEFAULT: '#F5B301',
          dark: '#FFC83D',
        },
        'accent-contrast': {
          DEFAULT: '#3A2A00',
          dark: '#2A1D00',
        },
        danger: {
          DEFAULT: '#D64545',
          dark: '#FF6B6B',
        },
        success: {
          DEFAULT: '#2E7D32',
          dark: '#66BB6A',
        },
        border: {
          DEFAULT: '#E8E1D5',
          dark: '#2E2A24',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
};
