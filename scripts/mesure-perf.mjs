import { chromium, devices } from '@playwright/test'

/**
 * Mesure de la fluidité du fond animé.
 *
 * Usage :  npm run build
 *          npx next start -p 3100
 *          npm run perf
 *          npm run perf -- http://localhost:3100/packs/textile-europe
 *
 * **Le navigateur est lancé en mode visible, et ce n'est pas un oubli.**
 * En headless, Chromium n'a pas de GPU : le canvas et la composition passent
 * en rendu logiciel, et la même page tombe à 16 fps au lieu de 60. Une mesure
 * headless de ce site ne mesure pas le site, elle mesure l'absence de carte
 * graphique. Si un jour cette ligne repasse en `headless: true`, les chiffres
 * deviendront alarmants sans qu'aucune régression n'ait eu lieu.
 *
 * Seuils, repris de SPEC.md § 2 bis et de la porte 2 du plan :
 *
 *   - **aucune tâche longue.** C'est le critère dur. Une tâche longue veut
 *     dire que le thread principal a été bloqué : l'interface ne répondait
 *     plus, et aucun nombre de fps ne rachète ça.
 *   - **p95 de l'intervalle ≤ 34 ms**, c'est-à-dire jamais en dessous de
 *     30 fps. Le spec demande « 30 fps stables », pas 60 : le fond est bridé
 *     à 30 par conception, et sur un appareil bas de gamme des images à
 *     33 ms sont le fonctionnement nominal, pas une régression.
 *
 * Le taux d'images au-dessus de 20 ms est affiché à titre indicatif. Il
 * mesure l'écart au plein 60 fps, ce qui intéresse pour suivre une tendance,
 * mais n'est pas un critère de passage.
 */

const URL_CIBLE = process.argv[2] ?? 'http://localhost:3100/'
const DUREE_MS = 4000

async function mesurer(nom, options = {}, bridage = 1) {
  const nav = await chromium.launch({ headless: false })
  const ctx = await nav.newContext(options)
  const page = await ctx.newPage()

  if (bridage > 1) {
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: bridage })
  }

  await page.goto(URL_CIBLE)
  await page.waitForTimeout(1000) // hydratation et premier rendu

  const r = await page.evaluate(
    (duree) =>
      new Promise((resolve) => {
        const intervalles = []
        let longtasks = 0

        const obs = new PerformanceObserver((l) => {
          for (const e of l.getEntries()) longtasks += e.duration
        })
        try {
          obs.observe({ entryTypes: ['longtask'] })
        } catch {
          // Pas de support longtask : on mesure quand même les intervalles.
        }

        let precedent = performance.now()
        const debut = precedent

        const tick = (t) => {
          intervalles.push(t - precedent)
          precedent = t
          if (t - debut < duree) {
            requestAnimationFrame(tick)
            return
          }
          obs.disconnect()
          intervalles.sort((a, b) => a - b)
          resolve({
            fps: 1000 / (intervalles.reduce((a, b) => a + b, 0) / intervalles.length),
            mediane: intervalles[Math.floor(intervalles.length / 2)],
            p95: intervalles[Math.floor(intervalles.length * 0.95)],
            lentes: intervalles.filter((v) => v > 20).length,
            total: intervalles.length,
            longtasks: Math.round(longtasks),
          })
        }
        requestAnimationFrame(tick)
      }),
    DUREE_MS
  )

  await nav.close()

  const tauxLent = (r.lentes / r.total) * 100
  const verdict = r.longtasks === 0 && r.p95 <= 34 ? 'OK' : 'A CORRIGER'

  console.log(`\n  ${nom}  [${verdict}]`)
  console.log(`    fps moyen         : ${r.fps.toFixed(1)}`)
  console.log(`    intervalle median : ${r.mediane.toFixed(2)} ms`)
  console.log(`    intervalle p95    : ${r.p95.toFixed(2)} ms   (critere : <= 34 ms)`)
  console.log(`    taches longues    : ${r.longtasks} ms sur ${DUREE_MS} ms   (critere : 0)`)
  console.log(
    `    images > 20 ms    : ${r.lentes}/${r.total} (${tauxLent.toFixed(1)} %)   indicatif`
  )

  return verdict === 'OK'
}

console.log(`\nMesure de ${URL_CIBLE} — GPU reel, navigateur visible`)

const resultats = [
  await mesurer('Bureau 1280x720', { viewport: { width: 1280, height: 720 } }),
  await mesurer('Mobile milieu de gamme (CPU bride x4)', { ...devices['Pixel 7'] }, 4),
  await mesurer('Mobile bas de gamme (CPU bride x6)', { ...devices['Pixel 7'] }, 6),
]

console.log('')
process.exit(resultats.every(Boolean) ? 0 : 1)
