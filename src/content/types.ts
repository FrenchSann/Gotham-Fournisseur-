import { z } from 'zod'

/**
 * Forme d'un pack.
 *
 * Validé par Zod et non simplement typé : `packs.ts` est la source de vérité
 * du catalogue et de la facturation. Un slug dupliqué casserait le routage,
 * un prix à zéro laisserait passer une commande gratuite, un chemin de fichier
 * erroné livrerait le mauvais dossier à un client qui a payé. Ces erreurs se
 * font en éditant une ligne à la main, et le typage seul ne les voit pas.
 */
export const schemaPack = z.object({
  /** Référence affichée, façon catalogue d'armurier. Immuable une fois publiée. */
  ref: z.string().regex(/^AN-\d{2}$/, 'Référence attendue au format AN-01'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug en minuscules, mots séparés par des tirets'),
  nom: z.string().min(3),
  accroche: z.string().min(10).max(120),
  /** Description longue de la fiche produit, un paragraphe par entrée. */
  description: z.array(z.string().min(20)).min(1),
  /** Ce que le client trouve à l'intérieur, listé sans promesse creuse. */
  contenu: z.array(z.string().min(3)).min(3),

  /** En centimes, toujours. Aucun flottant ne touche jamais un montant. */
  prixCentimes: z.number().int().positive(),
  /** Renseigné à l'étape 5, quand les produits Stripe existeront. */
  stripePriceId: z.string().nullable(),

  /** Chemin dans le bucket privé Supabase. Jamais exposé au client. */
  fichierStorage: z.string().min(5),
  formatFichier: z.enum(['PDF', 'XLSX', 'PDF + XLSX']),

  fournisseurs: z.number().int().positive(),
  pages: z.number().int().positive(),
  pays: z.array(z.string().min(2)).min(1),
  /** Mois de dernière mise à jour, format AAAA-MM. */
  misAJour: z.string().regex(/^\d{4}-\d{2}$/),

  /** Teinte de l'objet 3D de la carte, en hexadécimal. */
  teinte: z.string().regex(/^#[0-9a-f]{6}$/i),
})

export type Pack = z.infer<typeof schemaPack>

/**
 * Valide tout le catalogue et vérifie ce qu'un schéma par entrée ne peut pas
 * voir : l'unicité entre les entrées.
 */
export function validerCatalogue(packs: readonly unknown[]): Pack[] {
  const valides = packs.map((pack, i) => {
    const resultat = schemaPack.safeParse(pack)
    if (!resultat.success) {
      const details = resultat.error.issues
        .map((p) => `${p.path.join('.')} : ${p.message}`)
        .join(' ; ')
      throw new Error(`Pack n°${i + 1} invalide — ${details}`)
    }
    return resultat.data
  })

  for (const champ of ['ref', 'slug'] as const) {
    const vus = new Set<string>()
    for (const pack of valides) {
      if (vus.has(pack[champ])) {
        throw new Error(`Catalogue : ${champ} en double — « ${pack[champ]} »`)
      }
      vus.add(pack[champ])
    }
  }

  return valides
}

/** Prix formaté en euros, à partir des centimes. */
export function formaterPrix(centimes: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    // Un prix de 49 € s'affiche « 49 € » et non « 49,00 € » : plus net, et
    // c'est la convention des catalogues.
    minimumFractionDigits: centimes % 100 === 0 ? 0 : 2,
  }).format(centimes / 100)
}

/** « 2026-09 » devient « septembre 2026 ». */
export function formaterMois(aaaaMm: string): string {
  const [annee, mois] = aaaaMm.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(annee, mois - 1, 1)
  )
}
