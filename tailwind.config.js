/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        raised: v('raised'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        accent: v('accent'),
        'accent-ink': v('accent-ink'),
        protein: v('protein'),
        carb: v('carb'),
        fat: v('fat'),
        water: v('water'),
        warn: v('warn'),
        danger: v('danger'),
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem' },
      transitionTimingFunction: { soft: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
};
