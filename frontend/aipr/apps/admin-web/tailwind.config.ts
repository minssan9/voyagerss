import type { Config } from 'tailwindcss';

export default {
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#0A84FF',
        'accent-hv': '#0071e3',
        surface: '#f7f7f8',
        border: '#e5e5e7',
        muted: '#6e6e73',
      },
      borderRadius: { xl: '12px', '2xl': '16px' },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'SF Pro Text'", "'Segoe UI'", 'sans-serif'],
      },
    },
  },
} satisfies Config;
