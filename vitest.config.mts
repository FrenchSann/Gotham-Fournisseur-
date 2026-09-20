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

    /**
     * Variables d'environnement des tests.
     *
     * `lib/env.ts` refuse de charger si une clé manque — c'est tout son
     * intérêt, et ça vaut aussi ici : sans ces valeurs, importer la route de
     * paiement dans un test échouerait sur la validation avant d'avoir exécuté
     * la moindre assertion.
     *
     * Ce sont des valeurs factices, et elles doivent le rester. Aucun test ne
     * joint Stripe, Supabase ni Resend : les clients externes sont toujours
     * remplacés par des doublures. Une vraie clé ici finirait dans le dépôt.
     */
    env: {
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_doublure',
      NEXT_PUBLIC_SUPABASE_URL: 'https://doublure.supabase.co',
      STRIPE_SECRET_KEY: 'sk_test_doublure',
      STRIPE_WEBHOOK_SECRET: 'whsec_doublure',
      SUPABASE_SERVICE_ROLE_KEY: 'service_role_doublure',
      RESEND_API_KEY: 're_doublure',
      DOWNLOAD_TOKEN_SECRET: 'doublure_de_secret_sur_trente_deux_caracteres',
    },
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
