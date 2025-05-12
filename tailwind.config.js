/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      minHeight: {
        'screen': '100vh',
      },
      maxHeight: {
        'screen': '100vh',
      },
    },
  },
  plugins: [],
}
