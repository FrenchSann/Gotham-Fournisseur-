import { FPS } from './motion-tokens'

/**
 * Ordonnanceur d'animation : une seule boucle pour tout le fond.
 *
 * Pourquoi un ordonnanceur plutôt qu'un `requestAnimationFrame` par effet :
 * la brume, le projecteur, la poussière et le grain tournent en permanence.
 * Quatre boucles concurrentes, ce sont quatre réveils du navigateur par image,
 * quatre endroits où oublier de couper, et aucun endroit unique où corriger
 * quand la performance dérape. Ici il y en a un seul.
 *
 * Trois garanties, et ce sont elles qui comptent plus que le code :
 *   - Rien ne tourne tant que personne n'est abonné.
 *   - Rien ne tourne quand l'onglet est caché (batterie du téléphone).
 *   - La cadence est bridée : 30 fps suffisent pour une dérive lente, et on
 *     économise la moitié des images.
 */

export type Abonne = (deltaMs: number, tempsMs: number) => void

/**
 * Dépendances injectables. En production ce sont les API du navigateur ;
 * dans les tests, des doublures qui laissent avancer le temps à la main.
 */
export interface DependancesBoucle {
  demanderImage: (rappel: (temps: number) => void) => number
  annulerImage: (id: number) => void
  maintenant: () => number
  estCache: () => boolean
  ecouterVisibilite: (rappel: () => void) => () => void
}

export interface Boucle {
  abonner: (abonne: Abonne) => () => void
  readonly enMarche: boolean
  readonly nombreAbonnes: number
  /** Coupe tout et oublie les abonnés. À appeler au démontage. */
  detruire: () => void
}

function dependancesNavigateur(): DependancesBoucle {
  return {
    demanderImage: (rappel) => requestAnimationFrame(rappel),
    annulerImage: (id) => cancelAnimationFrame(id),
    maintenant: () => performance.now(),
    estCache: () => document.visibilityState === 'hidden',
    ecouterVisibilite: (rappel) => {
      document.addEventListener('visibilitychange', rappel)
      return () => document.removeEventListener('visibilitychange', rappel)
    },
  }
}

export function creerBoucle(fps: number = FPS.fond, deps?: DependancesBoucle): Boucle {
  const d = deps ?? dependancesNavigateur()
  const intervalleCible = 1000 / fps

  const abonnes = new Set<Abonne>()
  let idImage: number | null = null
  let tempsDerniereImage = 0
  let retirerEcouteVisibilite: (() => void) | null = null

  function image(temps: number) {
    idImage = d.demanderImage(image)

    const ecoule = temps - tempsDerniereImage
    // Bridage : on laisse passer l'image seulement si l'intervalle cible est
    // atteint. Le `- 1` absorbe la gigue des écrans 60 Hz, sans quoi une image
    // sur deux serait rejetée de justesse et la cadence tomberait à 20 fps.
    if (ecoule < intervalleCible - 1) return

    tempsDerniereImage = temps
    for (const abonne of abonnes) abonne(ecoule, temps)
  }

  function demarrer() {
    if (idImage !== null || abonnes.size === 0 || d.estCache()) return
    tempsDerniereImage = d.maintenant()
    idImage = d.demanderImage(image)
  }

  function arreter() {
    if (idImage === null) return
    d.annulerImage(idImage)
    idImage = null
  }

  function auChangementDeVisibilite() {
    if (d.estCache()) arreter()
    else demarrer()
  }

  return {
    abonner(abonne: Abonne) {
      abonnes.add(abonne)

      // L'écoute de la visibilité n'est posée qu'au premier abonné, et retirée
      // au dernier : une page sans fond animé n'a rien à écouter.
      if (retirerEcouteVisibilite === null) {
        retirerEcouteVisibilite = d.ecouterVisibilite(auChangementDeVisibilite)
      }
      demarrer()

      return () => {
        abonnes.delete(abonne)
        if (abonnes.size === 0) {
          arreter()
          retirerEcouteVisibilite?.()
          retirerEcouteVisibilite = null
        }
      }
    },

    get enMarche() {
      return idImage !== null
    },

    get nombreAbonnes() {
      return abonnes.size
    },

    detruire() {
      arreter()
      abonnes.clear()
      retirerEcouteVisibilite?.()
      retirerEcouteVisibilite = null
    },
  }
}
