import { creerBruit } from '../bruit'
import { CYCLES, FPS } from '../motion-tokens'
import type { Couche, Scene } from './types'

/**
 * Brume volumétrique — la couche qui donne la profondeur.
 *
 * Deux nappes de bruit de Perlin dérivent dans des directions opposées. C'est
 * leur croisement lent qui empêche l'œil de repérer une boucle : prises
 * séparément, chaque nappe se répète, mais leur somme ne revient au même état
 * qu'au bout de plusieurs minutes.
 *
 * Le point critique est la performance. Évaluer du Perlin par pixel sur un
 * écran 1440p, ce sont 3,7 millions d'appels par image — inenvisageable. On
 * calcule donc la brume sur une grille minuscule (environ 110 px de côté),
 * puis on l'étire à la taille de l'écran : le navigateur interpole en GPU,
 * gratuitement, et le flou de l'agrandissement est exactement l'aspect
 * recherché. C'est 20 000 fois moins de calcul pour un meilleur rendu.
 */

/** Côté de la grille de calcul, en cellules. Au-delà, le coût grimpe pour rien. */
const RESOLUTION_MAX = 110

/** Teinte de la brume : un gris bleuté froid, jamais blanc. */
const TEINTE = { r: 120, v: 134, b: 150 }

/** Opacité maximale d'une nappe. Volontairement très basse. */
const OPACITE = 0.16

export function creerBrume(): Couche {
  const nappeA = creerBruit(1337)
  const nappeB = creerBruit(7331)

  let tampon: HTMLCanvasElement | null = null
  let ctxTampon: CanvasRenderingContext2D | null = null
  let image: ImageData | null = null
  let cols = 0
  let lignes = 0
  let dernierCalcul = -Infinity

  const intervalleCalculMs = 1000 / FPS.brume

  function redimensionner(scene: Scene) {
    const ratio = scene.largeur / Math.max(scene.hauteur, 1)
    if (ratio >= 1) {
      cols = RESOLUTION_MAX
      lignes = Math.max(2, Math.round(RESOLUTION_MAX / ratio))
    } else {
      lignes = RESOLUTION_MAX
      cols = Math.max(2, Math.round(RESOLUTION_MAX * ratio))
    }

    // Sur mobile, une grille deux fois plus grossière : invisible à l'œil une
    // fois étirée, et deux fois moins de calcul là où le processeur est faible.
    if (scene.allege) {
      cols = Math.max(2, Math.round(cols / 2))
      lignes = Math.max(2, Math.round(lignes / 2))
    }

    tampon = document.createElement('canvas')
    tampon.width = cols
    tampon.height = lignes
    ctxTampon = tampon.getContext('2d')
    image = ctxTampon?.createImageData(cols, lignes) ?? null
  }

  function dessiner(ctx: CanvasRenderingContext2D, tempsMs: number, scene: Scene) {
    if (!tampon || !ctxTampon || !image) return

    // Le champ de bruit n'est recalculé qu'à FPS.brume ; le reste du temps on
    // réutilise le tampon tel quel. C'est la partie coûteuse, et la seule.
    if (tempsMs - dernierCalcul >= intervalleCalculMs) {
      dernierCalcul = tempsMs
      calculerChamp(tempsMs)
    }

    // L'agrandissement lissé, lui, a bien lieu à chaque image : le canvas
    // principal est effacé entre deux tours. C'est un transfert de texture,
    // exécuté par le GPU, et il ne coûte quasiment rien.
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(tampon, 0, 0, scene.largeur, scene.hauteur)
    ctx.restore()
  }

  function calculerChamp(tempsMs: number) {
    if (!ctxTampon || !image) return

    const t = tempsMs / 1000
    // Deux dérives opposées, désynchronisées par un facteur non entier pour
    // que les deux nappes ne se réalignent jamais sur un cycle court.
    const deriveA = (t / CYCLES.brume) * 2
    const deriveB = (-t / (CYCLES.brume * 1.37)) * 2

    const donnees = image.data
    let i = 0

    for (let y = 0; y < lignes; y++) {
      const ny = y / lignes
      for (let x = 0; x < cols; x++) {
        const nx = x / cols

        // Échelles différentes : la nappe A porte les grandes masses,
        // la nappe B ajoute le détail qui évite l'aspect « dégradé ».
        const a = nappeA.valeur(nx * 3 + deriveA, ny * 2 - deriveA * 0.6)
        const b = nappeB.valeur(nx * 6 - deriveB, ny * 5 + deriveB * 0.4)

        // Somme pondérée ramenée dans [0, 1], puis élevée au carré : la brume
        // doit être absente la plupart du temps et dense par endroits, pas
        // uniformément grise.
        const brut = (a * 0.65 + b * 0.35 + 1) / 2
        const densite = brut * brut

        donnees[i++] = TEINTE.r
        donnees[i++] = TEINTE.v
        donnees[i++] = TEINTE.b
        donnees[i++] = densite * 255 * OPACITE
      }
    }

    ctxTampon.putImageData(image, 0, 0)
  }

  return { redimensionner, dessiner }
}
