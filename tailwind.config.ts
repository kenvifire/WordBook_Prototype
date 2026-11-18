import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--color-ink-muted) / <alpha-value>)',
        hairline: 'rgb(var(--color-hairline) / <alpha-value>)',
        locked: 'rgb(var(--color-locked) / <alpha-value>)',
        practicing: 'rgb(var(--color-practicing) / <alpha-value>)',
        unlocked: 'rgb(var(--color-unlocked) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
      },
      fontFamily: {
        ui: ['var(--font-figtree)', 'sans-serif'],
        reading: ['var(--font-source-serif)', 'serif'],
      },
      keyframes: {
        sweep: {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '100% 0' },
        },
      },
      animation: {
        // Gated behind Tailwind's motion-safe: variant wherever it's used
        // (a pure CSS media query, not a JS conditional) — the one
        // deliberate motion moment in this redesign, answering "is this
        // actually happening" for a pending generation.
        sweep: 'sweep 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
