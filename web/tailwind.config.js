/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Newsreader', '"Noto Serif Devanagari"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        constitutional: ['Cinzel', 'Newsreader', 'serif'],
        devanagari: ['"Tiro Devanagari Hindi"', '"Noto Serif Devanagari"', 'serif'],
      },
      colors: {
        // Dholpur Sandstone & Khadi Parchment (Architecture of Sansad & Rashtrapati Bhavan)
        dholpur: {
          50: '#FDFBF7',
          100: '#FAF7F2',
          200: '#F5EFEB',
          300: '#EFE7DC',
          400: '#E2D5C3',
          500: '#C8B89E',
          600: '#A8967D',
          700: '#8C7A64',
          800: '#675847',
          900: '#463B30',
        },
        // Sovereign Navy (Ashoka Chakra & Parliamentary Dignity)
        sovereign: {
          950: '#07101E',
          900: '#0A192F',
          850: '#0D2040',
          800: '#112A4F',
          700: '#1A365D',
          600: '#2A4365',
          500: '#3D5A80',
        },
        // Kesariya (Saffron Gold & Civic Vigilance)
        kesariya: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#78350F',
          900: '#451A03',
        },
        // Tiranga Harit & Jade (Integrity & Development)
        harit: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // Indelible Voter-Ink Purple (Silver Nitrate Stamp of the Sovereign Voter)
        'voter-ink': {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#5B21B6',
          800: '#3B0764',
          900: '#2E1065',
        },
        // Terracotta & Crimson (Legal Violations & High Alert)
        terracotta: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        // Ashoka Chakra Royal Navy
        ashoka: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#002B66',
          900: '#001F4D',
        },
        // Backwards compatibility aliases
        saffron: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        jade: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
        },
        crimson: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
        },
        paper: '#FAF7F2',
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}

