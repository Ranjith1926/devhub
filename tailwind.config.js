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
        'auth-card-in': 'authCardIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both',
        'auth-form-in': 'authFormIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'error-in': 'errorIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'logo-float': 'logoFloat 3.5s ease-in-out infinite',
        'blob-drift': 'blobDrift 14s ease-in-out infinite alternate',
        'blob-drift-2': 'blobDrift2 18s ease-in-out infinite alternate',
        'blob-drift-3': 'blobDrift3 22s ease-in-out infinite alternate',
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
        authCardIn: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        authFormIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        errorIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          '60%': { transform: 'translateY(1px) scale(1.005)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        logoFloat: {
          '0%':   { transform: 'translateY(0px)' },
          '50%':  { transform: 'translateY(-4px)' },
          '100%': { transform: 'translateY(0px)' },
        },
        blobDrift: {
          '0%':   { transform: 'translate(-50%, -30%) scale(1)' },
          '33%':  { transform: 'translate(-55%, -25%) scale(1.08)' },
          '66%':  { transform: 'translate(-45%, -35%) scale(0.93)' },
          '100%': { transform: 'translate(-50%, -28%) scale(1.04)' },
        },
        blobDrift2: {
          '0%':   { transform: 'translate(0%, 0%) scale(1)' },
          '50%':  { transform: 'translate(8%, 12%) scale(1.12)' },
          '100%': { transform: 'translate(-6%, -8%) scale(0.9)' },
        },
        blobDrift3: {
          '0%':   { transform: 'translate(0%, 0%) scale(1)' },
          '40%':  { transform: 'translate(-10%, 6%) scale(1.06)' },
          '100%': { transform: 'translate(8%, -10%) scale(0.94)' },
        },
      },
    },
  },
  plugins: [],
};
