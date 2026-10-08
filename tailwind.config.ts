import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: '#141a12',
        carta: '#1f2a1c',
        bordo: '#2a3424',
        testo: '#e9eee4',
        tenue: '#9aa78f',
        accento: '#b6d36b',
        avviso: '#e8a33d',
        errore: '#e0584b',
        ok: '#6bd38a',
      },
    },
  },
  plugins: [],
} satisfies Config;
