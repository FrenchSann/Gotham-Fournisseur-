/**
 * Le mouvement de caméra.
 *
 * Volontairement écrit en nombres purs, sans three.js : une pose de caméra est
 * une fonction du temps, du pointeur et du défilement, et rien d'autre. Elle se
 * teste donc comme n'importe quelle fonction — déterminisme, bornes, sens de
 * variation — sans monter la moindre scène ni le moindre contexte WebGL.
 *
 * Quatre mouvements se superposent ici, et c'est leur superposition qui fait
 * le résultat. Pris séparément, aucun ne se remarque :
 *
 *   1. **La dérive** — deux sinusoïdes très lentes et de périodes différentes,
 *      donc un cycle qui ne se répète jamais à l'identique. C'est ce qui fait
 *      qu'une page laissée ouverte continue de vivre.
 *   2. **Le flottement à l'épaule** — quelques centièmes d'unité, à une
 *      cadence de l'ordre de la seconde. Personne ne le voit ; tout le monde le
 *      sent. C'est la différence entre une caméra posée sur un trépied (qui
 *      dit « image de synthèse ») et une caméra portée (qui dit « quelqu'un
 *      filme »).
 *   3. **Le travelling** — la caméra avance et descend avec le défilement.
 *      Le spec demande « l'impression de descendre dans un entrepôt » ; c'est
 *      ici que ça se joue, et nulle part ailleurs.
 *   4. **La parallaxe au pointeur** — déjà amortie par l'appelant.
 *
 * Et une focale qui respire : quelques dixièmes de degré, sur dix-sept
 * secondes. C'est le défaut d'un objectif qui se recale en permanence.
 */

export interface EntreeCamera {
  /** Secondes depuis le démarrage de la scène. */
  temps: number
  /** Pointeur normalisé dans [-1, 1], déjà amorti. */
  pointeurX: number
  pointeurY: number
  /** Avancement dans la page, dans [0, 1]. */
  defilement: number
}

export interface PoseCamera {
  x: number
  y: number
  z: number
  cibleX: number
  cibleY: number
  cibleZ: number
  /** Roulis en radians. Minuscule, mais c'est lui qui trahit la main. */
  roulis: number
  /** Champ de vision vertical, en degrés. */
  fov: number
}

/**
 * Position de repos et fin de course du travelling.
 *
 * `Z_FIN` est le chiffre à ne pas augmenter à la légère : la boîte de fumée
 * s'arrête à z = 7, et une caméra qui entre dedans se retrouve le nez dans la
 * matière — l'écran se remplit d'un voile dense et le texte du site passe
 * devant une soupe. À 7,2 on effleure la paroi sans jamais la traverser.
 */
const Z_DEPART = 12
const Z_FIN = 7.2
const Y_DEPART = 0.6
const Y_FIN = -0.9

/**
 * Flottement pseudo-aléatoire à partir de trois sinusoïdes.
 *
 * Les rapports de fréquence sont choisis irrationnels entre eux : leur somme
 * n'a donc pas de période courte, et l'oreille — pardon, l'œil — n'y entend
 * aucun motif. Trois termes suffisent ; à deux, le battement se repère au bout
 * d'une dizaine de secondes.
 */
function flottement(t: number, phase: number): number {
  return (
    Math.sin(t * 0.73 + phase) * 0.55 +
    Math.sin(t * 1.31 + phase * 2.1) * 0.3 +
    Math.sin(t * 2.17 + phase * 0.7) * 0.15
  )
}

/** Amplitude du flottement, en unités de scène. Au-delà de 0,05, ça se voit. */
const AMPLITUDE_FLOTTEMENT = 0.035

export function poserCamera({ temps, pointeurX, pointeurY, defilement }: EntreeCamera): PoseCamera {
  // Le défilement est borné ici plutôt que chez l'appelant : une page en
  // sur-défilement élastique (iOS) renvoie des valeurs hors de [0, 1], et la
  // caméra partirait en travers sans qu'on comprenne pourquoi.
  const d = Math.min(Math.max(defilement, 0), 1)

  const deriveX = Math.sin(temps * 0.07) * 0.5
  const deriveY = Math.cos(temps * 0.05) * 0.28

  const tremblementX = flottement(temps, 0) * AMPLITUDE_FLOTTEMENT
  const tremblementY = flottement(temps, 2.4) * AMPLITUDE_FLOTTEMENT
  const tremblementZ = flottement(temps, 5.1) * AMPLITUDE_FLOTTEMENT * 0.6

  return {
    x: deriveX + pointeurX * 0.85 + tremblementX,
    y: Y_DEPART + (Y_FIN - Y_DEPART) * d + deriveY + pointeurY * -0.45 + tremblementY,
    z: Z_DEPART + (Z_FIN - Z_DEPART) * d + tremblementZ,

    // Le point visé descend moins vite que la caméra : le regard plonge
    // progressivement vers le sol à mesure qu'on descend dans la page.
    cibleX: pointeurX * 0.3,
    cibleY: 0.3 + pointeurY * -0.15 - d * 0.5,
    cibleZ: 0,

    roulis: flottement(temps, 1.7) * 0.0045,

    // Respiration, puis resserrement avec le défilement. Une focale plus longue
    // écrase les plans les uns sur les autres : le décor du fond paraît se
    // rapprocher alors qu'il n'a pas bougé. C'est le vieux truc du travelling
    // compensé, en beaucoup plus discret.
    fov: 64 + Math.sin(temps * 0.37) * 0.6 - d * 5,
  }
}
