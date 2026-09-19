/**
 * Contrat commun des couches du fond animé.
 *
 * Chaque effet (brume, projecteur, poussière, grain) est une couche isolée qui
 * ne connaît ni les autres ni la boucle. Le composant `FondAnime` les empile et
 * les dessine dans l'ordre. Supprimer un effet, c'est retirer une ligne — utile
 * le jour où la mesure de performance dira qu'un des quatre coûte trop cher.
 */

export interface Scene {
  /** Largeur en pixels CSS (pas en pixels physiques). */
  largeur: number
  /** Hauteur en pixels CSS. */
  hauteur: number
  /** Position du pointeur, normalisée dans [-1, 1]. (0, 0) au centre. */
  sourisX: number
  sourisY: number
  /** true sous le seuil mobile : les couches allègent d'elles-mêmes. */
  allege: boolean
}

export interface Couche {
  /** Appelée au montage et à chaque redimensionnement. */
  redimensionner: (scene: Scene) => void
  /** Appelée à chaque image retenue par l'ordonnanceur. */
  dessiner: (ctx: CanvasRenderingContext2D, tempsMs: number, scene: Scene) => void
}
