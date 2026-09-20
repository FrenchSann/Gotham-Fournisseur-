import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PACKS } from '@/content/packs'

/**
 * La route de paiement.
 *
 * **Écrit avant la route elle-même**, et ce n'est pas un rituel : c'est le
 * seul endroit du site où une erreur coûte de l'argent réel. Le test qui
 * compte est celui du milieu — un client qui envoie son propre prix doit être
 * débité du prix du catalogue. Il est facile à écrire avant, et on n'y pense
 * plus une fois la route écrite et « qui marche ».
 *
 * Stripe est remplacé par une doublure qui enregistre ce qu'on lui demande.
 * On ne teste pas Stripe ; on teste ce qu'on lui envoie.
 */

const creerSession = vi.fn()

vi.mock('@/lib/stripe', () => ({
  stripe: () => ({ checkout: { sessions: { create: creerSession } } }),
}))

const PACK = PACKS[0]

async function appeler(corps: unknown, options: { texteBrut?: string } = {}) {
  const { POST } = await import('@/app/api/checkout/route')
  const requete = new Request('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: options.texteBrut ?? JSON.stringify(corps),
  })
  const reponse = await POST(requete as never)
  return { statut: reponse.status, corps: await reponse.json() }
}

beforeEach(() => {
  creerSession.mockReset()
  creerSession.mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/c/cs_test_123',
  })
})

describe('création de session', () => {
  it('rend l’URL de paiement pour un slug connu', async () => {
    const { statut, corps } = await appeler({ slug: PACK.slug })

    expect(statut).toBe(200)
    expect(corps).toEqual({ url: 'https://checkout.stripe.com/c/cs_test_123' })
  })

  it('facture le montant du catalogue, en centimes et en euros', async () => {
    await appeler({ slug: PACK.slug })

    const [params] = creerSession.mock.calls[0]
    expect(params.line_items[0].price_data.unit_amount).toBe(PACK.prixCentimes)
    expect(params.line_items[0].price_data.currency).toBe('eur')
  })

  it('porte le slug et la référence dans les métadonnées', async () => {
    // C'est ce que le webhook lira pour savoir quel fichier livrer. Sans ça,
    // une commande payée n'est rattachable à aucun dossier.
    await appeler({ slug: PACK.slug })

    const [params] = creerSession.mock.calls[0]
    expect(params.metadata).toMatchObject({ slug: PACK.slug, ref: PACK.ref })
  })
})

describe('le client ne décide pas du prix', () => {
  it('ignore un montant envoyé par le navigateur', async () => {
    // **Le test qui justifie tout le fichier.** Un formulaire modifié dans les
    // outils de développement ne doit pas pouvoir acheter un dossier à un
    // centime. Le prix ne vient jamais de la requête.
    await appeler({
      slug: PACK.slug,
      prixCentimes: 1,
      unit_amount: 1,
      line_items: [{ price_data: { unit_amount: 1, currency: 'eur' } }],
      currency: 'usd',
    })

    const [params] = creerSession.mock.calls[0]
    expect(params.line_items).toHaveLength(1)
    expect(params.line_items[0].price_data.unit_amount).toBe(PACK.prixCentimes)
    expect(params.line_items[0].price_data.currency).toBe('eur')
  })

  it('refuse un slug inconnu sans appeler Stripe', async () => {
    const { statut } = await appeler({ slug: 'dossier-qui-nexiste-pas' })

    expect(statut).toBe(400)
    expect(creerSession).not.toHaveBeenCalled()
  })

  it('refuse une requête sans slug', async () => {
    expect((await appeler({})).statut).toBe(400)
    expect((await appeler({ slug: 42 })).statut).toBe(400)
    expect(creerSession).not.toHaveBeenCalled()
  })

  it('refuse un corps qui n’est pas du JSON', async () => {
    // Un corps illisible ne doit pas produire une erreur 500 : c'est une
    // requête invalide, pas une panne du serveur.
    const { statut } = await appeler(null, { texteBrut: 'ceci nest pas du json' })

    expect(statut).toBe(400)
    expect(creerSession).not.toHaveBeenCalled()
  })
})

describe('quand Stripe échoue', () => {
  it('rend une erreur neutre, sans détail technique', async () => {
    creerSession.mockRejectedValue(new Error('No such price: price_123 (account acct_42)'))

    const { statut, corps } = await appeler({ slug: PACK.slug })

    expect(statut).toBe(502)
    // Le message de Stripe peut contenir des identifiants de compte et de
    // ressource. Il va dans les journaux, jamais dans la réponse.
    expect(JSON.stringify(corps)).not.toMatch(/acct_|price_|No such/)
  })

  it('rend une erreur si Stripe ne donne pas d’URL', async () => {
    // Cas rare mais réel : une session créée sans URL de redirection. Sans ce
    // garde-fou, le bouton d'achat enverrait le client vers « undefined ».
    creerSession.mockResolvedValue({ id: 'cs_test_123', url: null })

    expect((await appeler({ slug: PACK.slug })).statut).toBe(502)
  })
})
