/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: '#0f172a',
        surfaceHover: '#1e293b',
        border: '#1e293b',
        borderLight: '#334155',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        accent: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        textMuted: '#94a3b8',
      },
    },
  },
  plugins: [],
};
