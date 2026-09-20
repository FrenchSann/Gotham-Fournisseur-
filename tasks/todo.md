# Tâches — ARSENAL NOIR

> Découpage de `tasks/plan.md`. Chaque tâche tient dans une session, touche 5 fichiers au maximum,
> et se termine par une vérification exécutable. Une porte d'étape échouée bloque l'étape suivante.

---

## Étape 0 — Préparation

- [x] **T0.1 — Sortir le projet de OneDrive**
  - Acceptation : le projet vit dans `C:\dev\arsenal-noir`, plus aucun fichier dans `OneDrive/Desktop/Gotham Fourniseur`.
  - Vérifier : `cd /c/dev/arsenal-noir && ls SPEC.md tasks/`
  - Fichiers : déplacement de dossier, aucun code.

- [ ] **T0.2 — Créer les comptes de service**
  - Acceptation : comptes Stripe (mode test), Supabase (projet créé), Resend et Vercel actifs. Clés notées dans un gestionnaire de mots de passe, jamais dans un fichier du projet.
  - Vérifier : se connecter à chaque tableau de bord.
  - Fichiers : aucun.
  - ⚠️ Nécessite une action de ta part — je ne crée pas de compte à ta place.

---

## Étape 1 — Socle

- [x] **T1.1 — Initialiser le projet Next.js**
  - Acceptation : Next.js 16 + TypeScript strict + Tailwind v4 + ESLint, dépôt git initialisé, premier commit.
  - Vérifier : `npm run dev` sert une page sur `localhost:3000`.
  - Fichiers : `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `src/app/layout.tsx`.

- [x] **T1.2 — Poser les jetons de design**
  - Acceptation : les 8 couleurs de la section 2 du spec, les durées et courbes des deux registres, et la grille d'espacement sont définies en variables CSS dans `globals.css`. `border-radius: 0` par défaut.
  - Vérifier : une page de démonstration affiche les 8 couleurs ; contraste mesuré à l'inspecteur.
  - Fichiers : `src/app/globals.css`, `src/lib/animation/motion-tokens.ts`.

- [x] **T1.3 — Charger les polices**
  - Acceptation : Barlow Condensed, IBM Plex Mono et Inter chargées via `next/font/google`, auto-hébergées, `display: swap`.
  - Vérifier : onglet réseau — aucune requête vers `fonts.googleapis.com` ni `fonts.gstatic.com`.
  - Fichiers : `src/app/layout.tsx`, `src/app/globals.css`.

- [x] **T1.4 — Valider les variables d'environnement au démarrage**
  - Acceptation : schéma Zod couvrant les 7 variables du spec. L'application refuse de booter si une clé manque, avec un message nommant la variable fautive.
  - Vérifier : supprimer une variable de `.env.local` → le démarrage échoue avec un message clair.
  - Fichiers : `src/lib/env.ts`, `.env.example`, `.env.local`.

- [x] **T1.5 — Activer la CSP et les en-têtes de sécurité dès maintenant**
  - Acceptation : les 6 en-têtes de la section 8 du spec sont servis en dev comme en prod.
  - Vérifier : `curl -I localhost:3000 | grep -i content-security` ; zéro violation CSP en console.
  - Fichiers : `next.config.ts`.

- [x] **T1.6 — Mettre en place les scripts et la CI**
  - Acceptation : `verify`, `typecheck`, `lint`, `format`, `test` dans `package.json`. GitHub Actions lance `npm run verify` sur chaque PR.
  - Vérifier : `npm run verify` passe ; une PR de test déclenche le workflow.
  - Fichiers : `package.json`, `.github/workflows/ci.yml`, `.prettierrc`.

- [x] **T1.7 — Séparer les deux mondes**
  - Acceptation : route groups `(vitrine)` et `(transaction)`, chacun avec son layout. Le layout transaction ne monte aucune couche animée.
  - Vérifier : une page factice dans chaque groupe s'affiche à l'URL attendue.
  - Fichiers : `src/app/(vitrine)/layout.tsx`, `src/app/(transaction)/layout.tsx`.

**🚪 Porte 1** — `npm run verify` au vert, CSP active sans erreur console.

---

## Étape 2 — Atmosphère

- [x] **T2.1 — Hook `prefers-reduced-motion`**
  - Acceptation : hook unique renvoyant un booléen, réactif au changement de préférence système sans rechargement. Source de vérité unique pour tout le site.
  - Vérifier : test Vitest ; bascule de la préférence dans les DevTools → l'état change en direct.
  - Fichiers : `src/lib/animation/use-reduced-motion.ts`, `tests/animation/use-reduced-motion.test.ts`.

- [x] **T2.2 — Ordonnanceur d'animation**
  - Acceptation : un seul `requestAnimationFrame` partagé, throttlé à 30 fps, coupé sur `visibilitychange` et sur reduced-motion. Les abonnés s'inscrivent et se désinscrivent proprement.
  - Vérifier : test Vitest sur l'inscription/désinscription ; profileur — zéro image rendue en onglet caché.
  - Fichiers : `src/lib/animation/boucle.ts`, `tests/animation/boucle.test.ts`.

- [x] **T2.3 — Générateur de bruit de Perlin**
  - Acceptation : fonction déterministe à graine, testée, sans dépendance externe.
  - Vérifier : test Vitest — même graine, même sortie ; valeurs bornées entre -1 et 1.
  - Fichiers : `src/lib/animation/bruit.ts`, `tests/animation/bruit.test.ts`.

- [x] **T2.4 — Canvas de fond : brume**
  - Acceptation : deux ou trois nappes de Perlin dérivant en sens opposés sur un cycle de 40 à 60 s, canvas fixe plein écran derrière tout le contenu.
  - Vérifier : visuel, plus profileur — coût par image mesuré et noté.
  - Fichiers : `src/components/atmosphere/FondAnime.tsx`, `src/lib/animation/couches/brume.ts`.

- [x] **T2.5 — Canvas de fond : projecteur rasant**
  - Acceptation : une ellipse ambrée très diffuse balaie l'écran en ~25 s, en boucle. Le geste signature du site.
  - Vérifier : visuel ; coût par image toujours sous le budget.
  - Fichiers : `src/lib/animation/couches/projecteur.ts`.

- [x] **T2.6 — Canvas de fond : poussière**
  - Acceptation : 40 à 80 particules dérivant vers le haut, densité divisée par trois sous 768 px, réaction très légère à la souris (quelques pixels, jamais de poursuite).
  - Vérifier : compter les particules à 375 px et à 1440 px ; visuel.
  - Fichiers : `src/lib/animation/couches/poussiere.ts`.

- [x] **T2.7 — Canvas de fond : grain de film**
  - Acceptation : bruit régénéré à 12 fps exactement (le grain doit sauter), opacité 3 %, `mix-blend-mode: overlay`.
  - Vérifier : visuel ; confirmer la cadence de 12 fps au profileur.
  - Fichiers : `src/lib/animation/couches/grain.ts`.

- [x] **T2.8 — Grille technique et ligne de balayage**
  - Acceptation : grille SVG de 80 px dérivant en boucle lente, ligne horizontale descendant l'écran toutes les 8 s. En CSS pur, hors canvas.
  - Vérifier : visuel ; aucune image supplémentaire consommée sur le canvas.
  - Fichiers : `src/components/atmosphere/GrilleTechnique.tsx`.

- [x] **T2.9 — Défilement lissé Lenis**
  - Acceptation : inertie à lerp 0,08, synchronisé avec GSAP ScrollTrigger, désactivé en reduced-motion.
  - Vérifier : le défilement est fluide ; en reduced-motion le défilement natif reprend la main.
  - Fichiers : `src/lib/animation/lenis.ts`, `src/app/(vitrine)/layout.tsx`.

- [x] **T2.10 — Curseur réticule**
  - Acceptation : viseur fin sur desktop avec pointeur fin uniquement (`@media (pointer: fine)`), s'élargit sur les éléments cliquables, affiche une étiquette contextuelle. Curseur natif conservé sur tout champ de saisie.
  - Vérifier : desktop visuel ; sur mobile aucun curseur custom ; tabulation au clavier non affectée.
  - Fichiers : `src/components/atmosphere/CurseurReticule.tsx`.

- [x] **T2.11 — Extinction totale en reduced-motion**
  - Acceptation : canvas démonté, grille figée, Lenis désactivé, curseur natif. Le site reste esthétique — ce n'est pas une version dégradée.
  - Vérifier : test Playwright avec `reducedMotion: 'reduce'` — le canvas n'est pas dans le DOM ; capture d'écran comparée à l'œil.
  - Fichiers : `src/components/atmosphere/FondAnime.tsx`, `e2e/motion.spec.ts`.

**🚪 Porte 2 — FRANCHIE** (19 septembre 2026)

| Profil                          | fps moyen | p95     | Tâches longues | Verdict |
| ------------------------------- | --------- | ------- | -------------- | ------- |
| Bureau 1280×720                 | 60,2      | 17,0 ms | 0 ms           | OK      |
| Mobile milieu de gamme (CPU ×4) | 60,4      | 16,8 ms | 0 ms           | OK      |
| Mobile bas de gamme (CPU ×6)    | 54,3      | 33,3 ms | 0 ms           | OK      |

Mesure : `npm run perf`. Extinction complète en reduced-motion et absence de rendu en onglet caché vérifiées par `e2e/motion.spec.ts` (14 tests, bureau et mobile).

⚠️ **Piège de mesure, à ne pas réapprendre.** En Chromium headless il n'y a pas de GPU : la même page tombe à 16 fps et le diagnostic accuse à tort le code. Une page vide donnait 60 fps dans le même environnement, ce qui a permis de disqualifier la mesure. `scripts/mesure-perf.mjs` lance donc volontairement un navigateur **visible**.

⚠️ **Non vérifié : le rendu visuel.** La performance est prouvée, l'esthétique ne l'est pas — l'extension Chrome n'étant pas connectée, aucune capture d'écran n'a pu être prise. À regarder avec `npm run dev`.

---

## Étape 3 — Catalogue

- [x] **T3.1 — Modèle de données du catalogue**
  - Acceptation : type `Pack`, 6 packs fictifs mais réalistes (références AN-01 à AN-06), validation Zod du tableau au build.
  - Vérifier : test Vitest — références uniques, slugs uniques, prix positifs, tous les champs présents.
  - Fichiers : `src/content/packs.ts`, `src/content/types.ts`, `tests/content/packs.test.ts`.

- [x] **T3.2 — Composants d'interface de base**
  - Acceptation : `Button`, `Tag`, `Rule`, `SectionNumber`, `EtiquetteMono` — tous sans état, tous en composants serveur.
  - Vérifier : page de démonstration affichant chaque variante.
  - Fichiers : `src/components/ui/*.tsx` (5 fichiers).

- [x] **T3.3 — Carte de pack**
  - Acceptation : référence en mono, visuel désaturé, nom, accroche, prix TTC, nombre de fournisseurs. Survol : désaturation réduite, filet `--ember` tracé à gauche, référence glissant de 4 px.
  - Vérifier : visuel à 375 px et 1440 px ; les trois effets de survol sont distincts.
  - Fichiers : `src/components/PackCard.tsx`.

- [x] **T3.4 — Hero de l'accueil**
  - Acceptation : titre en capitales `clamp(2.5rem, 8vw, 7rem)`, baseline, CTA, étiquettes techniques. Contenu présent dans le HTML servi.
  - Vérifier : JS désactivé → le titre est lisible ; `curl localhost:3000 | grep ARSENAL`.
  - Fichiers : `src/components/Hero.tsx`, `src/app/(vitrine)/page.tsx`.

- [x] **T3.5 — Sections de l'accueil**
  - Acceptation : catalogue, « comment ça marche » en 3 étapes numérotées, preuves/chiffres, FAQ. Sections numérotées `01 / 02 / 03`.
  - Vérifier : visuel de bout en bout ; hiérarchie de titres correcte (un seul `h1`).
  - Fichiers : `src/app/(vitrine)/page.tsx`, `src/components/sections/*.tsx` (4 fichiers).

- [x] **T3.6 — Fiche détaillée d'un pack**
  - Acceptation : route `/packs/[slug]`, `generateStaticParams` sur les 6 packs, 404 sur un slug inconnu, sommaire du contenu, bouton d'achat.
  - Vérifier : les 6 URLs répondent 200 ; `/packs/inexistant` répond 404.
  - Fichiers : `src/app/(vitrine)/packs/[slug]/page.tsx`.

- [x] **T3.7 — En-tête, pied de page et métadonnées SEO**
  - Acceptation : navigation, liens légaux dans le pied de page, `metadata` par page, image Open Graph, `sitemap.xml`, `robots.txt`.
  - Vérifier : partager une URL sur un aperçu OG ; `/sitemap.xml` liste toutes les pages.
  - Fichiers : `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `public/og-image.png`.

**Ajout hors plan initial — étape 3 bis : la 3D** (demandée le 19 septembre 2026)

- [x] **T3b.1 — Détection des capacités** — WebGL2 réellement obtenu, niveau de l'appareil. `src/lib/trois/capacites.ts`
- [x] **T3b.2 — Shader de fumée volumétrique** — raymarching, bruit fractal, éclairage diffus. `src/lib/trois/shaders/volume.ts`
- [x] **T3b.3 — Scène de fond** — volume en cible réduite, poussière en profondeur, caméra qui dérive. `src/lib/trois/scene-fond.ts`
- [x] **T3b.4 — Caisses du catalogue** — géométrie procédurale, une teinte par pack. `src/lib/trois/caisse.ts`
- [x] **T3b.5 — Contexte WebGL partagé** — un seul canvas, une zone par carte via le test de ciseau. `src/lib/trois/scene-catalogue.ts`
- [x] **T3b.6 — Repli** — bascule vers le fond 2D sans WebGL, sur appareil modeste, ou à la perte du contexte.
- [x] **T3b.7 — Chargement différé** — import dynamique + `requestIdleCallback`.
- [x] **T3b.8 — Optimisation** — de 10 à 60 images par seconde, mesurée à chaque étape.

**Ajout hors plan initial — étape 3 ter : la passe cinématographique** (demandée le 19 septembre 2026)

- [x] **T3t.1 — Décor** — masses sombres en couloir fuyant, un seul `InstancedMesh`, dessinées derrière la fumée. C'est ce qui donne une échelle au volume. `src/lib/trois/decor.ts`
- [x] **T3t.2 — Gobo et contre-jour froid** — la lumière arrive découpée en rais larges, et une seconde source froide s'y oppose. Le couple chaud/froid remplace l'ambre général. `src/lib/trois/shaders/volume.ts`
- [x] **T3t.3 — Diffusion atmosphérique** — la lumière est accumulée à chaque pas du rayon, y compris dans l'air vide. **C'est la correction qui fait exister le faisceau** : tant qu'on n'éclairait que les nappes, il n'y avait rien à éclairer aux trois quarts du volume.
- [x] **T3t.4 — Étalonnage** — halo, traînée anamorphique, frange chromatique, séparation des tons, courbe filmique, vignettage, en une passe. `src/lib/trois/shaders/composition.ts`
- [x] **T3t.5 — Mouvement de caméra** — dérive, flottement à l'épaule, travelling au défilement, focale qui respire. Écrit en nombres purs, donc testé. `src/lib/trois/camera-cine.ts`, `tests/trois/camera-cine.test.ts`
- [x] **T3t.6 — Braises** — une particule sur quarante, plus rapide, scintillante. Même attribut, même appel de dessin.
- [x] **T3t.7 — Le grain passe dans le shader** — le calque 2D en `mix-blend-mode` est retiré quand la 3D tourne. C'est ce retrait qui a payé tout le reste.

**🚪 Porte 3 ter — FRANCHIE** (19 septembre 2026)

| Profil                              | fps moyen | p95     | Tâches longues | Avant (porte 3) |
| ----------------------------------- | --------- | ------- | -------------- | --------------- |
| Bureau 1280×720 (avec 3D)           | 59,1      | 17,0 ms | 0 ms           | 39,8 / 33,6 ms  |
| Mobile milieu de gamme ×4 (fond 2D) | 60,1      | 16,9 ms | 0 ms           | 60,2 / 16,9 ms  |
| Mobile bas de gamme ×6 (fond 2D)    | 60,3      | 16,8 ms | 0 ms           | 57,5 / 33,2 ms  |

**Le bureau ne tenait pas 60 images par seconde à la porte 3 ; il les tient maintenant, avec une scène bien plus lourde.** Le point ouvert n°1 de la porte 3 est donc clos, et la piste notée à l'époque était la bonne : le coût n'était pas dans le calcul mais dans la composition de trois calques plein écran dont un en `mix-blend-mode`. Fondre le grain dans le shader a libéré assez de marge pour payer le décor, l'étalonnage, les rais — et pour monter la résolution du volume de 0,30 à 0,42 et les pas de 16 à 20.

⚠️ **Deux points ouverts, honnêtement.**

1. **Le blocage au démarrage monte à 1,1 s sur bureau** (indicatif, cible 500 ms). Un shader de plus à compiler. Il reste hors du chemin critique — différé à un temps mort, contenu lisible et cliquable avant — mais le chiffre est à surveiller.
2. **`e2e/motion.spec.ts` « cesse de dessiner quand l'onglet est caché » échoue sur cette machine**, en mobile. Vérifié par `git stash` : **il échoue aussi sans les changements de cette étape**, donc ce n'est pas une régression. Le test compte les images d'une page mise en arrière-plan et mesure en réalité la politique de gel du navigateur, qui dépend de l'état du système et des autres fenêtres ouvertes. À reprendre : il devrait observer la boucle du site plutôt que celle du navigateur.

**🚪 Porte 3 — FRANCHIE** (19 septembre 2026)

| Profil                              | Régime établi | fps  | p95     | Tâches longues |
| ----------------------------------- | ------------- | ---- | ------- | -------------- |
| Bureau 1280×720 (avec 3D)           | OK            | 39,8 | 33,6 ms | 0 ms           |
| Mobile milieu de gamme ×4 (fond 2D) | OK            | 60,2 | 16,9 ms | 0 ms           |
| Mobile bas de gamme ×6 (fond 2D)    | OK            | 57,5 | 33,2 ms | 0 ms           |

Contenu lisible sans JavaScript, rendu vérifié de 375 px à 2560 px, 56 tests unitaires et 16 tests e2e au vert, aucune erreur de console.

⚠️ **Deux points ouverts, honnêtement.**

1. ~~**Le bureau oscille entre 30 et 60 images par seconde** plutôt que de tenir 60.~~ **Clos à l'étape 3 ter** : la piste notée ici — fusionner le grain dans le shader du fond — était la bonne. Le bureau tient 59,1 fps avec une scène plus lourde.
2. **Lighthouse n'a pas encore été passé** (prévu en T8.8). Le chiffre de la porte 3 initiale (≥ 85 mobile) reste donc à confirmer.

---

## Étape 4 — Choréographie

- [x] **T4.1 — Intégrer GSAP et ScrollTrigger**
  - Fait : chargement différé à un temps mort (comme three.js), ScrollTrigger branché sur Lenis, un contexte GSAP par composant, révoqué au démontage. Registre `lenis.ts` pour que le moteur atteigne une instance créée par React.
  - Vérifié : `e2e/choregraphie.spec.ts` — cinq allers-retours accueil ↔ fiche, le compte de déclencheurs ne croît pas.
  - Fichiers : `src/lib/animation/gsap.ts`, `lenis.ts`, `use-choregraphie.ts`, `differer.ts` (déplacé depuis `lib/trois`).
  - ⚠️ **Piège coûteux, documenté sur place** : les deux boucles doivent partager une horloge. Le ticker GSAP compte depuis son initialisation, le composant depuis `performance.now()` ; à la reprise du pilotage, Lenis recevait un horodatage inférieur de plusieurs secondes, en déduisait un intervalle négatif, et **la page se mettait à défiler toute seule** — en production uniquement.

- [x] **T4.2 — Texte à décodage**
  - Fait : logique pure dans `lib/animation/decodage.ts` (`brouiller(texte, avancement)`), composant qui lit le texte servi pour connaître sa cible. Blocs pleins retirés du jeu de glyphes après essai : à 9 rem, un « █ » se lit comme un rectangle blanc, pas comme un caractère.
  - Vérifié : 10 tests Vitest (longueur constante, cascade monotone, déterminisme) ; e2e — le titre final est servi sans JavaScript et en mouvement réduit.
  - Fichiers : `src/lib/animation/decodage.ts`, `src/components/motion/TexteDecode.tsx`, `tests/motion/texte-decode.test.ts`.

- [x] **T4.3 — Révélation par volet**
  - Fait : `clip-path: inset()` animé, toujours du bas vers le haut, posé par attribut `data-revelation`. **Sous 768 px, remplacé par un fondu-glissé** (`opacity` + `y`) : un `clip-path` animé est repeint à chaque image, et une douzaine de blocs révélés pendant un défilement rapide bloquaient le thread principal d'un téléphone. Le spec prévoit un « mobile allégé » ; ceci en fait partie.
  - Vérifié : e2e sans JavaScript et en mouvement réduit — aucun bloc ne porte de découpe résiduelle.
  - Fichiers : `src/components/motion/Choregraphie.tsx`.

- [x] **T4.4 — Parallaxe sur trois plans**
  - Fait : attribut `data-parallaxe="fond|median"`, `transform` uniquement, amplitude divisée par deux sous 768 px, couche de composition promue pendant le mouvement seulement.
  - Fichiers : `src/components/motion/Choregraphie.tsx`.

- [x] **T4.5 — Section catalogue épinglée**
  - Fait : la section se fige sur la hauteur de l'écran, le rayonnage défile à l'horizontale, un pixel de molette pour un pixel de rayonnage, scrub amorti à 0,6 s. Grille verticale sous 768 px et en mouvement réduit.
  - Vérifié : captures à 1440 px, entrée, milieu et sortie de l'épinglage ; les caisses 3D suivent leur carte pendant le défilement horizontal.
  - Fichiers : `src/components/sections/CatalogueEpingle.tsx`, `src/app/(vitrine)/page.tsx`.
  - Trois pièges documentés dans l'en-tête du fichier : distance recalculée (`invalidateOnRefresh`), aucune marge extérieure (le `pin-spacer` la piégerait), largeur explicite des enfants (une colonne flex les rétracte sur leur contenu).

- [x] **T4.6 — Compteurs et bandeau défilant**
  - Fait : compteurs partant de zéro _depuis le script_ (la vraie valeur est servie), chiffres tabulaires pour que la ligne ne danse pas ; bandeau en deux copies, vitesse pilotée par la vélocité de défilement, **arrêté tant qu'il n'est pas à l'écran** et vitesse visée par `quickTo` plutôt que par une animation allouée à chaque événement.
  - Vérifié : e2e — les vrais chiffres sont servis sans JavaScript ; mentions construites depuis `packs.ts`.
  - Fichiers : `src/components/motion/Compteur.tsx`, `BandeauDefilant.tsx`.

- [x] **T4.7 — Filets qui se tracent**
  - Fait : `Filet` gagne une option `anime` qui pose un attribut ; le tracé se fait en `scaleX` depuis la gauche. Le filet reste un composant serveur.
  - Fichiers : `src/components/ui/Primitives.tsx`, `src/components/motion/Choregraphie.tsx`.

- [x] **T4.8 — Transitions de page**
  - Fait : `<ViewTransition>` de React (disponible sans configuration dans l'App Router de Next 16), volet fermant en 250 ms puis ouvrant en 350 ms — 600 ms au total. Racine non animée, clics non capturés pendant la transition, coupé en mouvement réduit.
  - Fichiers : `src/components/atmosphere/VoletTransition.tsx`, `src/app/globals.css`.
  - ⚠️ **En retrait sur un point du spec** : la référence de la page suivante ne s'affiche pas en mono pendant que le volet est fermé. Pendant une transition il n'existe que deux captures d'écran, aucun élément vivant ; y poser un texte demanderait un calque monté hors de React, c'est-à-dire exactement la machinerie que cette API permet d'éviter. La référence se découvre en haut de la fiche, à la levée du volet.

- [x] **T4.9 — Passe de performance**
  - Fait : `npm run perf` mesure désormais **deux régimes** (au repos et en défilement) et **le budget JavaScript**, en séparant l'initial du différé. Corrections issues de la mesure : chargement de GSAP différé à un temps mort, déclencheurs groupés par `ScrollTrigger.batch` (deux `IntersectionObserver` au lieu d'une cinquantaine de déclencheurs testés à chaque image), bandeau arrêté hors champ, densité du canvas ramenée à 1 sous 768 px, calque de grain non monté sous 768 px, révélation composée sur écran étroit.
  - Fichiers : `scripts/mesure-perf.mjs` et les composants de mouvement.
  - **Trois erreurs de mesure trouvées et corrigées dans la sonde elle-même**, chacune donnant un chiffre faux mais crédible : octets décodés au lieu de compressés (budget trois fois trop gros), attente de démarrage à durée fixe (le travail unique tombait dans la fenêtre de mesure sur processeur bridé, d'où des écarts de 12 à 56 fps sur le même code), et défilement à la molette sur un profil mobile (un téléphone n'a pas de molette, et Lenis laisse la main au doigt).
  - **Une optimisation essayée puis abandonnée** : fondre le grain dans le canvas d'ambiance, comme on l'a fait dans le shader 3D. `globalCompositeOperation` en canvas 2D est un mélange fait par le processeur à chaque image, là où `mix-blend-mode` est fait par le compositeur : 23 images par seconde au lieu de 56. La bonne réponse était de ne pas monter le calque du tout sous 768 px.

**🚪 Porte 4 — FRANCHIE EN PARTIE** (20 septembre 2026)

| Profil                    | Repos    | p95 repos | **Défilement**  | p95 défilement |
| ------------------------- | -------- | --------- | --------------- | -------------- |
| Bureau 1280×720 (avec 3D) | 60.2 fps | 17.0 ms   | **57.4 fps**    | 16.9 ms        |
| Mobile milieu de gamme ×4 | 59.5 fps | 16.9 ms   | **52.9 fps**    | 33.4 ms        |
| Mobile bas de gamme ×6    | 56.9 fps | 33.3 ms   | **29.3 fps** ❌ | 100 ms         |

Mesure : `npm run perf`, machine au repos. Le critère du spec pour le défilement est
« plus de 50 fps sur mobile milieu de gamme » ; le profil bas de gamme garde celui des
portes précédentes, 30 fps. Aucune tâche longue au repos sur aucun profil.

Reduced-motion : 15 tests e2e au vert (`motion.spec.ts`, `choregraphie.spec.ts`) —
aucun canvas monté, aucun bloc masqué, **le moteur d'animation n'est même pas téléchargé**.

❌ **Budget JavaScript non tenu : 239 Ko de chargement initial pour 39 Ko de dépassement**
(critère : 200 Ko gzip), plus 190 Ko différés (three.js et GSAP).

Ce n'est **pas** une régression de l'étape 4 : la même mesure sur le commit précédent donne
236 Ko. La choréographie a ajouté 3 Ko au chargement initial — GSAP, ses 45 Ko, est
entièrement différé. Le dépassement est structurel (React, Next, et les composants clients
de l'atmosphère) et il attend l'analyse de bundle prévue en T8.8. **À traiter là, pas ici :
le corriger demanderait de retirer des composants clients, ce qui est une décision de
produit, pas une passe de performance.**

⚠️ **Point ouvert : le défilement sur appareil très lent.** Sur le profil bridé ×6, la
choréographie et le fond coûtent ensemble une vingtaine d'images par seconde — mesuré en
désactivant l'un puis l'autre. Le remède est connu et déjà en place pour la 3D : ne rien
monter du tout sur un appareil jugé modeste. Il n'est pas appliqué ici parce que le signal
disponible (`appareilModeste()`) écarte _tous_ les écrans sous 1024 px, y compris de bons
téléphones, et qu'aucun profil d'émulation ne permet de valider un critère plus fin sur
cette machine. À reprendre à l'étape 8, avec un vrai appareil.

---

## Étape 5 — Checkout

- [ ] **T5.1 — Installer la CLI Stripe et créer les produits**
  - Acceptation : CLI installée et authentifiée, 6 produits et prix créés en mode test, `stripePriceId` renseignés dans `packs.ts`.
  - Vérifier : `stripe products list` affiche les 6 produits.
  - Fichiers : `src/content/packs.ts`.

- [ ] **T5.2 — Client Stripe serveur**
  - Acceptation : instance unique, version d'API épinglée, `import 'server-only'` pour interdire toute importation côté client.
  - Vérifier : une tentative d'import dans un composant client fait échouer le build.
  - Fichiers : `src/lib/stripe.ts`.

- [ ] **T5.3 — Route de création de session — TDD**
  - Acceptation : `POST /api/checkout` accepte **uniquement** un `slug`. Montant et devise proviennent du catalogue serveur. Slug inconnu → 400. Un montant envoyé par le client est ignoré.
  - Vérifier : test écrit en premier, avec le cas « le client envoie `prixCentimes: 1` » → le montant débité reste celui du catalogue.
  - Fichiers : `src/app/api/checkout/route.ts`, `tests/api/checkout.test.ts`.

- [ ] **T5.4 — Bouton d'achat**
  - Acceptation : état de chargement, désactivé pendant la requête, message d'erreur neutre en cas d'échec, redirection vers Stripe. Mention « Commande avec obligation de paiement ».
  - Vérifier : parcours manuel jusqu'à la page Stripe.
  - Fichiers : `src/components/BoutonAchat.tsx`.

- [ ] **T5.5 — Page de remerciement**
  - Acceptation : dans le groupe `(transaction)`, aucune atmosphère, message clair « votre email arrive dans la minute », rappel de vérifier les spams. **Ne livre rien.**
  - Vérifier : `/merci` ne contient aucun canvas ; aucune requête de fichier.
  - Fichiers : `src/app/(transaction)/merci/page.tsx`.

**🚪 Porte 5** — paiement test abouti avec la carte `4242 4242 4242 4242`, montant falsifié rejeté.

---

## Étape 6 — Livraison

- [ ] **T6.1 — Migration de la table `orders`**
  - Acceptation : table conforme à la section 9 du spec, contrainte `UNIQUE` sur `stripe_session_id`, RLS activée sans policy.
  - Vérifier : la migration s'applique ; un double insert du même `session_id` échoue.
  - Fichiers : `supabase/migrations/0001_orders.sql`.

- [ ] **T6.2 — Bucket privé et vérification d'étanchéité**
  - Acceptation : bucket `packs` créé en privé, fichiers de test déposés.
  - Vérifier : `curl` sur l'URL publique du bucket → **400 ou 403 exigé**. Un 200 est un échec bloquant.
  - Fichiers : aucun (configuration Supabase) + note dans `README.md`.

- [ ] **T6.3 — Jetons de téléchargement — TDD**
  - Acceptation : HMAC-SHA256, expiration auto-portée à 72 h, comparaison à temps constant.
  - Vérifier : les tests 1, 2 et 3 de la section 7 du spec sont écrits **avant** l'implémentation et passent.
  - Fichiers : `src/lib/tokens.ts`, `tests/tokens.test.ts`.

- [ ] **T6.4 — Handler de webhook — TDD**
  - Acceptation : corps brut lu avant tout parsing, signature vérifiée, insert avant envoi, conflit `UNIQUE` → 200 silencieux.
  - Vérifier : les tests 4 et 5 de la section 7 écrits en premier ; `stripe trigger checkout.session.completed` deux fois → un seul email.
  - Fichiers : `src/app/api/stripe/webhook/route.ts`, `tests/api/webhook.test.ts`.

- [ ] **T6.5 — Template d'email**
  - Acceptation : React Email, esthétique du site adaptée aux clients mail (tableaux, styles en ligne), lien de téléchargement, référence de commande, mention de validité 72 h / 5 téléchargements, valant facture.
  - Vérifier : prévisualisation ; rendu testé sur Gmail, Outlook et Apple Mail.
  - Fichiers : `src/emails/DeliveryEmail.tsx`.

- [ ] **T6.6 — Envoi via Resend**
  - Acceptation : fonction d'envoi avec une reprise sur échec, erreurs journalisées sans jamais interrompre la réponse 200 au webhook.
  - Vérifier : simuler une panne Resend → le webhook renvoie quand même 200 et l'erreur est journalisée.
  - Fichiers : `src/lib/delivery.ts`.

- [ ] **T6.7 — Configurer le DNS email**
  - Acceptation : SPF, DKIM et DMARC posés chez le registrar, domaine vérifié dans Resend.
  - Vérifier : **mail-tester.com ≥ 9/10** ; réception en boîte principale chez Gmail et Outlook.
  - Fichiers : aucun (DNS).
  - ⚠️ Propagation possible jusqu'à 24 h. À lancer tôt.

- [ ] **T6.8 — Route de téléchargement — TDD**
  - Acceptation : vérification du jeton, plafond de 5 téléchargements, incrément du compteur, URL signée Supabase de 60 s, redirection 302. Page « lien expiré » soignée avec un contact.
  - Vérifier : le test 6 de la section 7 écrit en premier ; 6 téléchargements consécutifs → le 6ᵉ est refusé.
  - Fichiers : `src/app/(transaction)/telecharger/[token]/page.tsx`, `tests/telechargement.test.ts`.

**🚪 Porte 6** — email reçu en moins de 60 s, lien fonctionnel, 6ᵉ téléchargement refusé, rejeu sans doublon, mail-tester ≥ 9/10.

---

## Étape 7 — Légal

- [ ] **T7.1 — Mentions légales**
  - Acceptation : identité, SIRET, hébergeur Vercel avec adresse complète, directeur de publication, contact.
  - Vérifier : relecture ; tous les champs renseignés, aucun crochet laissé en place.
  - Fichiers : `src/app/(vitrine)/legal/mentions/page.tsx`.
  - ⚠️ Nécessite ton SIRET et ton statut juridique.

- [ ] **T7.2 — CGV**
  - Acceptation : objet, prix TTC, modalités de paiement, livraison numérique, **clause de renonciation au droit de rétractation** (art. L221-28 13°), réclamations, médiation, droit applicable.
  - Vérifier : relecture ; la clause de renonciation est explicite et non ambiguë.
  - Fichiers : `src/app/(vitrine)/legal/cgv/page.tsx`.

- [ ] **T7.3 — Politique de confidentialité**
  - Acceptation : données collectées, base légale, durées de conservation, les 4 sous-traitants nommés, droits RGPD, contact.
  - Vérifier : relecture.
  - Fichiers : `src/app/(vitrine)/legal/confidentialite/page.tsx`.

- [ ] **T7.4 — Case de renonciation bloquante**
  - Acceptation : case **non pré-cochée** sur la fiche pack, bouton d'achat désactivé tant qu'elle n'est pas cochée, texte de la case citant l'article. Consentement horodaté et stocké dans les métadonnées Stripe.
  - Vérifier : test e2e — clic sur « Acquérir » sans cocher → aucune session Stripe créée. La métadonnée apparaît dans le tableau de bord Stripe.
  - Fichiers : `src/components/BoutonAchat.tsx`, `src/app/api/checkout/route.ts`, `e2e/renonciation.spec.ts`.

**🚪 Porte 7** — case décochée = paiement impossible, prouvé par un test e2e.

---

## Étape 8 — Durcissement

- [ ] **T8.1 — Limitation de débit**
  - Acceptation : 5 requêtes/min/IP sur `/api/checkout`, 10 sur `/telecharger`. Réponse 429 avec `Retry-After`.
  - Vérifier : test Vitest ; 11 requêtes rapides → la 11ᵉ renvoie 429.
  - Fichiers : `src/lib/rate-limit.ts`, `tests/rate-limit.test.ts`.
  - ⚠️ Next 16 : `middleware.ts` est déprécié, le fichier s'appelle désormais `proxy.ts` et exporte une fonction `proxy`. Runtime Node uniquement, pas d'edge.

- [ ] **T8.2 — Test anti-fuite de secrets**
  - Acceptation : un test CI scanne le bundle client et échoue si une valeur de variable serveur y apparaît.
  - Vérifier : injecter volontairement une clé dans un composant client → la CI échoue.
  - Fichiers : `tests/securite/bundle.test.ts`, `.github/workflows/ci.yml`.

- [ ] **T8.3 — Scan de secrets au commit**
  - Acceptation : hook pre-commit gitleaks qui bloque un commit contenant une clé.
  - Vérifier : tenter de commiter une fausse clé Stripe → le commit est refusé.
  - Fichiers : `.husky/pre-commit`, `.gitleaks.toml`.

- [ ] **T8.4 — Audit CSP en production**
  - Acceptation : aucune violation console sur un déploiement de prévisualisation, Stripe et les polices fonctionnent.
  - Vérifier : securityheaders.com sur l'URL de preview → **note A minimum**.
  - Fichiers : `next.config.ts` si ajustement.

- [ ] **T8.5 — Audit d'accessibilité**
  - Acceptation : zéro violation axe critique sur toutes les pages, navigation clavier complète, focus visible, curseur réticule sans impact.
  - Vérifier : `npm run e2e -- a11y.spec.ts` ; parcours complet au clavier seul.
  - Fichiers : `e2e/a11y.spec.ts`.

- [ ] **T8.6 — Audit de dépendances**
  - Acceptation : `npm audit --audit-level=high` sans résultat, Dependabot activé.
  - Vérifier : `npm audit --audit-level=high`.
  - Fichiers : `.github/dependabot.yml`.

- [ ] **T8.7 — Parcours e2e complet**
  - Acceptation : accueil → pack → renonciation → checkout → paiement test → merci → email → téléchargement → 6ᵉ refus, en un seul scénario.
  - Vérifier : `npm run e2e` au vert.
  - Fichiers : `e2e/parcours-achat.spec.ts`.

- [ ] **T8.8 — Lighthouse CI**
  - Acceptation : seuils du spec appliqués en CI, une PR sous le seuil est bloquée.
  - Vérifier : le workflow échoue volontairement sur un seuil abaissé, puis passe.
  - Fichiers : `.github/workflows/lighthouse.yml`, `lighthouserc.json`.

**🚪 Porte 8** — securityheaders ≥ A, `npm audit` propre, zéro secret dans le bundle, zéro violation axe critique.

---

## Étape 9 — Mise en ligne

- [ ] **T9.1 — Domaine et DNS**
  - Acceptation : domaine acheté, pointé sur Vercel, TLS émis, HSTS actif, redirection www → apex.
  - Vérifier : SSL Labs → **note A minimum**.
  - Fichiers : aucun.
  - ⚠️ Achat à ta charge, après vérification de disponibilité.

- [ ] **T9.2 — Contenu réel des packs**
  - Acceptation : les 6 entrées fictives remplacées par les vrais packs, fichiers déposés dans le bucket, produits Stripe recréés en mode live.
  - Vérifier : chaque `fichierStorage` existe, chaque `stripePriceId` est valide.
  - Fichiers : `src/content/packs.ts`.
  - ⚠️ Nécessite tes vrais fichiers et prix.

- [ ] **T9.3 — Bascule Stripe en mode live**
  - Acceptation : clés live dans Vercel Production (test conservées en Preview), endpoint webhook live créé, secret de signature copié, Stripe Tax activé.
  - Vérifier : le tableau de bord Stripe montre l'endpoint live comme actif.
  - Fichiers : variables d'environnement Vercel.

- [ ] **T9.4 — Déploiement en production**
  - Acceptation : `main` déployé, toutes les variables renseignées, analytics sans cookie actif.
  - Vérifier : le site répond sur le domaine ; aucune erreur console.
  - Fichiers : aucun.

- [ ] **T9.5 — Achat réel de bout en bout**
  - Acceptation : un vrai achat avec une vraie carte aboutit à la réception du fichier. Remboursement effectué ensuite depuis Stripe.
  - Vérifier : l'email arrive en boîte principale, le fichier s'ouvre, la commande apparaît en base.
  - Fichiers : aucun.

- [ ] **T9.6 — Re-vérification d'étanchéité en production**
  - Acceptation : le bucket de production est inaccessible sans jeton.
  - Vérifier : `curl` sur l'URL publique du bucket live → 400 ou 403.
  - Fichiers : aucun.

**🚪 Porte 9** — achat réel complet réussi, fichier reçu, bucket étanche.

---

## Récapitulatif

| Étape            | Tâches | Charge   |
| ---------------- | ------ | -------- |
| 0. Préparation   | 2      | —        |
| 1. Socle         | 7      | 0,5 j    |
| 2. Atmosphère    | 11     | 1,5 j    |
| 3. Catalogue     | 7      | 1,5 j    |
| 4. Choréographie | 9      | 2 j      |
| 5. Checkout      | 5      | 0,5 j    |
| 6. Livraison     | 8      | 1 j      |
| 7. Légal         | 4      | 0,5 j    |
| 8. Durcissement  | 8      | 1 j      |
| 9. Mise en ligne | 6      | 0,5 j    |
| **Total**        | **67** | **~9 j** |

### Tâches nécessitant une action de ta part

T0.2 (comptes) · T6.7 (DNS email) · T7.1 (SIRET) · T9.1 (domaine) · T9.2 (contenu réel) · T9.5 (carte bancaire)

Tout le reste, je peux l'exécuter seul.
