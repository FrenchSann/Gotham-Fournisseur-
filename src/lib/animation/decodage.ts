/**
 * Le texte à décodage.
 *
 * Chaque caractère défile en glyphes aléatoires avant de se fixer, en cascade
 * de gauche à droite. L'effet raconte une chose précise : on n'ouvre pas une
 * page web, on déchiffre un dossier classé.
 *
 * ## Écrit comme une fonction pure, et c'est le point
 *
 * `brouiller(texte, avancement)` ne touche à rien, ne garde rien, et rend
 * toujours la même chose pour les mêmes arguments. L'animation se réduit alors
 * à faire varier `avancement` de 0 à 1 — ce que GSAP sait faire — et tout ce
 * qui pourrait être faux dans l'effet (une longueur qui change, un caractère
 * qui ne se fixe jamais, une cascade qui saute le dernier caractère) se teste
 * sans navigateur, sans DOM et sans horloge.
 */

/**
 * Les glyphes de substitution.
 *
 * Trames, barres et hexadécimal : de quoi évoquer un terminal et un tampon
 * d'archive. Aucune lettre accentuée ni ponctuation — un glyphe doit être
 * illisible comme mot tout en restant crédible comme signe.
 *
 * **Les blocs pleins ont été retirés après coup.** Sur un titre en capitales de
 * neuf rem, un « █ » ne se lit pas comme un caractère mais comme un rectangle
 * blanc : l'effet cesse d'évoquer un déchiffrage et ressemble à un défaut
 * d'affichage. Les trames (▚ ▞ ▒) gardent la masse sans l'aplat.
 */
export const GLYPHES = '▚▞▒/\\|_+=<>#%&$?0123456789ABCDEF'

/**
 * Part de l'animation qu'un caractère passe à défiler.
 *
 * Le reste (65 %) est le décalage entre le premier et le dernier caractère,
 * c'est-à-dire la cascade. Un rapport plus élevé donnerait un effet plus long
 * par caractère mais une cascade écrasée : tout se fixerait presque en même
 * temps, et on perdrait la lecture de gauche à droite qui fait l'effet.
 */
const FENETRE = 0.35

/** Nombre de changements de glyphe sur toute la durée de l'animation. */
const CADENCE = 34

/** Hachage entier, déterministe et sans état. */
function hacher(a: number, b: number): number {
  let x = (a * 374761393 + b * 668265263) >>> 0
  x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0
  return (x ^ (x >>> 16)) >>> 0
}

/**
 * Le texte au stade `avancement` de son décodage.
 *
 * `avancement` va de 0 (tout est illisible) à 1 (le texte final, à l'identique).
 * Les espaces et les retours à la ligne ne sont jamais brouillés : ce sont eux
 * qui portent la mise en page, et les voir bouger ferait danser le bloc entier
 * — un défaut bien plus visible que l'effet qu'on cherche.
 */
export function brouiller(texte: string, avancement: number): string {
  const a = Math.min(Math.max(avancement, 0), 1)
  if (a >= 1) return texte

  const caracteres = [...texte]
  const dernier = Math.max(caracteres.length - 1, 1)
  const image = Math.floor(a * CADENCE)

  return caracteres
    .map((caractere, i) => {
      if (/\s/.test(caractere)) return caractere

      // Le caractère i commence à défiler quand la cascade l'atteint, et se
      // fixe une fenêtre plus tard.
      const debut = (i / dernier) * (1 - FENETRE)
      if (a >= debut + FENETRE) return caractere

      return GLYPHES[hacher(i, image) % GLYPHES.length]
    })
    .join('')
}
