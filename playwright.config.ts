import { defineConfig, devices } from '@playwright/test'

/**
 * Les tests de bout en bout tournent sur un **build de production**, pas sur
 * le serveur de développement : les animations, la génération statique et la
 * CSP se comportent différemment en dev, et ce sont précisément ces trois
 * choses qu'on vérifie ici.
 */
const PORT = 3100
const BASE = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'bureau',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
