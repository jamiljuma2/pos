import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        panel: 'hsl(var(--panel))',
        line: 'hsl(var(--line))',
        text: 'hsl(var(--text))',
        muted: 'hsl(var(--muted))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        }
      },
      boxShadow: {
        glow: '0 24px 80px -24px rgba(15, 118, 110, 0.55)'
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
        aurora:
          'radial-gradient(circle at top left, rgba(45,212,191,0.24), transparent 34%), radial-gradient(circle at top right, rgba(251,191,36,0.16), transparent 30%), radial-gradient(circle at bottom, rgba(14,165,233,0.14), transparent 26%)'
      }
    }
  },
  plugins: []
};

export default config;
