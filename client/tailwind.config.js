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
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Custom Solatia Palette
        slate: {
          950: '#020617', // Main Background
          900: '#0f172a', // Cards
          800: '#1e293b', // Borders
        },
        brand: {
          primary: '#6366f1', // Indigo (Main)
          accent: '#06b6d4',  // Cyan (Secondary)
          glow: 'rgba(99, 102, 241, 0.5)',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}