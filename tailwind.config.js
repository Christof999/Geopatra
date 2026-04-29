/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0f0f11',
        surface: '#1a1a1f',
        border: '#2a2a33',
        accent: '#6366f1',
        'accent-dim': '#4f46e5',
        muted: '#4b5563',
        subtle: '#374151',
      },
    },
  },
  plugins: [],
}

