import { describe, expect, it } from 'vitest'
import { PACKS, TOTAUX, trouverPack } from '@/content/packs'
import { formaterMois, formaterPrix, validerCatalogue } from '@/content/types'

/**
 * Le catalogue est la source de vérité du site et de la facturation. Ces
 * tests ne vérifient pas du code — ils gardent un fichier de données qui
 * s'édite à la main, où une faute de frappe casse une URL ou fait livrer le
 * mauvais dossier à un client qui a payé.
 */

describe('intégrité du catalogue', () => {
  it('contient des packs', () => {
    expect(PACKS.length).toBeGreaterThan(0)
  })

  it('n’a aucune référence en double', () => {
    const refs = PACKS.map((p) => p.ref)
    expect(new Set(refs).size).toBe(refs.length)
  })

  it('n’a aucun slug en double', () => {
    // Un slug dupliqué casserait `generateStaticParams` et rendrait une des
    // deux fiches inatteignable.
    const slugs = PACKS.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('n’a aucun chemin de fichier en double', () => {
    // Deux packs pointant vers le même fichier livreraient le mauvais dossier
    // à la moitié des acheteurs, sans qu'aucune erreur ne se produise.
    const fichiers = PACKS.map((p) => p.fichierStorage)
    expect(new Set(fichiers).size).toBe(fichiers.length)
  })

  it('a des prix strictement positifs et entiers', () => {
    for (const pack of PACKS) {
      expect(Number.isInteger(pack.prixCentimes), pack.ref).toBe(true)
      expect(pack.prixCentimes, pack.ref).toBeGreaterThan(0)
    }
  })

  it('garde tous les montants en centimes, jamais en euros', () => {
    // Un prix saisi « 69 » au lieu de « 6900 » passerait tous les autres
    // contrôles et ferait vendre un dossier 0,69 €.
    for (const pack of PACKS) {
      expect(pack.prixCentimes, `${pack.ref} semble saisi en euros`).toBeGreaterThanOrEqual(500)
    }
  })

  it('a des slugs utilisables dans une URL', () => {
    for (const pack of PACKS) {
      expect(pack.slug, pack.ref).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(encodeURIComponent(pack.slug)).toBe(pack.slug)
    }
  })

  it('n’a pas encore d’identifiant Stripe, et l’assume', () => {
    // Les produits Stripe sont créés à l'étape 5. Ce test tombera ce jour-là
    // et rappellera de le mettre à jour plutôt que de laisser un null passer
    // en production.
    for (const pack of PACKS) {
      expect(pack.stripePriceId, pack.ref).toBeNull()
    }
  })
})

describe('validation', () => {
  it('rejette une référence mal formée', () => {
    expect(() => validerCatalogue([{ ...PACKS[0], ref: 'AN1' }])).toThrow(/Référence/)
  })

  it('rejette un prix négatif', () => {
    expect(() => validerCatalogue([{ ...PACKS[0], prixCentimes: -100 }])).toThrow()
  })

  it('rejette deux packs partageant un slug', () => {
    const doublon = { ...PACKS[1], slug: PACKS[0].slug }
    expect(() => validerCatalogue([PACKS[0], doublon])).toThrow(/slug en double/i)
  })

  it('nomme le champ fautif dans le message d’erreur', () => {
    // Un message du type « validation échouée » obligerait à fouiller un
    // fichier de 200 lignes pour trouver la ligne cassée.
    expect(() => validerCatalogue([{ ...PACKS[0], accroche: 'court' }])).toThrow(/accroche/)
  })
})

describe('recherche', () => {
  it('trouve un pack par son slug', () => {
    expect(trouverPack(PACKS[0].slug)?.ref).toBe(PACKS[0].ref)
  })

  it('rend undefined pour un slug inconnu', () => {
    // C'est ce qui déclenche le 404 de la fiche produit.
    expect(trouverPack('dossier-qui-nexiste-pas')).toBeUndefined()
  })
})

describe('totaux affichés', () => {
  it('additionne réellement les fournisseurs du catalogue', () => {
    // Les chiffres du hero sont calculés, jamais saisis : ils ne peuvent donc
    // pas mentir sur ce que le client achète.
    const attendu = PACKS.reduce((s, p) => s + p.fournisseurs, 0)
    expect(TOTAUX.fournisseurs).toBe(attendu)
  })

  it('compte les pays sans doublon', () => {
    const distincts = new Set(PACKS.flatMap((p) => p.pays))
    expect(TOTAUX.pays).toBe(distincts.size)
    expect(TOTAUX.pays).toBeLessThan(PACKS.flatMap((p) => p.pays).length)
  })
})

describe('formatage', () => {
  it('affiche un prix rond sans décimales', () => {
    // « 69 € » plutôt que « 69,00 € » : c'est la convention des catalogues.
    expect(formaterPrix(6900).replace(/ | /g, ' ')).toBe('69 €')
  })

  it('affiche les décimales quand il y en a', () => {
    expect(formaterPrix(6950).replace(/ | /g, ' ')).toBe('69,50 €')
  })

  it('écrit le mois en toutes lettres', () => {
    expect(formaterMois('2026-09')).toBe('septembre 2026')
  })

  it('ne décale pas le mois d’une unité', () => {
    // Piège classique : les mois JavaScript partent de zéro.
    expect(formaterMois('2026-01')).toBe('janvier 2026')
    expect(formaterMois('2026-12')).toBe('décembre 2026')
  })
})
