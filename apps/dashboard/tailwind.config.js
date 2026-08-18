/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Roboto Flex"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Material 3 Color System (Semantic Tokens mapped to CSS variables)
        primary: {
          DEFAULT: 'rgb(var(--md-sys-color-primary) / <alpha-value>)',
          container: 'rgb(var(--md-sys-color-primary-container) / <alpha-value>)',
          on: 'rgb(var(--md-sys-color-on-primary) / <alpha-value>)',
          'on-container': 'rgb(var(--md-sys-color-on-primary-container) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--md-sys-color-secondary) / <alpha-value>)',
          container: 'rgb(var(--md-sys-color-secondary-container) / <alpha-value>)',
          on: 'rgb(var(--md-sys-color-on-secondary) / <alpha-value>)',
          'on-container': 'rgb(var(--md-sys-color-on-secondary-container) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--md-sys-color-tertiary) / <alpha-value>)',
          container: 'rgb(var(--md-sys-color-tertiary-container) / <alpha-value>)',
          on: 'rgb(var(--md-sys-color-on-tertiary) / <alpha-value>)',
          'on-container': 'rgb(var(--md-sys-color-on-tertiary-container) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--md-sys-color-error) / <alpha-value>)',
          container: 'rgb(var(--md-sys-color-error-container) / <alpha-value>)',
          on: 'rgb(var(--md-sys-color-on-error) / <alpha-value>)',
          'on-container': 'rgb(var(--md-sys-color-on-error-container) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--md-sys-color-surface) / <alpha-value>)',
          dim: 'rgb(var(--md-sys-color-surface-dim) / <alpha-value>)',
          bright: 'rgb(var(--md-sys-color-surface-bright) / <alpha-value>)',
          container: 'rgb(var(--md-sys-color-surface-container) / <alpha-value>)',
          'container-low': 'rgb(var(--md-sys-color-surface-container-low) / <alpha-value>)',
          'container-high': 'rgb(var(--md-sys-color-surface-container-high) / <alpha-value>)',
          'container-highest': 'rgb(var(--md-sys-color-surface-container-highest) / <alpha-value>)',
          variant: 'rgb(var(--md-sys-color-surface-variant) / <alpha-value>)',
        },
        'on-surface': {
          DEFAULT: 'rgb(var(--md-sys-color-on-surface) / <alpha-value>)',
          variant: 'rgb(var(--md-sys-color-on-surface-variant) / <alpha-value>)',
        },
        outline: {
          DEFAULT: 'rgb(var(--md-sys-color-outline) / <alpha-value>)',
          variant: 'rgb(var(--md-sys-color-outline-variant) / <alpha-value>)',
        },
        background: 'rgb(var(--md-sys-color-background) / <alpha-value>)',
        'on-background': 'rgb(var(--md-sys-color-on-background) / <alpha-value>)',
      },
      borderRadius: {
        'm3-xs': '4px',
        'm3-sm': '8px',
        'm3-md': '12px',
        'm3-lg': '16px',
        'm3-xl': '24px',
        'm3-full': '9999px',
      },
      boxShadow: {
        'm3-1': '0 1px 2px rgba(0,0,0,0.12), 0 1px 3px 1px rgba(0,0,0,0.08)',
        'm3-2': '0 1px 2px rgba(0,0,0,0.15), 0 2px 6px 2px rgba(0,0,0,0.10)',
        'm3-3': '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.20)',
        'm3-4': '0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.20)',
        'm3-5': '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px rgba(0,0,0,0.20)',
      },
    },
  },
  plugins: [],
};
