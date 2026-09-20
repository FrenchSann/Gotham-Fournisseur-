import type Lenis from 'lenis'

/**
 * Le registre de Lenis.
 *
 * Lenis est créé par un composant React (`DefilementLisse`) mais doit être
 * atteint par du code qui n'est pas un composant : GSAP, quand il arrive, a
 * besoin de brancher ScrollTrigger dessus. Faire descendre l'instance par un
 * contexte React obligerait chaque consommateur à être un composant, ce que
 * `lib/animation/gsap.ts` n'est pas et n'a aucune raison de devenir.
 *
 * D'où ce registre : trois fonctions, aucun état React, et une règle — un seul
 * Lenis à la fois sur la page.
 *
 * ## Le pilotage, et pourquoi il se réclame
 *
 * Lenis avance en recevant un horodatage à chaque image. Tant qu'il est seul,
 * le composant le lui donne depuis son propre `requestAnimationFrame`. Quand
 * GSAP arrive, il apporte son ticker, et il faut que Lenis avance **dans** ce
 * ticker : sinon les deux boucles produisent des positions de défilement
 * différentes dans la même image, et les animations liées au défilement
 * tremblent d'une image sur deux.
 *
 * Le second arrivé réclame donc le pilotage, et le premier se tait. C'est plus
 * simple qu'une négociation sur l'ordre de chargement, qui n'est pas garanti.
 */

let instance: Lenis | null = null
let piloteExterne = false

export function definirLenis(l: Lenis | null) {
  instance = l
  // Une nouvelle instance repart toujours sous pilotage interne : sans cette
  // remise à zéro, un remontage après une navigation laisserait un Lenis figé,
  // en attente d'un ticker GSAP qui a été détruit avec l'ancienne page.
  if (l === null) piloteExterne = false
}

export function obtenirLenis(): Lenis | null {
  return instance
}

/** Appelé par GSAP. Le composant cesse alors d'appeler `raf` lui-même. */
export function reclamerPilotage() {
  piloteExterne = true
}

export function rendrePilotage() {
  piloteExterne = false
}

export function estPiloteExterieurement(): boolean {
  return piloteExterne
}
