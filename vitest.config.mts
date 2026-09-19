import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Extension .mts volontaire : chargée nativement en ESM par Vite, sans passer
// par la couche CommonJS dépréciée.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Le seuil ne porte que sur la logique métier. On ne met pas de
      // pourcentage sur les composants de présentation : on y teste le
      // comportement, pas le balisage.
      include: ['src/lib/**', 'src/app/api/**', 'src/content/**'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
})
