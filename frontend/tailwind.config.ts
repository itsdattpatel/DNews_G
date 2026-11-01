import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="night"]'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-alt': 'var(--color-paper-alt)',
        'paper-border': 'var(--color-paper-border)',
        ink: 'var(--color-ink)',
        'ink-secondary': 'var(--color-ink-secondary)',
        'ink-muted': 'var(--color-ink-muted)',
        accent: 'var(--color-accent)',
        'accent-light': 'var(--color-accent-light)',
        'accent-dark': 'var(--color-accent-dark)',
        positive: 'var(--color-positive)',
      },
      fontFamily: {
        masthead: ['UnifrakturCook', 'Old Standard TT', 'Georgia', 'serif'],
        headline: ['Playfair Display', 'Old Standard TT', 'Georgia', 'serif'],
        body: ['Source Serif 4', 'Georgia', 'Times New Roman', 'serif'],
        ui: ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      transitionTimingFunction: {
        paper: 'cubic-bezier(0.23, 1, 0.32, 1)',
        snap: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [typography],
} satisfies Config;

