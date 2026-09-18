/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca
        brand: {
          DEFAULT: '#004AAD',
          500: '#2F6BD4',
          700: '#033B85',
        },
        ink: '#0E1726',
        // Funcionais
        success: { DEFAULT: '#16A34A', bg: 'var(--success-bg)' },
        danger: { DEFAULT: '#E5484D', bg: 'var(--danger-bg)' },
        warning: { DEFAULT: '#F59E0B', bg: 'var(--warning-bg)' },
        violet: { DEFAULT: '#A855F7' },
        // Neutros semânticos (trocam por tema via CSS vars)
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        subtle: 'var(--bg-subtle)',
        line: 'var(--border)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        // Sidebar ativo
        'active-bg': 'var(--active-bg)',
        'active-text': 'var(--active-text)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        item: '10px',
        card: '14px',
        panel: '20px',
      },
      boxShadow: {
        card: '0 24px 60px -30px rgba(15,23,42,.4)',
        btn: '0 12px 24px -12px rgba(0,74,173,.8)',
        focus: '0 0 0 3px #EAF1FE',
      },
      letterSpacing: {
        tightest: '-0.02em',
      },
    },
  },
  plugins: [],
}
