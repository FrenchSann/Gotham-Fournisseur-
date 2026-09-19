/**
 * Bruit de Perlin 2D, déterministe et sans dépendance.
 *
 * C'est la matière première de la brume : un bruit purement aléatoire donne
 * de la neige télévisée, alors que le bruit de Perlin varie continûment et
 * produit des nappes qui ressemblent à du brouillard.
 *
 * Écrit à la main plutôt qu'importé : une soixantaine de lignes contre une
 * dépendance de plus dans un budget de 200 Ko, et la version à graine nous
 * garantit une ambiance identique d'un chargement à l'autre.
 */

/**
 * Générateur pseudo-aléatoire à graine (mulberry32).
 *
 * `Math.random()` ne prend pas de graine : le fond serait différent à chaque
 * rechargement, et surtout impossible à tester.
 */
function creerAleatoire(graine: number): () => number {
  let etat = graine >>> 0
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0
    let t = etat
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Courbe de lissage 6t⁵-15t⁴+10t³ : dérivées nulles aux extrémités, donc
 *  aucune arête visible à la frontière entre deux cellules de la grille. */
function adoucir(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function interpoler(a: number, b: number, t: number): number {
  return a + t * (b - a)
}

export interface Bruit2D {
  /** Valeur du bruit en (x, y), bornée dans [-1, 1]. */
  valeur: (x: number, y: number) => number
}

export function creerBruit(graine = 1): Bruit2D {
  const aleatoire = creerAleatoire(graine)

  // Table de permutation classique : 256 entrées mélangées, dupliquées pour
  // éviter un modulo dans la boucle chaude.
  const permutation = new Uint8Array(512)
  const base = new Uint8Array(256)
  for (let i = 0; i < 256; i++) base[i] = i

  // Mélange de Fisher-Yates, piloté par la graine.
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(aleatoire() * (i + 1))
    const tmp = base[i]
    base[i] = base[j]
    base[j] = tmp
  }
  for (let i = 0; i < 512; i++) permutation[i] = base[i & 255]

  /** Produit scalaire avec un des 4 gradients diagonaux du coin de cellule. */
  function gradient(hachage: number, x: number, y: number): number {
    switch (hachage & 3) {
      case 0:
        return x + y
      case 1:
        return -x + y
      case 2:
        return x - y
      default:
        return -x - y
    }
  }

  return {
    valeur(x: number, y: number): number {
      const cx = Math.floor(x) & 255
      const cy = Math.floor(y) & 255
      const fx = x - Math.floor(x)
      const fy = y - Math.floor(y)

      const u = adoucir(fx)
      const v = adoucir(fy)

      const a = permutation[cx] + cy
      const b = permutation[cx + 1] + cy

      const haut = interpoler(
        gradient(permutation[a], fx, fy),
        gradient(permutation[b], fx - 1, fy),
        u
      )
      const bas = interpoler(
        gradient(permutation[a + 1], fx, fy - 1),
        gradient(permutation[b + 1], fx - 1, fy - 1),
        u
      )

      // Les gradients diagonaux plafonnent à √2 ; on ramène dans [-1, 1].
      return interpoler(haut, bas, v) / Math.SQRT2
    },
  }
}
