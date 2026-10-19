/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0B0F19',
          light: '#F8FAFC'
        },
        surface: {
          DEFAULT: '#111827',
          elevated: '#1F2937',
          card: '#161F30',
          border: 'rgba(255, 255, 255, 0.08)',
          light: '#FFFFFF',
          'light-elevated': '#F1F5F9',
          'light-border': 'rgba(0, 0, 0, 0.08)'
        },
        emerald: {
          glow: '#10B981',
          accent: '#059669',
          light: '#34D399'
        },
        electric: {
          mint: '#00F5A0',
          cyan: '#00D9F5'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
        'glow-electric': '0 0 25px -5px rgba(0, 245, 160, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
}
