/** @type {import('tailwindcss').Config} */
// Colours are CSS variables set per theme in src/index.css (DESIGN.md has the palette).
// `rgb(var(--c-x) / <alpha-value>)` keeps Tailwind's opacity modifiers working: bg-accent/10.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ground: token('ground'),
        card: token('card'),
        raised: token('raised'),
        ink: token('ink'),
        muted: token('muted'),
        faint: token('faint'),
        accent: {
          DEFAULT: token('accent'),
          strong: token('accent-strong'),
        },
        'on-accent': token('on-accent'),
        good: token('good'),
        warn: token('warn'),
        danger: token('danger'),
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        chip: '10px',
        field: '11px',
        btn: '14px',
        card: '22px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      maxWidth: {
        column: '760px',
      },
    },
  },
  plugins: [],
}
