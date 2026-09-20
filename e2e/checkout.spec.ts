import { expect, test } from '@playwright/test'

/**
 * Le tunnel de paiement.
 *
 * Stripe n'est jamais joint : la route `/api/checkout` est interceptée. Ce
 * qu'on vérifie n'est pas que Stripe fonctionne — c'est le nôtre qui doit
 * l'être — mais que **le bouton envoie le strict minimum**, qu'il redirige
 * quand on lui donne une URL, qu'il ne laisse pas le client devant un écran
 * muet quand ça échoue, et que la page de remerciement ne livre rien.
 */

const FICHE = '/packs/textile-europe'

/**
 * Ouvre la fiche et rend le bouton d'achat.
 *
 * **Le clic est répété jusqu'à ce qu'il produise son effet**, et ce n'est pas
 * une facilité. Playwright clique dès qu'un élément est visible et stable,
 * c'est-à-dire potentiellement avant que React n'ait hydraté la page : le
 * balisage est là, le gestionnaire pas encore, et le clic part dans le vide.
 * Attendre le silence du réseau ne suffit pas sur les pages de la vitrine, qui
 * chargent three.js et GSAP à un temps mort — le silence peut arriver *après*
 * le délai imparti au test.
 *
 * Cliquer plusieurs fois est sans conséquence ici : la route est interceptée,
 * et un vrai double-clic est de toute façon neutralisé par l'état désactivé du
 * bouton pendant la requête.
 */
async function ouvrirLaFiche(page: import('@playwright/test').Page) {
  await page.goto(FICHE)
  return page.getByRole('button', { name: /obligation de paiement/i })
}

async function cliquerJusquA(
  bouton: import('@playwright/test').Locator,
  atteint: () => unknown | Promise<unknown>
) {
  await expect
    .poll(
      async () => {
        await bouton.click({ trial: false }).catch(() => {})
        return atteint()
      },
      { timeout: 20_000, intervals: [300, 500, 1000] }
    )
    .toBeTruthy()
}

test.describe('bouton d’achat', () => {
  test('porte la mention légale obligatoire', async ({ page }) => {
    await page.goto(FICHE)

    // Article L221-14 du Code de la consommation : le bouton qui déclenche un
    // paiement doit le dire sans ambiguïté. « Valider » rend la commande
    // contestable.
    await expect(page.getByRole('button', { name: /obligation de paiement/i })).toBeVisible()
  })

  test('n’envoie qu’un slug', async ({ page }) => {
    let corps: unknown = null

    await page.route('**/api/checkout', async (route) => {
      corps = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.test/paiement' }),
      })
    })

    const bouton = await ouvrirLaFiche(page)
    await cliquerJusquA(bouton, () => corps !== null)

    // Aucun prix, aucune devise, aucun identifiant de produit. Le serveur les
    // lit dans le catalogue, et lui seul.
    expect(corps).toEqual({ slug: 'textile-europe' })
  })

  test('redirige vers l’URL rendue par le serveur', async ({ page }) => {
    let appele = false

    await page.route('**/api/checkout', (route) => {
      // On arrête de cliquer dès que la requête est partie, et pas seulement
      // quand l'URL a changé : un clic de plus pendant que la navigation
      // s'amorce l'annule, et le test échoue alors uniquement quand la machine
      // est chargée — c'est-à-dire en exécutant toute la suite.
      appele = true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.test/paiement' }),
      })
    })
    // La destination est hors du site : on l'arrête pour ne pas dépendre du
    // réseau, mais le fait d'y aller est ce qu'on vérifie.
    await page.route('https://example.test/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Stripe</h1>' })
    )

    const bouton = await ouvrirLaFiche(page)
    await cliquerJusquA(bouton, () => appele)

    await expect(page).toHaveURL('https://example.test/paiement')
  })

  test('annonce l’échec sans quitter la page', async ({ page }) => {
    await page.route('**/api/checkout', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ erreur: 'Le paiement est momentanément indisponible.' }),
      })
    )

    const bouton = await ouvrirLaFiche(page)

    // `filter` et non `getByRole('alert')` seul : Next monte en permanence son
    // annonceur de route, qui porte lui aussi `role="alert"`. Sans filtre, le
    // sélecteur en trouve deux et Playwright refuse de choisir.
    const alerte = page.getByRole('alert').filter({ hasText: /débité/i })
    await cliquerJusquA(bouton, () => alerte.count().then((n) => n > 0))

    // Ce que le client doit lire : rien n'a été débité. Et le bouton doit
    // redevenir cliquable, sinon la seule issue est de recharger la page.
    await expect(alerte).toContainText(/rien n’a été débité/i)
    await expect(bouton).toBeEnabled()
    await expect(page).toHaveURL(new RegExp(`${FICHE}$`))
  })
})

test.describe('page de remerciement', () => {
  test('ne monte aucune couche d’ambiance', async ({ page }) => {
    await page.goto('/merci?session_id=cs_test_demonstration')
    // Règle du spec : aucune animation sur le tunnel de paiement. Le groupe de
    // routes `(transaction)` le garantit structurellement ; ce test garantit
    // que personne n'a déplacé la page dans l'autre groupe.
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('ne livre rien et le dit', async ({ page }) => {
    const telechargements: string[] = []
    page.on('request', (r) => {
      if (/\.(pdf|xlsx|zip)(\?|$)/i.test(r.url())) telechargements.push(r.url())
    })

    await page.goto('/merci?session_id=cs_test_demonstration')

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/arrive par email/i)
    expect(telechargements).toEqual([])
  })

  test('affiche la référence de transaction quand elle est fournie', async ({ page }) => {
    await page.goto('/merci?session_id=cs_test_demonstration')
    await expect(page.getByText(/cs_test_demonstration/)).toBeVisible()
  })

  test('reste lisible sans référence', async ({ page }) => {
    // L'URL est devinable : quelqu'un finira par l'ouvrir sans paramètre, et la
    // page ne doit pas se casser pour autant.
    await page.goto('/merci')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
