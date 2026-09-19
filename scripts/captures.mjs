import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/**
 * Captures d'écran du site, pour vérifier ce qu'aucun test ne sait juger :
 * à quoi ça ressemble.
 *
 * Usage :  npm run build && npx next start -p 3100
 *          npm run captures            → ./captures/
 *          npm run captures -- /tmp/x  → ailleurs
 *
 * **Navigateur visible, comme pour la mesure de performance.** En headless,
 * Chromium n'a pas de GPU : les shaders se compilent en logiciel, le rendu
 * diffère, et une capture headless ne montrerait pas ce que voit un visiteur.
 *
 * Le script relève aussi les erreurs de console, ce qui est la seule façon de
 * savoir qu'un shader n'a pas compilé : un shader cassé ne fait pas planter la
 * page, il dessine simplement du noir.
 */
const DOSSIER = process.argv[2] ?? './captures'
mkdirSync(DOSSIER, { recursive: true })

const nav = await chromium.launch({ headless: false })
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const erreurs = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') erreurs.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => erreurs.push(`[pageerror] ${e.message}`))
// Une ressource manquante ne casse rien de visible mais reste une erreur :
// on releve l'URL, sinon la console dit seulement « 404 » sans dire de quoi.
page.on('response', (r) => {
  if (r.status() >= 400) erreurs.push(`[${r.status()}] ${r.url()}`)
})

await page.goto('http://localhost:3100/', { waitUntil: 'networkidle' })
// Laisse three.js se charger, les shaders compiler et la scène s'installer.
await page.waitForTimeout(3500)

const diag = await page.evaluate(() => {
  const cv = [...document.querySelectorAll('canvas')]
  return {
    canvas: cv.length,
    tailles: cv.map((c) => `${c.width}x${c.height}`),
    webgl2: (() => {
      try {
        return !!document.createElement('canvas').getContext('webgl2')
      } catch {
        return false
      }
    })(),
    coeurs: navigator.hardwareConcurrency,
  }
})

console.log('canvas montes :', diag.canvas, diag.tailles.join(' , '))
console.log('webgl2 :', diag.webgl2, '| coeurs :', diag.coeurs)

await page.screenshot({ path: `${DOSSIER}/01-hero.png` })

await page.evaluate(() => document.querySelector('#catalogue')?.scrollIntoView())
await page.waitForTimeout(2500)
await page.screenshot({ path: `${DOSSIER}/02-catalogue.png` })

// Survol d'une carte, pour voir la caisse s'incliner et accélérer.
const carte = page.locator('a[href^="/packs/"]').first()
await carte.hover()
await page.waitForTimeout(1200)
await page.screenshot({ path: `${DOSSIER}/03-survol.png` })

await page.goto('http://localhost:3100/packs/asie-verifiee', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${DOSSIER}/04-fiche.png` })

console.log('\nconsole :', erreurs.length ? '' : 'aucune erreur ni avertissement')
for (const e of erreurs.slice(0, 15)) console.log('  ' + e)

await nav.close()
