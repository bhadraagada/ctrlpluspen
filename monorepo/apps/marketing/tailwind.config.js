/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'space-mono': ['"Space Mono"', 'monospace'],
        'courier': ['"Courier Prime"', 'monospace'],
        'outfit': ['"Outfit Variable"', 'sans-serif'],
        'bebas': ['"Bebas Neue"', 'sans-serif'],
        'caveat': ['"Caveat Variable"', 'cursive'],
      },
    },
  },
  plugins: [],
}
