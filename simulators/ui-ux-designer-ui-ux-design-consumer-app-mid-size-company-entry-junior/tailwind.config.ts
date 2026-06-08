import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          bg: '#6B9EA6',
          surface: '#F2EBD9',
          'surface-light': '#E8DCC8',
          accent: '#B87D6B',
          'accent-light': '#C99080',
          success: '#3A6B5E',
          warning: '#B87D6B',
          danger: '#D2A39A',
          text: '#000000',
          muted: '#555555',
          highlight: '#B87D6B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
