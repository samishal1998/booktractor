/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    '../../packages/app/**/*.{js,jsx,ts,tsx}',
    '@booktractor/app/**/*.{js,jsx,ts,tsx}',

  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
}
