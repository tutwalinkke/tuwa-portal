/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Void-black surface scale, adapted from a design reference —
        // real hex values, not fabricated. Same token NAMES as before
        // (ink.950/900/etc) so every already-built page picks up the
        // new palette automatically without needing markup changes.
        ink: {
          950: '#06080D',
          900: '#0B0E15',
          850: '#0E1119',
          800: '#0C0F17',
          700: '#1C2029',
        },
        // Blue/cyan technical accent replaces the amber "signal"
        // accent — same token name, new color story.
        signal: {
          DEFAULT: '#3B9EFF',
          dim: '#1D7EE0',
        },
        cyan: {
          DEFAULT: '#22D3EE',
        },
        status: {
          up: '#22C55E',
          down: '#EF4444',
          warn: '#F59E0B',
        },
        mist: {
          400: '#8D94A8',
          200: '#B9C0CF',
          50: '#EEF1F7',
        },
        // New: a genuine tertiary text tone the old palette didn't
        // have, used for the smallest/least-important labels.
        dim: {
          DEFAULT: '#565D70',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        // Sharp, technical radii from the same reference — smaller
        // than Tailwind's defaults, replacing the previous rounded
        // look card-by-card as pages get updated.
        DEFAULT: '5px',
      },
    },
  },
  plugins: [],
}
