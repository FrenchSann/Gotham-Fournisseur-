import { beforeEach, describe, expect, it, vi } from 'vitest'
import { creerBoucle, type DependancesBoucle } from '@/lib/animation/boucle'

/**
 * Horloge et `requestAnimationFrame` pilotés à la main : on fait avancer le
 * temps image par image, sans dépendre de la cadence réelle de la machine.
 */
function creerNavigateurSimule() {
  let temps = 0
  let prochainId = 1
  let enAttente: { id: number; rappel: (t: number) => void } | null = null
  let cache = false
  const auditeurs = new Set<() => void>()

  const deps: DependancesBoucle = {
    demanderImage: (rappel) => {
      const id = prochainId++
      enAttente = { id, rappel }
      return id
    },
    annulerImage: (id) => {
      if (enAttente?.id === id) enAttente = null
    },
    maintenant: () => temps,
    estCache: () => cache,
    ecouterVisibilite: (rappel) => {
      auditeurs.add(rappel)
      return () => auditeurs.delete(rappel)
    },
  }

  return {
    deps,
    /** Avance d'une image de `pas` millisecondes. */
    avancer(pas: number) {
      temps += pas
      const image = enAttente
      enAttente = null
      image?.rappel(temps)
    },
    basculerVisibilite(nouvelEtatCache: boolean) {
      cache = nouvelEtatCache
      for (const cb of auditeurs) cb()
    },
    get imageEnAttente() {
      return enAttente !== null
    },
    get nombreAuditeursVisibilite() {
      return auditeurs.size
    },
  }
}

let navigateur: ReturnType<typeof creerNavigateurSimule>

beforeEach(() => {
  navigateur = creerNavigateurSimule()
})

describe('cycle de vie', () => {
  it('ne tourne pas tant que personne ne s’est abonné', () => {
    const boucle = creerBoucle(30, navigateur.deps)
    expect(boucle.enMarche).toBe(false)
    expect(navigateur.imageEnAttente).toBe(false)
  })

  it('démarre au premier abonné et s’arrête au dernier départ', () => {
    const boucle = creerBoucle(30, navigateur.deps)

    const desabonner = boucle.abonner(vi.fn())
    expect(boucle.enMarche).toBe(true)

    desabonner()
    // Une page sans fond animé ne doit rien réveiller du tout.
    expect(boucle.enMarche).toBe(false)
    expect(boucle.nombreAbonnes).toBe(0)
  })

  it('continue de tourner tant qu’il reste un abonné', () => {
    const boucle = creerBoucle(30, navigateur.deps)

    const retirerPremier = boucle.abonner(vi.fn())
    boucle.abonner(vi.fn())

    retirerPremier()
    expect(boucle.enMarche).toBe(true)
    expect(boucle.nombreAbonnes).toBe(1)
  })

  it('retire son écoute de visibilité quand plus personne n’est abonné', () => {
    const boucle = creerBoucle(30, navigateur.deps)

    const desabonner = boucle.abonner(vi.fn())
    expect(navigateur.nombreAuditeursVisibilite).toBe(1)

    desabonner()
    expect(navigateur.nombreAuditeursVisibilite).toBe(0)
  })
})

describe('bridage de la cadence', () => {
  it('ne dépasse pas la cadence demandée', () => {
    const boucle = creerBoucle(30, navigateur.deps)
    const abonne = vi.fn()
    boucle.abonner(abonne)

    // 20 images d'écran à 60 Hz = 333 ms. À 30 fps on en attend 10, pas 20.
    for (let i = 0; i < 20; i++) navigateur.avancer(16.67)

    expect(abonne.mock.calls.length).toBeLessThanOrEqual(11)
    expect(abonne.mock.calls.length).toBeGreaterThanOrEqual(9)
  })

  it('transmet le delta écoulé à ses abonnés', () => {
    const boucle = creerBoucle(30, navigateur.deps)
    const abonne = vi.fn()
    boucle.abonner(abonne)

    navigateur.avancer(40)

    const [delta, temps] = abonne.mock.calls[0]
    expect(delta).toBeCloseTo(40, 1)
    expect(temps).toBeCloseTo(40, 1)
  })
})

describe('onglet caché', () => {
  it('coupe tout quand l’onglet passe en arrière-plan', () => {
    const boucle = creerBoucle(30, navigateur.deps)
    const abonne = vi.fn()
    boucle.abonner(abonne)

    navigateur.basculerVisibilite(true)

    // C'est la batterie du téléphone qui est en jeu : zéro image rendue.
    expect(boucle.enMarche).toBe(false)
    expect(navigateur.imageEnAttente).toBe(false)

    const avant = abonne.mock.calls.length
    navigateur.avancer(100)
    expect(abonne.mock.calls.length).toBe(avant)
  })

  it('repart quand l’onglet revient au premier plan', () => {
    const boucle = creerBoucle(30, navigateur.deps)
    boucle.abonner(vi.fn())

    navigateur.basculerVisibilite(true)
    navigateur.basculerVisibilite(false)

    expect(boucle.enMarche).toBe(true)
  })

  it('ne démarre pas si l’onglet est déjà caché à l’abonnement', () => {
    navigateur.basculerVisibilite(true)
    const boucle = creerBoucle(30, navigateur.deps)

    boucle.abonner(vi.fn())

    expect(boucle.enMarche).toBe(false)
  })
})

describe('destruction', () => {
  it('coupe la boucle et oublie tous les abonnés', () => {
    const boucle = creerBoucle(30, navigateur.deps)
    boucle.abonner(vi.fn())
    boucle.abonner(vi.fn())

    boucle.detruire()

    expect(boucle.enMarche).toBe(false)
    expect(boucle.nombreAbonnes).toBe(0)
    expect(navigateur.nombreAuditeursVisibilite).toBe(0)
  })
})
