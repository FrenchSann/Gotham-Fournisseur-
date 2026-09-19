# Spec : ARSENAL NOIR

> Vente en ligne de packs de fournisseurs (listes d'usines vérifiées) à des particuliers,
> livrés par email sous forme de lien de téléchargement signé et expirant.
> Version 1.0 — 19 septembre 2026 — **statut : en attente de validation**

---

## 0. Hypothèses (à corriger maintenant, sinon je pars là-dessus)

1. Tu es basé en **France** et tu vends à des **particuliers de l'UE** (B2C) → TVA au taux du pays du client, obligations du Code de la consommation français.
2. Tu disposes déjà (ou peux créer) d'un **compte Stripe** et d'un **nom de domaine**.
3. Les packs sont des fichiers **PDF et/ou XLSX déjà produits par toi**, de moins de 50 Mo chacun. Le site ne les génère pas.
4. Le contenu vendu est **légal** : annuaires de fournisseurs / usines, sourcing produit. Aucune arme, aucune donnée personnelle revendue. L'esthétique « armurier » est **purement visuelle**.
5. Pas de compte client au lancement : achat en invité, un email suffit.
6. Pas de marketplace, pas de vendeurs tiers, pas d'abonnement récurrent en v1.

---

## 1. Objectif

### Ce qu'on construit

Un site vitrine + e-commerce mono-produit-multiple : un catalogue de 3 à 8 « packs » de fournisseurs. Le visiteur choisit un pack, paie par carte, et reçoit dans les 60 secondes un email contenant un lien de téléchargement personnel, valable 72 h et limité à 5 téléchargements.

### Pour qui

- **Cible principale** : e-commerçants débutants, dropshippers, créateurs de marque (18-35 ans) cherchant des fournisseurs fiables sans passer des semaines à prospecter.
- **Contexte d'achat** : mobile à plus de 70 %, décision impulsive, panier 15-80 €, tunnel qui doit tenir en moins de 3 clics.

### Le nom

**ARSENAL NOIR** — retenu.

_Pourquoi_ : « arsenal » signifie littéralement un dépôt d'armes **et** un stock de ressources à disposition. Double sens direct avec « ton arsenal de fournisseurs ». « Noir » ancre l'ambiance sombre sans toucher à la propriété intellectuelle de DC Comics (on n'utilise **jamais** les mots Gotham, Wayne, Arkham, ni chauve-souris, ni bat-signal — voir Boundaries).

Alternatives si le domaine est pris : `CALIBRE NOIR`, `FONDERIE 13`, `ORDNANCE SUPPLY`, `MANUFACTURE NOIRE`.

Domaines à viser, dans l'ordre : `arsenalnoir.com` → `arsenalnoir.fr` → `arsenal-noir.com`.

### Baseline

> **ARSENAL NOIR — Approvisionnement stratégique.**
> Dossiers de fournisseurs vérifiés. Livraison immédiate.

### À quoi ressemble le succès

- Un inconnu arrive sur le site, comprend en moins de 10 secondes ce qui est vendu, achète et reçoit son fichier sans intervention humaine.
- Zéro fichier accessible sans paiement.
- Zéro donnée bancaire ne transite par notre serveur.
- Le site tient en ligne à coût quasi nul tant qu'il n'y a pas de trafic.

---

## 2. Direction artistique

### Le brief en une phrase

Le catalogue d'un armurier industriel d'Europe de l'Est, imprimé en 1978, retrouvé dans une ville sans soleil. Technique, austère, lourd, zéro fantaisie.

### Ce qu'on prend chez Kalashnikov Group

- Typographie **condensée, capitales, très large** sur les titres — le titre est l'image.
- **Étiquettes techniques** partout : références produit (`RÉF. AN-04`), compteurs, indices, numérotation de sections en `01 / 02 / 03`.
- Grille stricte, filets fins de 1 px, aucun coin arrondi.
- Photo pleine largeur traitée en quasi-monochrome, texte posé dessus.
- **Une seule** couleur d'accent, utilisée avec parcimonie.

### Ce qu'on ajoute pour l'ambiance nocturne

- Fond quasi noir plutôt que blanc, éclairage rasant, halo ambré froid.
- Grain de film animé et vignettage discret.
- Le site **respire en permanence** : rien n'est totalement immobile à l'écran. Voir « Mouvement » ci-dessous.

### Jetons de design (à graver dans `globals.css`)

| Jeton         | Valeur    | Usage                                              |
| ------------- | --------- | -------------------------------------------------- |
| `--void`      | `#08090B` | Fond de page                                       |
| `--steel-900` | `#101317` | Cartes, surfaces                                   |
| `--steel-700` | `#1A1E24` | Surfaces surélevées                                |
| `--steel-500` | `#2A3038` | Bordures, filets                                   |
| `--ash`       | `#8A9099` | Texte secondaire                                   |
| `--bone`      | `#E6E4E0` | Texte principal                                    |
| `--ember`     | `#C1272D` | Accent unique : CTA, alertes, soulignés            |
| `--brass`     | `#B8912F` | Accent secondaire, rare : sceaux, numéros de série |

Contraste vérifié : `--bone` sur `--void` = 15.8:1, `--ash` sur `--void` = 6.9:1, blanc sur `--ember` = 5.1:1. Tous au-dessus de WCAG AA.

### Typographie

- **Titres** : `Barlow Condensed` 700/900, capitales, `letter-spacing: 0.02em`, tailles fluides `clamp(2.5rem, 8vw, 7rem)` sur le hero.
- **Étiquettes techniques** : `IBM Plex Mono` 500, capitales, `0.75rem`, `letter-spacing: 0.12em`, couleur `--ash`.
- **Corps** : `Inter` 400/500, `1rem`/`1.6`, largeur de ligne max 68 caractères.
- Chargées via `next/font/google` (auto-hébergées, zéro requête vers Google au runtime — important pour le RGPD et la CSP).

### Règles dures

- Jamais de dégradé arc-en-ciel, jamais de violet SaaS, jamais d'emoji dans l'interface.
- `border-radius: 0` partout.
- L'accent `--ember` ne dépasse pas ~5 % de la surface visible d'un écran.
- Chaque pack porte une **référence** (`AN-01`, `AN-02`…) affichée en mono — c'est ce détail qui fait « catalogue d'armurier ».

---

## 2 bis. Mouvement

Le site doit être **vivant**. Pas une page qui s'anime au chargement puis se fige : une atmosphère qui bouge en continu, et une choréographie au défilement qui donne l'impression de descendre dans un entrepôt.

### Les deux registres de vitesse

C'est la règle qui empêche le site de virer au sapin de Noël. Deux vitesses, jamais mélangées :

| Registre                                | Durée                            | Courbe                                     | Ce qui l'utilise                                |
| --------------------------------------- | -------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| **Machine** — réponse à une action      | 120-200 ms                       | `cubic-bezier(.2,0,0,1)`, sec, sans rebond | Survols, clics, ouvertures, changements d'état  |
| **Atmosphère** — ambiance et défilement | 800 ms à 20 s, souvent en boucle | `linear` ou sinusoïdal très lent           | Fond, brume, parallaxe, révélations, projecteur |

Une interface qui répond lentement paraît cassée ; une ambiance qui bouge vite paraît cheap. Le contraste entre les deux **est** l'effet.

### Couche 0 — Le fond permanent (canvas fixe, plein écran)

Un seul `<canvas>` fixe derrière tout le contenu, composé de quatre effets superposés :

1. **Brume volumétrique** — deux à trois nappes de bruit de Perlin qui dérivent lentement dans des directions opposées (cycle de 40 à 60 s). C'est ce qui donne la profondeur.
2. **Projecteur rasant** — une ellipse de lumière ambrée très diffuse qui balaie l'écran d'un bord à l'autre en 25 s environ, révélant brièvement la grille en dessous. Le geste signature du site.
3. **Poussière en suspension** — 40 à 80 particules de 1 à 2 px dérivant vers le haut, vitesses et opacités aléatoires. Réagit très légèrement à la position de la souris (décalage de quelques pixels, jamais de poursuite).
4. **Grain de film** — bruit régénéré à 12 fps (pas 60 : le grain doit _sauter_, comme une pellicule), opacité 3 %, en `mix-blend-mode: overlay`.

Par-dessus, en SVG et non en canvas : une **grille technique** de 80 px qui dérive de quelques pixels en boucle lente, et une **ligne de balayage** horizontale qui descend l'écran toutes les 8 s.

Contraintes non négociables sur cette couche : 30 fps cible (pas 60 — le grain et la brume n'en ont pas besoin), `requestAnimationFrame` coupé quand l'onglet est caché, densité de particules divisée par trois sous 768 px, et **arrêt complet** si `prefers-reduced-motion: reduce`.

### Couche 1 — Choréographie au défilement

- **Hero** : le titre arrive en capitales géantes, lettre par lettre, avec un effet de **décodage** — chaque caractère défile en glyphes aléatoires (`▚ ▞ █ / 7 F X`) pendant 300 ms avant de se fixer. On ouvre un dossier classé, pas une page web.
- **Parallaxe sur trois plans** : fond (0,2×), contenu médian (0,6×), premier plan (1×). Différence subtile mais c'est ce qui crée la sensation de volume.
- **Bandeau défilant** (marquee) entre les sections : `FOURNISSEURS VÉRIFIÉS · LIVRAISON IMMÉDIATE · 112 USINES · RÉF. AN-01 —` en mono, défilement infini, vitesse liée au sens du scroll.
- **Révélation par masque** : les blocs n'apparaissent pas en fondu. Un volet se lève et découvre le contenu (`clip-path: inset()` animé), toujours dans le même sens.
- **Section catalogue épinglée** : la section se fige, les cartes de packs défilent horizontalement pendant que la page continue verticalement. L'effet « rayonnage » — c'est le moment fort de la page.
- **Compteurs** : les chiffres clés (nombre d'usines, de pages, de pays) s'incrémentent quand ils entrent dans le viewport.
- **Filets d'encadrement** : les bordures fines se tracent d'un point à l'autre au lieu d'apparaître.

### Couche 2 — Micro-interactions

- **Curseur réticule** sur desktop : un viseur fin remplace le curseur, s'élargit au survol des éléments cliquables et affiche une étiquette contextuelle (`ACQUÉRIR`, `CONSULTER`). Curseur natif conservé partout où on saisit du texte.
- **Cartes de packs** : au survol, l'image se désature moins, un filet `--ember` se trace sur le bord gauche, la référence produit glisse de 4 px. Trois choses discrètes plutôt qu'une grosse.
- **Boutons** : remplissage par volet depuis la gauche, le texte passe en négatif. Pas de changement de couleur en fondu.
- **Liens** : soulignement qui se trace depuis la gauche en 160 ms.
- **Défilement lissé** via Lenis — inertie légère (lerp 0,08), c'est ce qui rend toute la choréographie fluide au lieu de saccadée.

### Couche 3 — Transitions de page

Volet qui se ferme sur toute la hauteur, la référence de la page suivante s'affiche en mono au centre pendant 200 ms, le volet se rouvre. Total : 600 ms. Implémenté avec l'API View Transitions native, avec repli en fondu simple sur les navigateurs qui ne la supportent pas.

### Les garde-fous

Ils comptent autant que les effets, sinon le site devient invendable :

- **`prefers-reduced-motion: reduce` coupe tout.** Canvas éteint, parallaxe désactivée, Lenis désactivé, décodage remplacé par le texte final, révélations remplacées par un `opacity` instantané. Le site reste entièrement utilisable et beau. Ce n'est pas une dégradation, c'est une seconde version assumée.
- **Aucune animation ne bloque la lecture.** Le contenu est présent dans le DOM et lisible même si le JavaScript ne charge pas. Les révélations partent de `opacity: 1` et sont masquées _par_ le script — jamais l'inverse (sinon un échec de JS laisse une page blanche).
- **Aucune animation sur le tunnel de paiement.** Les pages checkout, merci et téléchargement sont sobres : fond statique, aucune parallaxe. On n'anime pas un moment où le client doit avoir confiance.
- **Uniquement `transform` et `opacity`.** Jamais d'animation sur `width`, `height`, `top` ou `box-shadow` — ce sont les propriétés qui déclenchent un recalcul de mise en page à chaque image.
- **Budget d'image : 8 ms.** Si une animation fait tomber sous 50 fps sur un mobile milieu de gamme, elle est simplifiée ou supprimée. Mesuré, pas estimé.
- **Mobile allégé** : pas de curseur réticule, pas de section épinglée horizontale (défilement vertical classique), particules divisées par trois, parallaxe réduite de moitié.

---

## 3. Stack technique

| Couche            | Choix                                                      | Pourquoi                                                                                                                                |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | **Next.js 16** (App Router, React 19.2, Server Components) | Rendu serveur pour le SEO, routes API intégrées pour le webhook, déploiement Vercel en une commande. Turbopack par défaut.              |
| Langage           | **TypeScript 5** en `strict`                               | Les erreurs de tunnel de paiement doivent être attrapées à la compilation.                                                              |
| Styles            | **Tailwind CSS v4** + jetons CSS natifs                    | Pas de fichier de config JS, jetons dans `globals.css`, purge automatique.                                                              |
| Paiement          | **Stripe Checkout** (session hébergée) + webhooks          | Aucune donnée carte chez nous → PCI-DSS hors périmètre. Apple/Google Pay gratuits. TVA UE calculée par Stripe Tax.                      |
| Base de données   | **Supabase Postgres**                                      | Une seule table `orders`. Gratuit, migrable.                                                                                            |
| Stockage fichiers | **Supabase Storage**, bucket **privé**                     | URLs signées natives avec expiration. Le fichier n'est jamais public.                                                                   |
| Email             | **Resend** + React Email                                   | 3 000 mails/mois gratuits, SPF/DKIM/DMARC guidés, excellente délivrabilité.                                                             |
| Animation         | **GSAP 3 + ScrollTrigger**                                 | Le seul outil qui gère proprement les sections épinglées et le défilement horizontal. Gratuit depuis 2025, plugins inclus. ~50 Ko gzip. |
| Défilement        | **Lenis**                                                  | Inertie de défilement, 3 Ko. Sans lui toute la choréographie paraît saccadée.                                                           |
| Fond animé        | **Canvas 2D maison** (~5 Ko)                               | Brume, projecteur, poussière, grain. Pas de three.js : WebGL coûterait 150 Ko et de la batterie pour un rendu qu'on obtient en 2D.      |
| Validation        | **Zod**                                                    | Toute entrée externe (webhook, params d'URL) validée avant usage.                                                                       |
| Hébergement       | **Vercel** (plan Hobby)                                    | HTTPS + HSTS automatiques, preview par branche, edge caching, 0 €/mois au démarrage.                                                    |
| Analytics         | **Vercel Web Analytics** (sans cookie)                     | Aucun cookie tiers → **pas de bandeau cookies nécessaire**.                                                                             |
| Tests             | **Vitest** (unitaire) + **Playwright** (e2e)               |                                                                                                                                         |

### Ce qu'on n'utilise volontairement pas

Pas de CMS, pas de Prisma, pas de Redux, pas de tRPC, pas de Docker, pas de monorepo, pas de librairie de composants. Le catalogue tient dans un fichier TypeScript de 100 lignes.

Pas de three.js ni de moteur WebGL : le fond animé est du canvas 2D écrit à la main, et il fait le même effet pour trente fois moins de poids. Pas de Motion/Framer en plus de GSAP — un seul moteur d'animation, sinon on se retrouve avec deux boucles de rendu concurrentes.

**Budget JavaScript : 200 Ko gzip au premier chargement, animation comprise.** C'est le chiffre qui arbitre toute demande d'ajout de librairie.

### Alerte environnement

Le projet est actuellement dans `OneDrive/Desktop`. OneDrive synchronise `node_modules` (~300 Mo, 40 000 fichiers) et provoque des verrous de fichiers et des builds lents ou corrompus.

**Action recommandée avant la première commande** : déplacer le projet vers `C:\dev\arsenal-noir`. À défaut, exclure le dossier de la synchronisation via Paramètres OneDrive → Compte → Choisir les dossiers.

---

## 4. Commandes

```bash
# Installation
npm install

# Développement (http://localhost:3000)
npm run dev

# Écoute des webhooks Stripe en local (terminal séparé, requis pour tester un achat)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Qualité
npm run lint            # eslint --max-warnings=0
npm run typecheck       # tsc --noEmit
npm run format          # prettier --write .

# Tests
npm test                # vitest run
npm run test:watch      # vitest
npm run test:cov        # vitest run --coverage
npm run e2e             # playwright test
npm run e2e:ui          # playwright test --ui

# Build et vérification avant déploiement
npm run build           # next build
npm run verify          # npm run typecheck && npm run lint && npm test && npm run build

# Sécurité
npm audit --audit-level=high

# Déploiement
vercel                  # déploiement de prévisualisation
vercel --prod           # mise en production
```

`npm run verify` est la barrière : rien ne part en production sans qu'elle passe au vert.

---

## 5. Structure du projet

```
arsenal-noir/
├── SPEC.md                         → Ce document
├── README.md                       → Démarrage rapide, variables d'env
├── .env.example                    → Toutes les clés, sans valeur
├── .env.local                      → Secrets réels — JAMAIS commité
├── next.config.ts                  → En-têtes de sécurité, CSP
├── src/
│   ├── app/
│   │   ├── layout.tsx              → Polices, en-tête, pied de page
│   │   ├── page.tsx                → Accueil : hero, catalogue, preuve, FAQ
│   │   ├── globals.css             → Jetons de design, base Tailwind
│   │   ├── packs/[slug]/page.tsx   → Fiche détaillée d'un pack
│   │   ├── merci/page.tsx          → Confirmation post-paiement
│   │   ├── telecharger/[token]/    → Route de téléchargement sécurisée
│   │   ├── legal/
│   │   │   ├── mentions/page.tsx
│   │   │   ├── cgv/page.tsx
│   │   │   └── confidentialite/page.tsx
│   │   └── api/
│   │       ├── checkout/route.ts   → Crée la session Stripe Checkout
│   │       └── stripe/webhook/route.ts → Reçoit le paiement, déclenche l'email
│   ├── components/
│   │   ├── ui/                     → Button, Tag, Rule, SectionNumber
│   │   ├── atmosphere/
│   │   │   ├── FondAnime.tsx       → Le canvas fixe (brume, projecteur, poussière, grain)
│   │   │   ├── GrilleTechnique.tsx → Grille SVG dérivante + ligne de balayage
│   │   │   ├── CurseurReticule.tsx → Viseur desktop
│   │   │   └── VoletTransition.tsx → Transition de page
│   │   ├── motion/
│   │   │   ├── TexteDecode.tsx     → Titres à effet de décodage
│   │   │   ├── RevelationVolet.tsx → Révélation par clip-path au scroll
│   │   │   ├── Compteur.tsx        → Chiffres qui s'incrémentent
│   │   │   └── BandeauDefilant.tsx → Marquee technique
│   │   ├── PackCard.tsx
│   │   ├── Hero.tsx
│   │   └── ...
│   ├── content/
│   │   └── packs.ts                → LE CATALOGUE : source de vérité unique
│   ├── emails/
│   │   └── DeliveryEmail.tsx       → Template React Email
│   └── lib/
│       ├── stripe.ts               → Client Stripe serveur
│       ├── supabase.ts             → Clients Supabase (public / service)
│       ├── delivery.ts             → Génération du lien signé + envoi
│       ├── tokens.ts               → Création/vérification des jetons HMAC
│       ├── rate-limit.ts           → Limitation de débit
│       ├── env.ts                  → Validation Zod des variables d'env au boot
│       └── animation/
│           ├── motion-tokens.ts    → Durées et courbes des deux registres
│           ├── use-reduced-motion.ts → Hook : une seule source de vérité
│           ├── lenis.ts            → Init du défilement lissé
│           └── bruit.ts            → Générateur de Perlin pour la brume
├── tests/                          → Tests unitaires Vitest (miroir de src/)
├── e2e/                            → Scénarios Playwright
├── supabase/migrations/            → Migrations SQL versionnées
└── public/                         → Images, favicon, og-image
```

### Le catalogue, source de vérité unique

```ts
// src/content/packs.ts
export const PACKS = [
  {
    ref: 'AN-01',
    slug: 'textile-europe',
    nom: 'Dossier Textile Europe',
    accroche: '112 usines textiles vérifiées, Portugal · Turquie · Pologne',
    prixCentimes: 4900,
    stripePriceId: 'price_xxx',
    fichierStorage: 'packs/an-01-textile-europe.pdf',
    pages: 48,
    fournisseurs: 112,
    misAJour: '2026-09',
  },
] as const satisfies readonly Pack[]
```

Un seul endroit à modifier pour ajouter un pack. Le prix affiché vient d'ici, le prix **débité** vient de Stripe — voir Sécurité.

---

## 6. Style de code

```ts
// src/lib/tokens.ts
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'

const DUREE_VALIDITE_MS = 72 * 60 * 60 * 1000

type ChargeUtile = { commandeId: string; packRef: string; expireLe: number }

/**
 * Fabrique un jeton de téléchargement signé.
 * Le jeton est auto-porteur : il contient sa propre date d'expiration,
 * ce qui évite un aller-retour en base pour rejeter un lien périmé.
 */
export function creerJetonTelechargement(commandeId: string, packRef: string): string {
  const charge: ChargeUtile = {
    commandeId,
    packRef,
    expireLe: Date.now() + DUREE_VALIDITE_MS,
  }
  const corps = Buffer.from(JSON.stringify(charge)).toString('base64url')
  return `${corps}.${signer(corps)}`
}

/** Renvoie la charge utile si le jeton est authentique et non expiré, sinon null. */
export function verifierJetonTelechargement(jeton: string): ChargeUtile | null {
  const [corps, signature] = jeton.split('.')
  if (!corps || !signature) return null

  const attendue = Buffer.from(signer(corps))
  const fournie = Buffer.from(signature)
  // Comparaison à temps constant : empêche de deviner la signature octet par octet.
  if (attendue.length !== fournie.length) return null
  if (!timingSafeEqual(attendue, fournie)) return null

  const charge = JSON.parse(Buffer.from(corps, 'base64url').toString()) as ChargeUtile
  return charge.expireLe > Date.now() ? charge : null
}

function signer(corps: string): string {
  return createHmac('sha256', env.DOWNLOAD_TOKEN_SECRET).update(corps).digest('base64url')
}
```

### Conventions

- **Langue** : identifiants métier et commentaires en **français**, primitives techniques en anglais (`slug`, `token`, `id`, `hash`). Un commentaire explique _pourquoi_, jamais _quoi_.
- **Nommage** : composants en `PascalCase`, fonctions et variables en `camelCase`, constantes de module en `SCREAMING_SNAKE`, fichiers de composants en `PascalCase.tsx`, tout le reste en `kebab-case.ts`.
- **Types** : `type` par défaut, `interface` seulement pour l'extension. Jamais de `any` — `unknown` + validation Zod à la place. `satisfies` pour garder l'inférence littérale.
- **Async** : `async/await` uniquement, jamais de chaîne `.then()`. Toute promesse est attendue ou explicitement `void`.
- **Erreurs** : on échoue tôt et bruyamment côté serveur, on affiche un message neutre côté client. **Aucune trace d'exécution ni message d'erreur interne renvoyé au navigateur.**
- **Serveur par défaut** : `'use client'` seulement quand un composant a besoin d'état ou d'un écouteur d'événement.
- **Imports** : alias `@/` uniquement, jamais de `../../..`.
- **Formatage** : Prettier, sans point-virgule, guillemets simples, 100 colonnes. Non négociable, non discuté.

---

## 7. Stratégie de test

| Niveau        | Outil                  | Périmètre                                                                                                         | Où                   |
| ------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------- |
| Unitaire      | Vitest                 | Signature et expiration des jetons, validation du catalogue, formatage des prix, limitation de débit, schémas Zod | `tests/`             |
| Intégration   | Vitest + `stripe-mock` | Handler du webhook : signature valide/invalide, rejeu, idempotence                                                | `tests/api/`         |
| End-to-end    | Playwright             | Parcours complet en mode test Stripe : accueil → pack → checkout → carte `4242…` → merci → email → téléchargement | `e2e/`               |
| Accessibilité | `@axe-core/playwright` | Zéro violation critique sur chaque page                                                                           | `e2e/a11y.spec.ts`   |
| Mouvement     | Playwright             | Comportement sous `prefers-reduced-motion`, contenu lisible sans JS                                               | `e2e/motion.spec.ts` |
| Performance   | Lighthouse CI          | Perf ≥ 85 mobile / ≥ 95 desktop, A11y ≥ 95, SEO ≥ 95                                                              | CI                   |

### Ce qui doit être couvert, sans exception

Ces cas sont la raison d'être de la suite de tests — un échec ici bloque le déploiement :

1. Un jeton expiré est refusé.
2. Un jeton dont un seul caractère a été modifié est refusé.
3. Un jeton valide pour le pack A ne donne pas accès au pack B.
4. Un webhook avec une signature invalide renvoie 400 et **n'envoie aucun email**.
5. Le même événement webhook reçu deux fois n'envoie **qu'un seul** email (idempotence).
6. Au-delà de 5 téléchargements, le lien est refusé.
7. Le prix débité correspond au `stripePriceId` du catalogue, jamais à un montant envoyé par le client.
8. Avec `prefers-reduced-motion: reduce`, le canvas ne tourne pas et tout le contenu est visible.
9. Avec JavaScript désactivé, le titre du hero et les packs sont lisibles (rien ne reste à `opacity: 0`).
10. Les pages du tunnel de paiement ne montent aucune couche d'atmosphère.

### Couverture

80 % de lignes minimum sur `src/lib/` et `src/app/api/`. Pas d'objectif chiffré sur les composants de présentation — on y teste le comportement, pas le balisage.

### Règle TDD

Pour tout ce qui touche au paiement, aux jetons ou à la livraison : **le test qui échoue est écrit en premier.** Le reste peut être testé après.

---

## 8. Sécurité

### Modèle de menace — qui attaque quoi

| Menace                                  | Réalité du risque                            | Parade                                                                                                                                                     |
| --------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Télécharger sans payer                  | **Élevée** — c'est tout le modèle économique | Bucket privé. URL signée Supabase de 60 s générée seulement après vérification du jeton HMAC. Le chemin du fichier n'apparaît jamais côté client.          |
| Partage massif du lien reçu             | **Élevée**                                   | Expiration 72 h + plafond de 5 téléchargements + journalisation IP. Filigrane avec l'email de l'acheteur sur le PDF (v1.1).                                |
| Falsification du prix                   | Moyenne                                      | On n'accepte **que** le `slug` du pack côté client. Le montant vient du `stripePriceId` serveur. Un montant envoyé par le navigateur est ignoré.           |
| Faux webhook « paiement réussi »        | Moyenne                                      | `stripe.webhooks.constructEvent()` avec le secret de signature. Corps brut lu avant tout parsing. Signature invalide → 400 immédiat.                       |
| Rejeu de webhook → doublons d'emails    | Moyenne                                      | Contrainte `UNIQUE` sur `stripe_session_id`. Insertion en premier, email ensuite.                                                                          |
| Fuite de la clé `service_role` Supabase | **Critique**                                 | Elle vit uniquement en variable d'environnement serveur. Un test CI échoue si une variable sans préfixe `NEXT_PUBLIC_` apparaît dans le bundle client.     |
| Brute-force sur `/telecharger/[token]`  | Faible (256 bits)                            | Limitation à 10 requêtes/minute/IP.                                                                                                                        |
| XSS                                     | Faible                                       | React échappe par défaut. `dangerouslySetInnerHTML` **interdit**. `object-src 'none'` et `base-uri 'self'`. Voir le compromis sur `script-src` ci-dessous. |
| Spam de sessions Checkout               | Faible                                       | Limitation à 5 requêtes/minute/IP sur `/api/checkout`.                                                                                                     |

### En-têtes de sécurité (`next.config.ts`)

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://js.stripe.com;
  frame-src https://js.stripe.com https://hooks.stripe.com; img-src 'self' data: blob:;
  style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.stripe.com https://*.supabase.co;
  font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com;
  frame-ancestors 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
```

Objectif : **A ou A+ sur securityheaders.com** et **A sur SSL Labs** avant l'annonce publique.

**Compromis assumé sur `script-src 'unsafe-inline'`** (décidé à l'étape 1, à réexaminer en T8.4).
Next injecte des scripts inline pour l'hydratation. Les éliminer impose un nonce régénéré à chaque requête, donc un `proxy.ts`, donc le **rendu dynamique de toutes les pages** — la documentation officielle de Next le dit explicitement. On perdrait la génération statique du catalogue, qui est notre principal levier de performance, et ce sur un site dont la promesse est justement d'être rapide malgré l'animation.

Le risque résiduel est faible et mesuré : aucun contenu utilisateur n'est jamais affiché, `dangerouslySetInnerHTML` est interdit par les boundaries, React échappe tout par défaut, et `object-src 'none'` + `base-uri 'self'` + `frame-ancestors 'none'` ferment les vecteurs restants. Il n'existe pas de surface d'injection sur ce site.

Ce choix coûte le A+ mais conserve le A. Si un jour on affiche du contenu venu d'ailleurs (avis clients, commentaires), cette décision doit être rouverte **avant** de livrer la fonctionnalité.

### Gestion des secrets

Toutes les variables passent par `src/lib/env.ts`, validé par Zod **au démarrage** — l'application refuse de booter si une clé manque, plutôt que d'échouer en production au premier paiement.

| Variable                             | Portée                           |
| ------------------------------------ | -------------------------------- |
| `STRIPE_SECRET_KEY`                  | serveur                          |
| `STRIPE_WEBHOOK_SECRET`              | serveur                          |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client (publique par conception) |
| `SUPABASE_SERVICE_ROLE_KEY`          | serveur — **jamais** exposée     |
| `NEXT_PUBLIC_SUPABASE_URL`           | client                           |
| `RESEND_API_KEY`                     | serveur                          |
| `DOWNLOAD_TOKEN_SECRET`              | serveur — 32 octets aléatoires   |

`.gitignore` bloque `.env*` sauf `.env.example`. Un hook pre-commit (gitleaks) scanne les secrets.

### RGPD

- Données collectées : **email uniquement**, plus ce que Stripe conserve de son côté (nous n'y touchons pas).
- Base légale : exécution du contrat.
- Conservation : 3 ans pour le service client, 10 ans pour les pièces comptables (obligation légale).
- Sous-traitants déclarés dans la politique de confidentialité : Stripe, Supabase, Resend, Vercel.
- Aucun cookie non essentiel → **pas de bandeau cookies**. Cette contrainte est une décision d'architecture : on ne l'abandonne pas pour ajouter Google Analytics.

### Conformité e-commerce française

- **Mentions légales** complètes (identité, SIRET, hébergeur Vercel avec adresse, directeur de publication).
- **CGV** avec la clause décisive : contenu numérique fourni immédiatement → le client doit **cocher explicitement** qu'il renonce à son droit de rétractation de 14 jours (art. L221-28 13° du Code de la consommation). **Sans cette case, tout client peut exiger un remboursement dans les 14 jours après avoir téléchargé le fichier.** C'est une case à cocher, jamais pré-cochée.
- Prix **TTC** affichés, TVA gérée par Stripe Tax.
- Bouton de paiement portant la mention « Commande avec obligation de paiement ».
- Email de confirmation valant facture.

---

## 9. Modèle de données

```sql
-- supabase/migrations/0001_orders.sql
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  stripe_session_id   text not null unique,   -- garantit l'idempotence du webhook
  email               text not null,
  pack_ref            text not null,
  montant_centimes    integer not null,
  devise              text not null default 'eur',
  telechargements     integer not null default 0,
  cree_le             timestamptz not null default now(),
  dernier_dl_le       timestamptz,
  derniere_ip         inet
);

create index orders_email_idx on orders (email);

alter table orders enable row level security;
-- Aucune policy : seule la clé service_role (serveur) accède à la table.
```

Une table, une contrainte d'unicité, un compteur. C'est tout ce dont la v1 a besoin.

---

## 10. Séquence de livraison (le cœur du système)

```
Client clique « Acquérir »
  └─→ POST /api/checkout { slug }
        ├─ Zod valide le slug
        ├─ Rate-limit 5/min/IP
        ├─ Recherche du pack dans PACKS → stripePriceId
        └─→ Stripe crée la session (montant côté serveur) → redirection 303

Client paie sur checkout.stripe.com
  └─→ Redirection vers /merci?session_id=…   (affichage uniquement, ne livre rien)

Stripe POST /api/stripe/webhook  « checkout.session.completed »
  ├─ Lecture du corps BRUT, vérification de la signature → sinon 400, fin
  ├─ INSERT dans orders (UNIQUE session_id) → si conflit : 200, on s'arrête (rejeu)
  ├─ creerJetonTelechargement(commandeId, packRef)
  ├─ Resend envoie l'email avec https://…/telecharger/<jeton>
  └─ 200

Client ouvre /telecharger/<jeton>
  ├─ Rate-limit 10/min/IP
  ├─ verifierJetonTelechargement → signature + expiration, sinon page « lien expiré »
  ├─ Lecture de orders, si telechargements >= 5 → refus
  ├─ UPDATE telechargements += 1, dernier_dl_le, derniere_ip
  └─ URL signée Supabase valable 60 s → redirection 302
```

**Décision clé** : la livraison est déclenchée par le **webhook**, jamais par la page de retour. Un client qui ferme son navigateur juste après le paiement reçoit quand même son fichier.

---

## 11. Ordre de construction

Une seule application déployable, donc un seul spec. Mais les capacités se construisent en chaîne stricte — chacune est vérifiable avant de passer à la suivante :

```
socle → atmosphère → catalogue → choréographie → checkout → livraison → légal → durcissement → mise en ligne
```

| #   | Étape                                                                                          | Terminée quand                                                   |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | **socle** — Next.js, TS strict, Tailwind, jetons de design, polices, `env.ts`                  | `npm run verify` passe sur une page vide stylée                  |
| 2   | **atmosphère** — canvas de fond, grille, Lenis, hook reduced-motion, curseur                   | Le fond tourne à 30 fps stables, tout s'éteint en reduced-motion |
| 3   | **catalogue** — `packs.ts`, accueil, fiches packs, responsive                                  | Les packs s'affichent et sont lisibles sans JavaScript           |
| 4   | **choréographie** — décodage, révélations, parallaxe, section épinglée, compteurs, transitions | Le parcours complet tient le budget de 8 ms par image sur mobile |
| 5   | **checkout** — route API, session Stripe, page merci (sans atmosphère)                         | Un paiement test aboutit sur `/merci`                            |
| 6   | **livraison** — table `orders`, webhook, jetons, Resend, route de téléchargement               | L'email arrive, le lien marche, le 6ᵉ téléchargement est refusé  |
| 7   | **légal** — mentions, CGV + case de renonciation, confidentialité                              | Les 3 pages existent, la case bloque le checkout si décochée     |
| 8   | **durcissement** — en-têtes, rate-limit, `npm audit`, audit CSP, tests de la section 7         | securityheaders.com ≥ A, tous les tests critiques au vert        |
| 9   | **mise en ligne** — domaine, DNS email, Stripe en mode live, Vercel prod                       | Un vrai achat avec une vraie carte fonctionne de bout en bout    |

**L'atmosphère passe avant le catalogue, volontairement.** Le fond animé et le défilement lissé sont la coquille dans laquelle tout le reste vit ; les greffer après coup sur des pages déjà construites impose de tout reprendre. En revanche la choréographie au défilement vient _après_ le catalogue — il faut du contenu réel à animer.

---

## 12. Déploiement

### Une seule fois

1. Créer le dépôt GitHub (privé), pousser `main`.
2. Importer le projet dans Vercel, connecter le dépôt.
3. Renseigner les variables d'environnement dans Vercel (Production + Preview séparées, clés Stripe **test** en Preview).
4. Brancher le domaine → Vercel émet le certificat TLS et active HSTS.
5. **DNS email** chez le registrar : enregistrements SPF, DKIM et DMARC fournis par Resend. Sans eux, les emails de livraison partent en spam — c'est la cause n°1 d'échec de ce type de site.
6. Créer l'endpoint webhook dans le tableau de bord Stripe → `https://arsenalnoir.com/api/stripe/webhook`, événement `checkout.session.completed`, copier le secret de signature dans Vercel.
7. Créer le bucket Supabase `packs` en **privé**, y déposer les fichiers.

### À chaque déploiement

`push` sur une branche → preview automatique. Merge sur `main` → production. `npm run verify` tourne en CI GitHub Actions et bloque le merge si elle échoue.

### Rollback

`vercel rollback` restaure le déploiement précédent en quelques secondes. Le paiement continue de fonctionner puisque Stripe et Supabase ne sont pas touchés.

### Coût mensuel au lancement

Vercel Hobby 0 € + Supabase Free 0 € + Resend Free 0 € + domaine ~12 €/an + Stripe 1,5 % + 0,25 € par transaction. **Environ 1 €/mois hors ventes.**

---

## 13. Boundaries

### Toujours

- Lancer `npm run verify` avant tout commit.
- Valider toute entrée externe avec Zod avant de s'en servir.
- Vérifier la signature du webhook avant de lire son contenu.
- Prendre le montant à débiter dans le catalogue serveur, jamais dans la requête client.
- Garder les fichiers de packs dans un bucket privé, servis uniquement par URL signée de courte durée.
- Écrire le test qui échoue en premier pour tout ce qui touche paiement, jetons ou livraison.
- Vérifier le contraste (AA minimum) à chaque nouvelle combinaison de couleurs.
- Tester chaque page à 375 px de large avant de la considérer finie.
- Prévoir le repli `prefers-reduced-motion` **en même temps** que l'animation, jamais après.
- Écrire le contenu visible par défaut et le masquer par script — jamais l'inverse.
- Couper les boucles `requestAnimationFrame` quand l'onglet est caché ou l'élément hors écran.
- Mesurer le coût d'une animation au profileur avant de la garder.

### Demander avant

- Ajouter une dépendance npm (le but est une stack minuscule).
- Changer le schéma de la base ou créer une migration.
- Modifier prix, contenu ou intitulé d'un pack.
- Passer Stripe du mode test au mode live.
- Acheter le domaine ou modifier des enregistrements DNS.
- Toucher aux textes légaux (CGV, mentions, confidentialité).
- Envoyer un email à une adresse réelle depuis l'environnement de développement.
- Publier le dépôt en public.

### Jamais

- Commiter un secret, une clé ou un `.env.local`.
- Exposer `SUPABASE_SERVICE_ROLE_KEY` ou `STRIPE_SECRET_KEY` côté client.
- Rendre un bucket de packs public, ou servir un fichier depuis une URL devinable.
- Livrer un fichier sans avoir confirmé le paiement via le webhook signé.
- Utiliser les marques de DC Comics : Gotham, Wayne, Arkham, Batman, bat-signal, ou toute silhouette de chauve-souris. L'ambiance passe par la typographie, la lumière et le ton — pas par l'emprunt.
- Vendre, suggérer ou évoquer de vraies armes, munitions ou pièces d'armes. L'esthétique est un décor ; le produit reste du sourcing industriel.
- Stocker un numéro de carte, même partiel, où que ce soit.
- Désactiver un test ou ajouter un `@ts-ignore` pour faire passer le build.
- Ajouter un traceur à cookie (Google Analytics, Meta Pixel) sans revoir toute la stratégie RGPD et ajouter un bandeau conforme.
- Utiliser `dangerouslySetInnerHTML`.
- Animer autre chose que `transform` et `opacity`.
- Animer quoi que ce soit sur les pages checkout, merci ou téléchargement.
- Ajouter un second moteur d'animation à côté de GSAP.
- Dépasser 200 Ko de JavaScript gzip au premier chargement.
- Faire clignoter quoi que ce soit à plus de 3 Hz (risque photosensible, WCAG 2.3.1).
- Laisser une animation retarder l'affichage du prix, du bouton d'achat ou d'un texte légal.

---

## 14. Critères de succès

**Fonctionnels**

- [ ] Les packs s'affichent sur l'accueil avec leur référence, leur prix TTC et leur accroche.
- [ ] Un achat en mode test Stripe déclenche l'arrivée d'un email en moins de 60 secondes.
- [ ] Le lien du mail télécharge le bon fichier.
- [ ] Le lien est refusé après 72 h ou après 5 téléchargements.
- [ ] Un lien falsifié d'un seul caractère est refusé.
- [ ] Un webhook rejoué n'envoie pas un second email.
- [ ] Le checkout est bloqué tant que la case de renonciation au droit de rétractation n'est pas cochée.

**Qualité**

- [ ] `npm run verify` au vert.
- [ ] Lighthouse : Performance ≥ 85 mobile et ≥ 95 desktop, Accessibilité ≥ 95, SEO ≥ 95.
- [ ] LCP < 2,5 s et CLS < 0,1 en 4G simulée.
- [ ] Zéro violation axe critique.
- [ ] Aucune erreur console en production.
- [ ] Rendu correct de 375 px à 2560 px.

**Mouvement**

- [ ] Le fond tourne en continu sans dépasser 8 ms par image sur un mobile milieu de gamme.
- [ ] Le défilement de l'accueil reste au-dessus de 50 fps du haut en bas de la page.
- [ ] `prefers-reduced-motion: reduce` éteint canvas, parallaxe, Lenis et décodage — et le site reste beau.
- [ ] JavaScript désactivé : tout le contenu est lisible, rien ne reste invisible.
- [ ] JS total ≤ 200 Ko gzip au premier chargement.
- [ ] Onglet en arrière-plan : aucune boucle d'animation ne tourne (vérifié au profileur).
- [ ] Batterie : pas de chauffe notable après 2 minutes sur la page d'accueil en mobile.

**Sécurité**

- [ ] securityheaders.com ≥ A.
- [ ] SSL Labs ≥ A.
- [ ] `npm audit --audit-level=high` sans résultat.
- [ ] Aucun secret dans le bundle client (test automatisé).
- [ ] Aucun fichier de pack accessible sans jeton valide (vérifié en tentant l'accès direct au bucket).

**Conformité**

- [ ] Mentions légales, CGV et politique de confidentialité en ligne et liées depuis le pied de page.
- [ ] SPF, DKIM et DMARC validés ; un email de test arrive en boîte de réception chez Gmail et Outlook.

---

## 15. Questions ouvertes

1. **Contenu réel des packs** — combien exactement, quels intitulés, quels prix ? Le développement peut démarrer avec des données fictives, mais l'étape 2 a besoin des vrais.
2. **Statut juridique** — auto-entrepreneur ou société ? Le SIRET et la mention TVA des mentions légales en dépendent, ainsi que le paramétrage de Stripe Tax.
3. **Domaine** — `arsenalnoir.com` est-il libre ? À vérifier avant l'étape 7.
4. **Photographie** — as-tu des visuels, ou je pars sur une direction générée / banque d'images traitée en monochrome ? Le rendu « armurier » dépend beaucoup de la qualité des images.
5. **Filigrane par acheteur** sur les PDF — sérieux dissuasif contre la revente, mais ajoute une étape de traitement à la livraison. Repoussé en v1.1 sauf avis contraire.
6. **Remboursements** — politique volontaire au-delà de l'obligation légale (par exemple 7 jours sans condition) ? Cela rassure à l'achat mais expose au téléchargement-puis-remboursement.
