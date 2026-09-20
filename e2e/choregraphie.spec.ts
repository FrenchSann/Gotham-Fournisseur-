import { expect, test } from '@playwright/test'

/**
 * Les promesses de la choréographie.
 *
 * Aucun de ces tests ne juge si l'effet est réussi — ça, il faut le regarder.
 * Ils tiennent les quatre engagements sans lesquels la choréographie ne serait
 * pas acceptable : le contenu existe sans elle, le mouvement réduit l'éteint,
 * une navigation ne laisse rien derrière elle, et la section épinglée rend la
 * page au défilement normal une fois parcourue.
 */

test.describe('le contenu ne dépend pas de la choréographie', () => {
  test.use({ javaScriptEnabled: false })

  test('sert le titre final, pas des glyphes', async ({ page }) => {
    await page.goto('/')
    // Le décodage lit le texte servi pour connaître sa cible. Si un jour
    // quelqu'un inverse et sert les glyphes en attendant le script, ce test
    // tombe — et avec lui, tout le référencement du site.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Arsenal\s+Noir/)
  })

  test('sert les vrais chiffres des compteurs', async ({ page }) => {
    await page.goto('/')
    // Les compteurs partent de zéro *depuis le script*. Servir un zéro serait
    // afficher un chiffre faux à qui n'exécute pas de JavaScript, moteurs de
    // recherche compris.
    await expect(page.getByText('Fournisseurs', { exact: true }).locator('..')).not.toHaveText(
      /\b0\b/
    )
  })
})

test.describe('mouvement réduit', () => {
  test.use({ reducedMotion: 'reduce' })

  test('affiche le titre en clair, sans décodage', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Arsenal\s+Noir/)
  })

  test('ne masque aucun bloc', async ({ page }) => {
    await page.goto('/')
    // Le masquage vient du script. En mouvement réduit le script ne masque
    // rien : aucun bloc ne doit porter de découpe résiduelle.
    const blocs = page.locator('[data-revelation]')
    await expect(blocs.first()).toBeVisible()

    const decoupes = await blocs.evaluateAll((elements) =>
      elements.map((e) => getComputedStyle(e).clipPath).filter((v) => v && v !== 'none')
    )
    expect(decoupes).toEqual([])
  })

  test('ne charge pas le moteur d’animation', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3500)
    // Pas seulement « n'anime pas » : ne télécharge pas. Une cinquantaine de
    // kilo-octets qu'on ne demande pas à qui n'en veut pas.
    const sonde = await page.evaluate(
      () => typeof (window as Window & { __scrollTriggers?: unknown }).__scrollTriggers
    )
    expect(sonde).toBe('undefined')
  })
})

test.describe('cycle de vie', () => {
  test.use({ reducedMotion: 'no-preference' })

  /** Attend que le moteur soit chargé et rende son compte de déclencheurs. */
  async function compter(page: import('@playwright/test').Page) {
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as Window & { __scrollTriggers?: () => number }).__scrollTriggers?.() ?? -1
          ),
        { timeout: 15_000 }
      )
      .toBeGreaterThan(0)

    return page.evaluate(
      () => (window as Window & { __scrollTriggers?: () => number }).__scrollTriggers?.() ?? -1
    )
  }

  test('ne laisse pas de déclencheurs derrière elle', async ({ page }) => {
    await page.goto('/')
    const depart = await compter(page)

    // Cinq allers-retours. Une fuite se voit dès le deuxième, mais un compte
    // qui grimpe lentement demande un peu de patience pour sortir du bruit.
    for (let i = 0; i < 5; i++) {
      await page.goto('/packs/textile-europe')
      await compter(page)
      await page.goto('/')
      await compter(page)
    }

    // Marge de deux : le compte exact dépend de la largeur de l'écran (la
    // section épinglée n'existe qu'au-dessus de 768 px) et de l'instant où les
    // déclencheurs à usage unique se suppriment eux-mêmes. Ce qu'on refuse,
    // c'est une croissance — dix navigations multiplieraient le compte.
    expect(await compter(page)).toBeLessThanOrEqual(depart + 2)
  })
})
