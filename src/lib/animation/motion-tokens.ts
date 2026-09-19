/**
 * Durées et courbes du mouvement, en TypeScript.
 *
 * Miroir exact des variables CSS de `globals.css`. Le CSS sert aux transitions
 * déclaratives, ce fichier sert à GSAP et au canvas, qui ont besoin de nombres.
 * Les deux doivent rester synchronisés : si tu changes une valeur ici,
 * change-la là-bas.
 *
 * La règle qui structure tout (SPEC.md § 2 bis) : deux registres de vitesse,
 * jamais mélangés. L'interface répond vite et sec, l'ambiance dérive lentement.
 * Le contraste entre les deux *est* l'effet.
 */

/** Réponse à une action de l'utilisateur. Sec, sans rebond. */
export const MACHINE = {
  court: 0.12,
  normal: 0.16,
  long: 0.2,
  /** Équivalent GSAP de cubic-bezier(.2, 0, 0, 1). */
  courbe: 'power3.out',
} as const

/** Ambiance et défilement. Lent, souvent en boucle. */
export const ATMOSPHERE = {
  court: 0.8,
  normal: 1.2,
  courbe: 'power2.inOut',
} as const

/** Cycles des boucles de fond, en secondes. */
export const CYCLES = {
  brume: 48,
  projecteur: 25,
  balayage: 8,
  grille: 60,
} as const

/**
 * Cadences cibles.
 *
 * Le fond tourne à 30 fps et non 60 : la brume et le projecteur dérivent trop
 * lentement pour que l'œil voie la différence, et on rend la moitié des images.
 * Le grain, lui, descend à 12 fps — il doit *sauter* comme une pellicule.
 * À 60 fps il devient un voile gris uniforme et perd tout son intérêt.
 */
export const FPS = {
  fond: 30,
  grain: 12,
} as const

/** Budget par image, en millisecondes. Au-delà, l'animation est simplifiée. */
export const BUDGET_IMAGE_MS = 8

/** Inertie Lenis. Plus bas = plus lourd. 0,08 donne le poids voulu sans nausée. */
export const LENIS_LERP = 0.08

/** Sous ce seuil (px), on allège : moins de particules, pas de pin horizontal. */
export const SEUIL_MOBILE = 768
