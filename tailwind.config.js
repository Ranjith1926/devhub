/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS-variable palette so runtime theme switch can recolor the app.
        gh: {
          canvas: 'rgb(var(--gh-canvas) / <alpha-value>)',
          overlay: 'rgb(var(--gh-overlay) / <alpha-value>)',
          inset: 'rgb(var(--gh-inset) / <alpha-value>)',
          subtle: 'rgb(var(--gh-subtle) / <alpha-value>)',
          border: 'rgb(var(--gh-border) / <alpha-value>)',
          'border-muted': 'rgb(var(--gh-border-muted) / <alpha-value>)',
          fg: 'rgb(var(--gh-fg) / <alpha-value>)',
          'fg-muted': 'rgb(var(--gh-fg-muted) / <alpha-value>)',
          'fg-subtle': 'rgb(var(--gh-fg-subtle) / <alpha-value>)',
          accent: 'rgb(var(--gh-accent) / <alpha-value>)',
          success: 'rgb(var(--gh-success) / <alpha-value>)',
          attention: 'rgb(var(--gh-attention) / <alpha-value>)',
          danger: 'rgb(var(--gh-danger) / <alpha-value>)',
          done: 'rgb(var(--gh-done) / <alpha-value>)',
          sponsors: 'rgb(var(--gh-sponsors) / <alpha-value>)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
