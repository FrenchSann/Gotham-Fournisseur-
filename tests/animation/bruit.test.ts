import { describe, expect, it } from 'vitest'
import { creerBruit } from '@/lib/animation/bruit'

/** Balaie une grille de points et rend toutes les valeurs. */
function echantillonner(bruit: ReturnType<typeof creerBruit>, pas = 0.37, n = 60): number[] {
  const valeurs: number[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      valeurs.push(bruit.valeur(i * pas, j * pas))
    }
  }
  return valeurs
}

describe('déterminisme', () => {
  it('rend exactement la même chose pour une même graine', () => {
    // Sans cette garantie, l'ambiance changerait à chaque rechargement et
    // aucune régression visuelle ne serait détectable.
    expect(echantillonner(creerBruit(42))).toEqual(echantillonner(creerBruit(42)))
  })

  it('rend autre chose pour une graine différente', () => {
    const a = echantillonner(creerBruit(1))
    const b = echantillonner(creerBruit(2))
    expect(a).not.toEqual(b)
  })

  it('rend la même valeur pour un même point appelé deux fois', () => {
    const bruit = creerBruit(7)
    expect(bruit.valeur(3.14, 2.71)).toBe(bruit.valeur(3.14, 2.71))
  })
})

describe('bornes', () => {
  it('reste dans [-1, 1]', () => {
    // La brume convertit ces valeurs en opacité : une valeur hors bornes
    // produirait une nappe opaque ou un artefact visible.
    const valeurs = echantillonner(creerBruit(3), 0.13, 90)
    for (const v of valeurs) {
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('reste borné sur des coordonnées très éloignées', () => {
    const bruit = creerBruit(5)
    for (const x of [-9999.7, -512.3, 0, 511.9, 100000.1]) {
      const v = bruit.valeur(x, x * 0.31)
      expect(Number.isFinite(v)).toBe(true)
      expect(Math.abs(v)).toBeLessThanOrEqual(1)
    }
  })
})

describe('continuité', () => {
  it('varie doucement entre deux points proches', () => {
    // C'est ce qui distingue du brouillard de la neige télévisée : deux points
    // voisins doivent avoir des valeurs voisines.
    const bruit = creerBruit(11)
    let ecartMax = 0

    for (let i = 0; i < 200; i++) {
      const x = i * 0.05
      ecartMax = Math.max(ecartMax, Math.abs(bruit.valeur(x, 1.5) - bruit.valeur(x + 0.01, 1.5)))
    }

    expect(ecartMax).toBeLessThan(0.1)
  })

  it('vaut zéro aux nœuds entiers de la grille', () => {
    // Propriété structurelle du bruit de Perlin : les gradients y sont
    // évalués en (0,0). Si elle tombe, l'implémentation a dérivé.
    const bruit = creerBruit(13)
    for (const [x, y] of [
      [0, 0],
      [3, 5],
      [12, 7],
    ]) {
      expect(Math.abs(bruit.valeur(x, y))).toBeLessThan(1e-12)
    }
  })
})

describe('répartition', () => {
  it('couvre une plage utile plutôt que de stagner autour de zéro', () => {
    // Un bruit trop plat donnerait une brume invisible.
    const valeurs = echantillonner(creerBruit(17), 0.21, 80)
    const min = Math.min(...valeurs)
    const max = Math.max(...valeurs)

    expect(max - min).toBeGreaterThan(0.8)
  })
})
