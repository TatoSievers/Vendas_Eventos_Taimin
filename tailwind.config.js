/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#67e8f9', // cyan-300
          DEFAULT: '#0891b2', // cyan-600
          dark: '#0e7490', // cyan-700
        },
        secondary: {
          light: '#f3f4f6', // gray-100
          DEFAULT: '#e5e7eb', // gray-200
          dark: '#d1d5db', // gray-300
        }
      }
    }
  },
  plugins: [],
};