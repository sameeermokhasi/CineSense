/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          950: '#06070a',
          900: '#0b0d14',
          850: '#10131e',
          800: '#161a29',
          700: '#22283e',
          600: '#343c5b',
          accent: '#06b6d4',      // Neon Cyan
          violet: '#8b5cf6',      // Electric Violet
          amber: '#f59e0b',       // Warm Amber Gold
          crimson: '#f43f5e',     // Cinema Red
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
        'neon-violet': '0 0 25px rgba(139, 92, 246, 0.45)',
        'neon-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
