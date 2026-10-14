/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          primary: '#0F766E',      // Muted medical teal
          primaryHover: '#0D6D65',
          secondary: '#DDF4EA',    // Soft mint
          mint: '#DDF4EA',
          mintLight: '#F0FDF8',
          bg: '#F8FAFC',          // Soft off-white
          surface: '#FFFFFF',     // Clean white
          text: '#1E293B',        // Deep slate
          muted: '#64748B',       // Muted slate
          border: '#E2E8F0',      // Subtle light grey
        },
        cardio: {
          teal: '#0F766E',
          mint: '#DDF4EA',
          lad: '#0284C7',
          lcx: '#7C3AED',
          rca: '#D97706',
          cad: '#0F766E'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
