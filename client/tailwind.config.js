/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        google: {
          blue: '#1a73e8',
          'blue-hover': '#1557b0',
          'blue-soft': 'rgba(26, 115, 232, 0.12)',
          green: '#34a853',
          'green-dark': '#188038',
          'green-soft': 'rgba(52, 168, 83, 0.12)',
          yellow: '#fbbc04',
          'yellow-soft': 'rgba(251, 188, 4, 0.12)',
          red: '#ea4335',
          'red-soft': 'rgba(234, 67, 53, 0.12)',
          bg: '#0f1216',
          card: '#16191f',
          surface: '#1f232b',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#1a73e8',
          600: '#1557b0',
          700: '#174ea6',
        }
      }
    },
  },
  plugins: [],
}
