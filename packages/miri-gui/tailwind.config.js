/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        miri: {
          50: 'rgb(var(--miri-50-rgb, 255 245 245) / <alpha-value>)',
          100: 'rgb(var(--miri-100-rgb, 255 235 235) / <alpha-value>)',
          200: 'rgb(var(--miri-200-rgb, 255 214 214) / <alpha-value>)',
          300: 'rgb(var(--miri-300-rgb, 255 184 184) / <alpha-value>)',
          400: 'rgb(var(--miri-400-rgb, 255 157 157) / <alpha-value>)',
          500: 'rgb(var(--miri-500-rgb, 255 123 123) / <alpha-value>)',
          600: 'rgb(var(--miri-600-rgb, 240 82 82) / <alpha-value>)',
          700: 'rgb(var(--miri-700-rgb, 214 40 40) / <alpha-value>)',
          bg: 'var(--miri-bg, #FFF9F8)',
          card: '#FFFFFF',
          dark: '#2D2327',
          mint: '#58CC02', // Duolingo green
          yellow: '#FFC800',
          blue: '#1CB0F6',
          purple: '#CE82FF',
        }
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'duo': '0 4px 0 0 rgba(0, 0, 0, 0.12)',
        'duo-sm': '0 2px 0 0 rgba(0, 0, 0, 0.12)',
        'duo-press': '0 1px 0 0 rgba(0, 0, 0, 0.12)',
        'pixel': '4px 4px 0 0 #2D2327',
        'pixel-sm': '2px 2px 0 0 #2D2327',
      },
      borderRadius: {
        'duo': '1.25rem',
      }
    },
  },
  plugins: [],
}
