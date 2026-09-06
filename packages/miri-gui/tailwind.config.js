/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        miri: {
          50: '#FFF5F5',
          100: '#FFEBEB',
          200: '#FFD6D6',
          300: '#FFB8B8',
          400: '#FF9D9D', // Main brand hex
          500: '#FF7B7B',
          600: '#F05252',
          700: '#D62828',
          bg: '#FFF9F8',
          card: '#FFFFFF',
          dark: '#2D2327',
          mint: '#58CC02', // Duolingo green
          yellow: '#FFC800',
          blue: '#1CB0F6',
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
