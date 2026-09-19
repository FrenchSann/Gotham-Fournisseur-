import { FPS } from '../motion-tokens'
import type { Couche, Scene } from './types'

/**
 * Grain de film.
 *
 * Le détail qui fait basculer le rendu de « page web sombre » à « image ».
 * Sans lui, les aplats noirs paraissent plats et numériques.
 *
 * Deux décisions comptent plus que le reste :
 *
 * 1. **12 images par seconde, pas 30.** Le grain doit *sauter*, comme une
 *    pellicule projetée. À 30 ou 60 fps il se moyenne dans l'œil et devient un
 *    voile gris uniforme — tout l'intérêt disparaît. C'est un cas rare où
 *    moins d'images donne un meilleur résultat *et* coûte moins cher.
 *
 * 2. **Une tuile répétée, pas un plein écran.** Générer du bruit sur toute la
 *    surface coûterait des millions d'octets par image. On génère une tuile de
 *    128 px qu'on répète : l'œil ne perçoit pas la répétition dans du bruit,
 *    et le coût devient constant quelle que soit la taille de l'écran.
 */

const TAILLE_TUILE = 128

/** Opacité du calque. Au-delà de 4 %, le texte devient sale. */
const OPACITE = 0.03

export function creerGrain(): Couche {
  const intervalleMs = 1000 / FPS.grain

  let tuile: HTMLCanvasElement | null = null
  let ctxTuile: CanvasRenderingContext2D | null = null
  let image: ImageData | null = null
  let motif: CanvasPattern | null = null
  let dernierRendu = -Infinity

  // Aucun paramètre : la tuile a une taille fixe et ne dépend donc pas des
  // dimensions de l'écran — c'est tout l'intérêt d'un motif répété.
  function redimensionner() {
    if (tuile) return

    tuile = document.createElement('canvas')
    tuile.width = TAILLE_TUILE
    tuile.height = TAILLE_TUILE
    ctxTuile = tuile.getContext('2d')
    image = ctxTuile?.createImageData(TAILLE_TUILE, TAILLE_TUILE) ?? null
  }

  function regenererTuile() {
    if (!ctxTuile || !image) return

    const donnees = image.data
    for (let i = 0; i < donnees.length; i += 4) {
      // Bruit monochrome : un grain coloré virerait au bruit de capteur.
      const v = (Math.random() * 255) | 0
      donnees[i] = v
      donnees[i + 1] = v
      donnees[i + 2] = v
      donnees[i + 3] = 255
    }
    ctxTuile.putImageData(image, 0, 0)
    motif = null // Le motif référence la tuile : il faut le reconstruire.
  }

  function dessiner(ctx: CanvasRenderingContext2D, tempsMs: number, scene: Scene) {
    if (!tuile) return

    // Hors des 12 fps, on ne redessine rien du tout. Le canvas conserve son
    // contenu : l'image précédente reste affichée, gratuitement.
    if (tempsMs - dernierRendu < intervalleMs) return
    dernierRendu = tempsMs

    regenererTuile()
    motif ??= ctx.createPattern(tuile, 'repeat')
    if (!motif) return

    ctx.clearRect(0, 0, scene.largeur, scene.hauteur)
    ctx.save()
    ctx.globalAlpha = OPACITE
    ctx.fillStyle = motif
    ctx.fillRect(0, 0, scene.largeur, scene.hauteur)
    ctx.restore()
  }

  return { redimensionner, dessiner }
}
