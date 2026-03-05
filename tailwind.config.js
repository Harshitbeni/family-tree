/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'serif'],
      },
      colors: {
        got: {
          bg: '#0f0e17',
          surface: '#1a1a2e',
          border: '#2e2e4e',
          red: '#8b0000',
          gold: '#c9a84c',
          goldLight: '#e8c87a',
          text: '#e8e0d0',
          muted: '#9e9880',
        }
      }
    },
  },
  plugins: [],
}

