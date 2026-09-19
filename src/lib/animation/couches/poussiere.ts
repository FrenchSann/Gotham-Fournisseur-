import type { Couche, Scene } from './types'

/**
 * Poussière en suspension.
 *
 * Des particules d'un à deux pixels dérivent vers le haut, à des vitesses et
 * des opacités différentes. C'est l'effet le moins spectaculaire des quatre et
 * pourtant celui qu'on remarquerait s'il manquait : il rend l'air visible, et
 * un air visible fait exister l'espace.
 *
 * La réaction à la souris est volontairement infime — quelques pixels de
 * décalage, jamais une poursuite. Des particules qui suivent le curseur
 * ressemblent à un écran de veille ; des particules qui frémissent à son
 * passage ressemblent à de l'air déplacé.
 */

/** Densité : une particule par tranche de surface, plafonnée. */
const SURFACE_PAR_PARTICULE = 22000
const NOMBRE_MAX = 80
const NOMBRE_MIN = 24

/** Amplitude du décalage induit par la souris, en pixels. */
const INFLUENCE_SOURIS = 14

interface Particule {
  x: number
  y: number
  rayon: number
  /** Pixels par seconde, vers le haut. */
  vitesse: number
  opacite: number
  /** Décale l'oscillation horizontale pour que les particules ne frémissent
   *  pas toutes en même temps. */
  dephasage: number
  /** Sensibilité à la souris, de 0 à 1 : les particules « proches » bougent
   *  plus que celles du fond. C'est ce gradient qui crée la profondeur. */
  profondeur: number
}

export function creerPoussiere(): Couche {
  let particules: Particule[] = []
  let derniereMesure = 0

  function redimensionner(scene: Scene) {
    const surface = scene.largeur * scene.hauteur
    let nombre = Math.round(surface / SURFACE_PAR_PARTICULE)

    // Sur mobile, densité divisée par trois : moins de particules à dessiner,
    // et surtout un écran plus petit où elles paraîtraient trop nombreuses.
    if (scene.allege) nombre = Math.round(nombre / 3)

    nombre = Math.min(NOMBRE_MAX, Math.max(NOMBRE_MIN, nombre))

    particules = Array.from({ length: nombre }, () => {
      const profondeur = Math.random()
      return {
        x: Math.random() * scene.largeur,
        y: Math.random() * scene.hauteur,
        rayon: 0.5 + profondeur * 1.1,
        // Les particules du premier plan montent plus vite : même gradient de
        // profondeur que pour la souris, appliqué au mouvement.
        vitesse: 4 + profondeur * 12,
        opacite: 0.12 + profondeur * 0.28,
        dephasage: Math.random() * Math.PI * 2,
        profondeur,
      }
    })
  }

  function dessiner(ctx: CanvasRenderingContext2D, tempsMs: number, scene: Scene) {
    if (particules.length === 0) return

    const t = tempsMs / 1000
    // On calcule le delta nous-mêmes : la couche doit rester juste même si
    // l'ordonnanceur saute une image.
    const delta = derniereMesure === 0 ? 0 : Math.min((tempsMs - derniereMesure) / 1000, 0.1)
    derniereMesure = tempsMs

    ctx.save()
    ctx.fillStyle = '#e6e4e0'

    for (const p of particules) {
      p.y -= p.vitesse * delta
      // Réapparition en bas quand la particule sort par le haut.
      if (p.y < -2) {
        p.y = scene.hauteur + 2
        p.x = Math.random() * scene.largeur
      }

      // Oscillation horizontale lente : la poussière ne tombe pas droit.
      const derive = Math.sin(t * 0.35 + p.dephasage) * 6 * p.profondeur
      const decalageSouris = scene.sourisX * INFLUENCE_SOURIS * p.profondeur

      ctx.globalAlpha = p.opacite
      ctx.beginPath()
      ctx.arc(p.x + derive + decalageSouris, p.y, p.rayon, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  return { redimensionner, dessiner }
}
