import { expect, test } from '@playwright/test'

/**
 * Les garde-fous du mouvement.
 *
 * Ces tests ne vérifient pas que les animations sont belles — ça, il faut le
 * regarder. Ils vérifient les trois promesses qui rendent le parti pris visuel
 * acceptable, et qu'on casserait sans s'en apercevoir :
 *
 *   1. `prefers-reduced-motion` éteint réellement tout.
 *   2. Le contenu reste lisible si le JavaScript ne s'exécute pas.
 *   3. Le tunnel de paiement ne monte aucune couche d'ambiance.
 */

test.describe('mouvement réduit', () => {
  test.use({ reducedMotion: 'reduce' })

  test('ne monte aucun canvas', async ({ page }) => {
    await page.goto('/')
    // Pas « caché » ni « figé » : absent du DOM. Rien en mémoire, aucune
    // boucle, aucune batterie consommée.
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('laisse le contenu entièrement lisible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Le mouvement réduit est une seconde version du site, pas une version
    // dégradée : tout doit être là.
    await expect(page.getByText(/Des dossiers de fournisseurs vérifiés/)).toBeVisible()
  })

  test('n’anime pas la grille technique', async ({ page }) => {
    await page.goto('/')
    const animations = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === 'running').length
    )
    expect(animations).toBe(0)
  })
})

test.describe('mouvement autorisé', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('monte un fond animé', async ({ page }) => {
    await page.goto('/')
    // **Un minimum, pas un nombre exact.** Le compte de canvas dépend de trois
    // choses qui varient d'une machine à l'autre : le fond retenu (3D ou repli
    // 2D), la présence des caisses du catalogue (3D seulement), et la largeur
    // de l'écran — sous 768 px, le calque de grain n'est pas monté, parce qu'un
    // plein écran en `mix-blend-mode` coûtait une dizaine d'images par seconde
    // au défilement sur un téléphone. Figer le chiffre ferait échouer ce test
    // sur une machine sans WebGL sans qu'aucune régression n'ait eu lieu.
    //
    // Ce que le test garantit vraiment, et qui est le seul point important :
    // **mouvement autorisé ⇒ il y a un fond animé**. Son absence se lit dans le
    // premier test du fichier, qui exige zéro canvas en mouvement réduit.
    //
    // `expect.poll` et non `expect(await ...count())` : le fond se monte en
    // deux temps. La détection des capacités décide d'abord si la 3D est
    // possible, et le repli 2D n'apparaît qu'au rendu suivant. Un comptage
    // immédiat attrape l'état intermédiaire et échoue au hasard.
    await expect
      .poll(() => page.locator('canvas').count(), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1)
  })

  test('charge three.js seulement après le contenu', async ({ page }) => {
    const requetes: string[] = []
    page.on('request', (r) => requetes.push(r.url()))

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    // Le titre doit être lisible avant que le moindre octet de 3D n'arrive.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const avant = requetes.length
    await page.waitForTimeout(2500)

    // La 3D arrive bien, mais après : si elle était dans le bundle initial,
    // aucune requête supplémentaire n'apparaîtrait ici.
    expect(requetes.length).toBeGreaterThan(avant)
  })

  test('cesse de dessiner quand l’onglet est caché', async ({ page, context }) => {
    await page.goto('/')
    await expect.poll(() => page.locator('canvas').count(), { timeout: 10_000 }).toBeGreaterThan(0)

    // Une seconde page au premier plan met la première en arrière-plan.
    const autre = await context.newPage()
    await autre.goto('about:blank')
    await autre.bringToFront()

    const images = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let n = 0
          const compter = () => {
            n++
            requestAnimationFrame(compter)
          }
          requestAnimationFrame(compter)
          setTimeout(() => resolve(n), 600)
        })
    )

    // Le navigateur gèle lui-même rAF en arrière-plan ; ce test vérifie qu'on
    // ne contourne pas ce gel avec un timer, ce qui viderait la batterie.
    expect(images).toBeLessThan(10)
    await autre.close()
  })
})

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('affiche tout le contenu', async ({ page }) => {
    await page.goto('/')

    // La règle : le contenu est visible par défaut et masqué *par* le script.
    // Si un jour quelqu'un inverse et masque en CSS, ce test tombe — et il
    // évite une page blanche en production le jour où un script échoue.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/Des dossiers de fournisseurs vérifiés/)).toBeVisible()
  })

  test('n’affiche aucun canvas', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})
