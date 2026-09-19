import { CYCLES } from '../motion-tokens'
import type { Couche, Scene } from './types'

/**
 * Projecteur rasant — le geste signature du site.
 *
 * Une ellipse de lumière ambrée traverse l'écran d'un bord à l'autre, révèle
 * brièvement la grille technique en dessous, puis repart. C'est le seul
 * mouvement du fond que l'œil remarque consciemment, et c'est voulu : il donne
 * l'impression qu'une source lumineuse existe hors champ.
 *
 * Coût : un dégradé radial par image. Négligeable comparé à la brume.
 */

/** Ambre froid : la lumière d'un lampadaire, pas celle d'une bougie. */
const AMBRE = { r: 198, v: 150, b: 82 }

/** Opacité au cœur du faisceau. Au-delà, on obtient une tache jaune. */
const INTENSITE = 0.07

export function creerProjecteur(): Couche {
  let rayon = 0
  let hauteurFaisceau = 0

  function redimensionner(scene: Scene) {
    // Le faisceau déborde largement de l'écran : on ne doit jamais en voir
    // le bord, seulement le passage de la zone claire.
    rayon = Math.max(scene.largeur, scene.hauteur) * 0.75
    hauteurFaisceau = scene.hauteur * 1.4
  }

  function dessiner(ctx: CanvasRenderingContext2D, tempsMs: number, scene: Scene) {
    if (rayon === 0) return

    const t = tempsMs / 1000

    // Un aller simple dure CYCLES.projecteur, donc l'aller-retour complet dure
    // le double. La sinusoïde ralentit naturellement aux extrémités, comme un
    // vrai projecteur qui pivote.
    const phase = (t / (CYCLES.projecteur * 2)) * Math.PI * 2
    const progression = (Math.sin(phase) + 1) / 2

    // On déborde de 30 % de chaque côté pour que le faisceau entre et sorte du
    // cadre au lieu de rebondir sur les bords.
    const centreX = scene.largeur * (-0.3 + progression * 1.6)
    // Légère oscillation verticale, deux fois plus lente : sans elle le
    // balayage paraît mécanique.
    const centreY = scene.hauteur * (0.35 + Math.sin(phase * 0.5) * 0.15)

    const degrade = ctx.createRadialGradient(centreX, centreY, 0, centreX, centreY, rayon)
    degrade.addColorStop(0, `rgba(${AMBRE.r}, ${AMBRE.v}, ${AMBRE.b}, ${INTENSITE})`)
    degrade.addColorStop(0.45, `rgba(${AMBRE.r}, ${AMBRE.v}, ${AMBRE.b}, ${INTENSITE * 0.35})`)
    degrade.addColorStop(1, `rgba(${AMBRE.r}, ${AMBRE.v}, ${AMBRE.b}, 0)`)

    ctx.save()
    // `lighter` fait s'additionner la lumière au lieu de la recouvrir : c'est
    // la différence entre un projecteur et un calque de peinture.
    ctx.globalCompositeOperation = 'lighter'
    // On aplatit le cercle en ellipse : un faisceau rasant est large et bas.
    ctx.translate(centreX, centreY)
    ctx.scale(1, hauteurFaisceau / (rayon * 2))
    ctx.translate(-centreX, -centreY)
    ctx.fillStyle = degrade
    ctx.fillRect(centreX - rayon, centreY - rayon, rayon * 2, rayon * 2)
    ctx.restore()
  }

  return { redimensionner, dessiner }
}
