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
          950: '#0B1420',
          900: '#111D2E',
          800: '#1C2C40',
          700: '#2A3F58',
        },
        signal: {
          DEFAULT: '#F5A623',
          dim: '#B87A16',
        },
        status: {
          up: '#22C55E',
          down: '#EF4444',
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
