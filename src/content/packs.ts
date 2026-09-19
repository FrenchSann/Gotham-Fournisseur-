import { validerCatalogue, type Pack } from './types'

/**
 * LE CATALOGUE — source de vérité unique.
 *
 * ⚠️ **Contenu fictif.** Les six entrées ci-dessous sont des données de
 * travail, réalistes mais inventées, qui permettent de construire et de tester
 * tout le site avant que les vrais dossiers existent. Elles sont remplacées à
 * la tâche T9.2, et c'est le seul fichier à éditer ce jour-là.
 *
 * Le prix affiché vient d'ici. Le prix **débité**, lui, viendra toujours de
 * Stripe via `stripePriceId` : un montant transmis par le navigateur n'est
 * jamais pris en compte.
 */
const CATALOGUE = [
  {
    ref: 'AN-01',
    slug: 'textile-europe',
    nom: 'Textile Europe',
    accroche: '112 usines textiles auditées au Portugal, en Turquie et en Pologne',
    description: [
      'Le sourcing textile européen tient en une contradiction : les délais et la traçabilité y sont incomparables, mais les usines qui acceptent de petites séries ne se trouvent dans aucun annuaire. Elles travaillent au bouche-à-oreille, pour des marques qui se gardent bien de les citer.',
      "Ce dossier recense 112 ateliers contactés un par un, avec pour chacun le minimum de commande réellement pratiqué — pas celui affiché — l'interlocuteur qui répond en français ou en anglais, et le délai constaté sur une première série.",
    ],
    contenu: [
      '112 fiches usine : contact direct, minimum de commande, délais constatés',
      'Spécialités par atelier : maille, chaîne et trame, jersey, denim, technique',
      'Grille de prix indicative par type de pièce et par volume',
      'Modèle de premier contact en français, anglais et portugais',
      'Liste des 9 usines acceptant moins de 50 pièces par référence',
    ],
    prixCentimes: 6900,
    stripePriceId: null,
    fichierStorage: 'packs/an-01-textile-europe.pdf',
    formatFichier: 'PDF + XLSX',
    fournisseurs: 112,
    pages: 64,
    pays: ['Portugal', 'Turquie', 'Pologne', 'Italie'],
    misAJour: '2026-09',
    teinte: '#8a6a3c',
  },
  {
    ref: 'AN-02',
    slug: 'petite-serie-france',
    nom: 'Petite Série France',
    accroche: '74 fabricants français acceptant des séries sous 200 pièces',
    description: [
      "Fabriquer en France sans commander des milliers d'unités est possible, mais la difficulté est d'identifier qui accepte vraiment. La plupart des ateliers annoncent un minimum élevé par précaution et le négocient en réalité au cas par cas.",
      "Ce dossier liste 74 fabricants répartis sur onze régions, avec le minimum obtenu en pratique lors d'une prise de contact réelle, et la mention explicite de ceux qui refusent les premières séries.",
    ],
    contenu: [
      '74 fiches fabricant classées par région et par savoir-faire',
      'Minimum de commande obtenu en pratique, pas celui du site vitrine',
      'Certifications : Origine France Garantie, GOTS, Oeko-Tex',
      'Délais moyens observés hors période de rush',
      'Les 12 ateliers à éviter pour une première série, et pourquoi',
    ],
    prixCentimes: 7900,
    stripePriceId: null,
    fichierStorage: 'packs/an-02-petite-serie-france.pdf',
    formatFichier: 'PDF + XLSX',
    fournisseurs: 74,
    pages: 52,
    pays: ['France'],
    misAJour: '2026-08',
    teinte: '#9c3b3b',
  },
  {
    ref: 'AN-03',
    slug: 'cosmetique-facon',
    nom: 'Cosmétique à Façon',
    accroche: '58 façonniers cosmétiques, réglementation européenne incluse',
    description: [
      "Lancer une marque de cosmétique bute rarement sur la formule : elle bute sur le dossier d'information produit, la personne responsable et la notification au portail européen. Un façonnier qui prend ces démarches en charge fait gagner six mois.",
      'Ce dossier distingue explicitement les façonniers qui gèrent la conformité réglementaire de ceux qui se contentent de remplir des flacons.',
    ],
    contenu: [
      '58 façonniers en France, Italie, Espagne et Pologne',
      'Qui prend en charge le dossier d’information produit, qui ne le fait pas',
      'Minimums par forme galénique : crème, sérum, huile, solide',
      'Fournisseurs de packaging compatibles, par façonnier',
      'Mémo réglementaire : les 7 étapes avant la première vente dans l’UE',
    ],
    prixCentimes: 8900,
    stripePriceId: null,
    fichierStorage: 'packs/an-03-cosmetique-facon.pdf',
    formatFichier: 'PDF + XLSX',
    fournisseurs: 58,
    pages: 71,
    pays: ['France', 'Italie', 'Espagne', 'Pologne'],
    misAJour: '2026-09',
    teinte: '#7a6b8f',
  },
  {
    ref: 'AN-04',
    slug: 'metal-usinage',
    nom: 'Métal & Usinage',
    accroche: '91 ateliers d’usinage et de tôlerie, du prototype à la série',
    description: [
      "Un atelier d'usinage refuse rarement un devis : il le chiffre simplement trop haut quand la pièce ne correspond pas à son parc machine. Savoir qui possède quoi évite des semaines de devis à côté de la plaque.",
      'Ce dossier classe 91 ateliers par équipement réel — tournage, fraisage 3 ou 5 axes, découpe laser, pliage, soudure — et indique pour chacun le seuil à partir duquel le prix à la pièce devient intéressant.',
    ],
    contenu: [
      '91 ateliers classés par parc machine réel',
      'Matières travaillées : aluminium, inox, laiton, acier',
      'Seuil de rentabilité par atelier, en nombre de pièces',
      'Qui accepte le prototype à l’unité, qui ne prend qu’à partir de 100',
      'Modèle de cahier des charges pour obtenir un devis exploitable',
    ],
    prixCentimes: 8900,
    stripePriceId: null,
    fichierStorage: 'packs/an-04-metal-usinage.pdf',
    formatFichier: 'PDF + XLSX',
    fournisseurs: 91,
    pages: 58,
    pays: ['France', 'Allemagne', 'République tchèque', 'Portugal'],
    misAJour: '2026-07',
    teinte: '#5f7384',
  },
  {
    ref: 'AN-05',
    slug: 'asie-verifiee',
    nom: 'Asie Vérifiée',
    accroche: '134 usines asiatiques avec audit sur place documenté',
    description: [
      "Les plateformes de sourcing asiatiques listent surtout des intermédiaires qui se présentent en fabricants. La marge s'empile, le contrôle qualité disparaît, et le donneur d'ordre ne sait jamais qui produit réellement.",
      "Ce dossier ne retient que des usines dont l'existence a été vérifiée : numéro d'enregistrement, photographies d'atelier datées, et pour 41 d'entre elles un rapport d'audit tiers consultable.",
    ],
    contenu: [
      '134 usines en Chine, au Vietnam, en Inde et en Corée du Sud',
      'Numéro d’enregistrement vérifié et photos d’atelier datées',
      '41 rapports d’audit tiers consultables',
      'Comment distinguer un fabricant d’un négociant, méthode en 6 points',
      'Incoterms et frais réels de dédouanement vers l’Union européenne',
    ],
    prixCentimes: 11900,
    stripePriceId: null,
    fichierStorage: 'packs/an-05-asie-verifiee.pdf',
    formatFichier: 'PDF + XLSX',
    fournisseurs: 134,
    pages: 96,
    pays: ['Chine', 'Vietnam', 'Inde', 'Corée du Sud'],
    misAJour: '2026-09',
    teinte: '#b8912f',
  },
  {
    ref: 'AN-06',
    slug: 'packaging-impression',
    nom: 'Packaging & Impression',
    accroche: '67 imprimeurs et cartonniers, petites séries acceptées',
    description: [
      "Le packaging décide de la première impression d'un produit et pèse souvent plus lourd que prévu dans le prix de revient. Les imprimeurs qui acceptent moins de mille exemplaires sans faire exploser le prix unitaire sont rares.",
      'Ce dossier recense 67 imprimeurs et cartonniers européens, avec le prix constaté à 100, 500 et 1000 exemplaires pour trois formats types.',
    ],
    contenu: [
      '67 imprimeurs et cartonniers en Europe',
      'Prix constaté à 100, 500 et 1000 exemplaires',
      'Techniques : offset, numérique, sérigraphie, dorure à chaud',
      'Fournisseurs de matières recyclées et certifications FSC',
      'Gabarits de découpe pour les trois formats les plus courants',
    ],
    prixCentimes: 5900,
    stripePriceId: null,
    fichierStorage: 'packs/an-06-packaging-impression.pdf',
    formatFichier: 'PDF + XLSX',
    fournisseurs: 67,
    pages: 44,
    pays: ['France', 'Pologne', 'Pays-Bas', 'Portugal'],
    misAJour: '2026-08',
    teinte: '#4f7a63',
  },
] as const satisfies readonly Pack[]

/**
 * Le catalogue validé.
 *
 * La validation s'exécute à l'import du module, donc au build : un catalogue
 * mal formé fait échouer `npm run build` plutôt que de partir en production.
 */
export const PACKS: readonly Pack[] = validerCatalogue(CATALOGUE)

export function trouverPack(slug: string): Pack | undefined {
  return PACKS.find((pack) => pack.slug === slug)
}

/** Chiffres agrégés affichés sur l'accueil. Calculés, jamais saisis. */
export const TOTAUX = {
  packs: PACKS.length,
  fournisseurs: PACKS.reduce((somme, pack) => somme + pack.fournisseurs, 0),
  pages: PACKS.reduce((somme, pack) => somme + pack.pages, 0),
  pays: new Set(PACKS.flatMap((pack) => pack.pays)).size,
} as const
