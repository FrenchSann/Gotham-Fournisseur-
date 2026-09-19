import { afterEach, describe, expect, it, vi } from 'vitest'
import { creerSourceMedia } from '@/lib/animation/media'
import { MOUVEMENT_REDUIT } from '@/lib/animation/use-reduced-motion'

/** Remplace `window.matchMedia`, que jsdom ne sait pas faire varier. */
function simulerPreference(correspond: boolean) {
  const auditeurs = new Set<(e: MediaQueryListEvent) => void>()

  const liste = {
    matches: correspond,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => auditeurs.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => auditeurs.delete(cb),
  }

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => liste)
  )

  return {
    /** Simule l'utilisateur qui change son réglage système en cours de visite. */
    basculer(nouvelle: boolean) {
      liste.matches = nouvelle
      for (const cb of auditeurs) cb({ matches: nouvelle } as MediaQueryListEvent)
    },
    get nombreAuditeurs() {
      return auditeurs.size
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('préférence de mouvement réduit', () => {
  it('rend true quand la préférence est active', () => {
    simulerPreference(true)
    expect(MOUVEMENT_REDUIT.lire()).toBe(true)
  })

  it('rend false quand elle ne l’est pas', () => {
    simulerPreference(false)
    expect(MOUVEMENT_REDUIT.lire()).toBe(false)
  })

  it('suppose « mouvement réduit » quand matchMedia est indisponible', () => {
    vi.stubGlobal('matchMedia', undefined)
    // Ne jamais animer par défaut : une animation imprévue chez quelqu'un de
    // sensible au mouvement coûte plus cher qu'une ambiance manquante.
    expect(MOUVEMENT_REDUIT.lire()).toBe(true)
  })

  it('suppose « mouvement réduit » au rendu serveur', () => {
    expect(MOUVEMENT_REDUIT.lireCoteServeur()).toBe(true)
  })
})

describe('abonnement', () => {
  it('notifie quand la préférence change en cours de visite', () => {
    const media = simulerPreference(false)
    const rappel = vi.fn()

    MOUVEMENT_REDUIT.sabonner(rappel)
    media.basculer(true)

    // Quelqu'un qui active le réglage parce que le site le gêne doit être
    // soulagé tout de suite, pas au prochain chargement.
    expect(rappel).toHaveBeenCalledTimes(1)
    expect(MOUVEMENT_REDUIT.lire()).toBe(true)
  })

  it('retire proprement son auditeur', () => {
    const media = simulerPreference(false)

    const desabonner = MOUVEMENT_REDUIT.sabonner(vi.fn())
    expect(media.nombreAuditeurs).toBe(1)

    desabonner()
    expect(media.nombreAuditeurs).toBe(0)
  })

  it('ne casse pas quand matchMedia est indisponible', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(() => MOUVEMENT_REDUIT.sabonner(vi.fn())()).not.toThrow()
  })
})

describe('valeur prudente par défaut', () => {
  it('rend la valeur par défaut choisie, pas systématiquement true', () => {
    // Le curseur réticule s'appuie sur une source dont le défaut est false :
    // sans preuve de pointeur précis, on ne remplace pas le curseur système.
    vi.stubGlobal('matchMedia', undefined)
    const pointeur = creerSourceMedia('(pointer: fine)', false)
    expect(pointeur.lire()).toBe(false)
    expect(pointeur.lireCoteServeur()).toBe(false)
  })
})
