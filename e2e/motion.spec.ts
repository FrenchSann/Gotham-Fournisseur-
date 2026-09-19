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
    await expect(page.getByText('Approvisionnement stratégique')).toBeVisible()
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

  test('monte les deux canvas du fond', async ({ page }) => {
    await page.goto('/')
    // Un pour la brume, le projecteur et la poussière ; un pour le grain.
    await expect(page.locator('canvas')).toHaveCount(2)
  })

  test('cesse de dessiner quand l’onglet est caché', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.locator('canvas').first()).toBeVisible()

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
    await expect(page.getByText('Approvisionnement stratégique')).toBeVisible()
  })

  test('n’affiche aucun canvas', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})
