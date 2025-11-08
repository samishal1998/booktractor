/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Include shared app package
    '../../packages/app/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  important: 'html',
  theme: {
    extend: {},
  },
  plugins: [],
}
