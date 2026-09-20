import { describe, expect, it } from 'vitest'
import { brouiller, GLYPHES } from '@/lib/animation/decodage'

const TITRE = 'ARSENAL NOIR'

describe('bornes', () => {
  it('rend le texte exact à la fin', () => {
    // La promesse la plus importante du fichier : quoi qu'il arrive en chemin,
    // l'animation se termine sur le texte qu'on voulait lire.
    expect(brouiller(TITRE, 1)).toBe(TITRE)
    expect(brouiller(TITRE, 42)).toBe(TITRE)
  })

  it('ne rend pas le texte au départ', () => {
    expect(brouiller(TITRE, 0)).not.toBe(TITRE)
  })

  it('traite un avancement négatif comme un départ', () => {
    expect(brouiller(TITRE, -1)).toBe(brouiller(TITRE, 0))
  })
})

describe('mise en page', () => {
  it('conserve la longueur à chaque étape', () => {
    // Une longueur qui varie ferait danser tout le bloc de texte, et sur un
    // titre en capitales géantes, c'est la page entière qui bouge.
    for (let a = 0; a <= 1; a += 0.017) {
      expect([...brouiller(TITRE, a)]).toHaveLength([...TITRE].length)
    }
  })

  it('ne brouille jamais les espaces ni les retours à la ligne', () => {
    const texte = 'ARSENAL\nNOIR EST LÀ'
    for (let a = 0; a <= 1; a += 0.05) {
      const sortie = [...brouiller(texte, a)]
      for (const [i, caractere] of [...texte].entries()) {
        if (/\s/.test(caractere)) expect(sortie[i]).toBe(caractere)
      }
    }
  })

  it('n’introduit aucun caractère hors du jeu de glyphes', () => {
    const autorise = new Set([...GLYPHES, ...TITRE])
    for (let a = 0; a <= 1; a += 0.03) {
      for (const caractere of brouiller(TITRE, a)) {
        expect(autorise.has(caractere)).toBe(true)
      }
    }
  })
})

describe('cascade', () => {
  /**
   * Texte en minuscules, et ce n'est pas un détail de confort.
   *
   * Le jeu de glyphes contient l'hexadécimal, donc les lettres A à F : sur
   * « ARSENAL NOIR », un glyphe tiré au hasard tombe régulièrement sur le A ou
   * le E attendu à cette position, et un test qui lit « ce caractère est-il
   * égal au caractère final ? » conclut à tort qu'il s'est fixé. Aucune lettre
   * minuscule n'étant dans le jeu, l'égalité redevient une preuve.
   */
  const DOUX = 'arsenal noir'

  it('fixe les caractères de gauche à droite', () => {
    // À mi-parcours, le début du titre est lisible et la fin ne l'est pas.
    // C'est ce décalage qui fait la lecture de gauche à droite.
    const milieu = brouiller(DOUX, 0.5)
    expect(milieu.startsWith('ars')).toBe(true)
    expect(milieu.endsWith('noir')).toBe(false)
  })

  it('fixe chaque caractère une fois pour toutes', () => {
    // Un caractère qui se fixe puis redéfile donnerait un scintillement.
    const fixeA = (a: number) => [...brouiller(DOUX, a)].map((c, i) => c === [...DOUX][i])

    let precedent = fixeA(0)
    for (let a = 0.02; a <= 1; a += 0.02) {
      const courant = fixeA(a)
      for (const [i, etaitFixe] of precedent.entries()) {
        // Les espaces sont « fixes » depuis le début, la règle vaut aussi.
        if (etaitFixe) expect(courant[i]).toBe(true)
      }
      precedent = courant
    }
  })
})

describe('déterminisme', () => {
  it('rend la même chose pour le même avancement', () => {
    expect(brouiller(TITRE, 0.42)).toBe(brouiller(TITRE, 0.42))
  })

  it('change de glyphes en cours de route', () => {
    // Sinon ce n'est pas un défilement, c'est un masque fixe.
    const echantillons = new Set([0.05, 0.1, 0.15, 0.2].map((a) => brouiller(TITRE, a)))
    expect(echantillons.size).toBeGreaterThan(1)
  })
})
