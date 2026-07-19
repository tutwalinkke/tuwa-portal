/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0F1A',
          900: '#101A2E',
          850: '#141F35',
          800: '#182238',
          700: '#1B2740',
        },
        signal: {
          DEFAULT: '#F5A623',
          dim: '#B87A16',
        },
        status: {
          up: '#34D399',
          down: '#FB7185',
          warn: '#F59E0B',
        },
        mist: {
          400: '#8B9CB0',
          200: '#C5D0DC',
          50: '#F2F5F8',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
