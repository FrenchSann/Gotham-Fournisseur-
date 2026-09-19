# Plan technique — ARSENAL NOIR

> Traduction de `SPEC.md` en plan d'exécution. Version 1.0 — 19 septembre 2026.
> Le découpage en tâches vérifiables vit dans `tasks/todo.md`.

---

## 1. Lecture du problème

Le site fait trois choses, et deux d'entre elles ne pardonnent pas l'à-peu-près :

1. **Encaisser** — sans jamais toucher une donnée bancaire, sans jamais faire confiance à un montant venu du navigateur.
2. **Livrer** — un fichier payant, à la bonne personne, une seule fois, sans intervention humaine, même si le client ferme son navigateur.
3. **Impressionner** — une atmosphère animée en continu qui doit rester à 50 fps sur un téléphone à 200 €.

Les points 1 et 2 sont un problème de rigueur : peu de code, mais chaque ligne compte. Le point 3 est un problème de budget : beaucoup de code, et c'est la perf qui arbitre.

**La tension centrale du projet** : l'ambition visuelle tire vers le lourd, le tunnel de paiement exige du léger et du rassurant. Le plan la résout en séparant physiquement les deux mondes — les pages d'atmosphère (accueil, fiches packs) et les pages de transaction (checkout, merci, téléchargement), qui ne partagent aucune couche animée.

---

## 2. Graphe de dépendances

```
                        ┌──────────────┐
                        │ 1. SOCLE     │  Next.js, TS, Tailwind, jetons, env
                        └──────┬───────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
         ┌───────────────┐          ┌────────────────┐
         │ 2. ATMOSPHÈRE │          │ 3. CATALOGUE   │
         │ canvas, Lenis │          │ packs.ts, pages│
         └───────┬───────┘          └───────┬────────┘
                 └─────────────┬────────────┘
                               ▼
                    ┌──────────────────┐
                    │ 4. CHORÉOGRAPHIE │  scroll, décodage, pin
                    └──────────────────┘
                               │
                               ▼  (indépendant de 2 et 4)
                    ┌──────────────────┐
                    │ 5. CHECKOUT      │  Stripe, /api/checkout
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ 6. LIVRAISON     │  BDD, webhook, jetons, mail
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ 7. LÉGAL         │  CGV, renonciation
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ 8. DURCISSEMENT  │  CSP, rate-limit, audits
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ 9. MISE EN LIGNE │
                    └──────────────────┘
```

**Ce qui peut avancer en parallèle** — les étapes 2 et 3 ne se touchent pas : le canvas de fond vit dans le layout, le catalogue dans les pages. Les étapes 5 et 6 ne dépendent d'aucune des couches visuelles ; si tu veux valider le business avant de peaufiner le rendu, on peut remonter 5 et 6 juste après 3.

**Ce qui est strictement séquentiel** — 4 a besoin de 2 (le moteur) et de 3 (le contenu). 6 a besoin de 5 (une session Stripe à écouter). 8 a besoin que tout existe pour être durci. 9 vient en dernier, par définition.

---

## 3. Décisions d'architecture prises dans ce plan

### 3.1 Deux mondes, deux layouts

`src/app/(vitrine)/layout.tsx` monte l'atmosphère (canvas, Lenis, curseur, transitions).
`src/app/(transaction)/layout.tsx` ne monte rien du tout.

Les route groups de Next.js permettent cette séparation sans changer les URLs. C'est plus propre qu'un `if (pathname.startsWith('/merci'))` disséminé dans dix composants, et ça garantit structurellement la règle « aucune animation sur le tunnel de paiement ».

### 3.2 Le contenu est visible par défaut

Toutes les révélations au scroll masquent le contenu **depuis JavaScript**, au montage. Le HTML servi a déjà `opacity: 1`.

Conséquence assumée : sur une connexion lente, un utilisateur peut voir brièvement le contenu avant qu'il ne soit masqué puis révélé. C'est un défaut mineur et rare. L'inverse — masquer en CSS et révéler en JS — produit une page blanche permanente si le script échoue. On accepte le petit défaut pour éliminer la panne totale.

### 3.3 Une seule boucle de rendu

Le canvas de fond, la grille et les particules partagent **un unique** `requestAnimationFrame`, piloté par un petit ordonnanceur dans `lib/animation/boucle.ts`. GSAP a la sienne, c'est inévitable et acceptable. Trois boucles concurrentes, non.

L'ordonnanceur porte aussi le throttling à 30 fps et la coupure sur `visibilitychange`. Un seul endroit à corriger si la perf dérape.

### 3.4 Le jeton porte sa propre expiration

Signature HMAC d'une charge utile contenant `expireLe`. Un lien périmé est rejeté sans aucun accès base. La base n'est consultée que pour le compteur de téléchargements — c'est le seul état qu'on ne peut pas mettre dans le jeton.

### 3.5 Idempotence par contrainte d'unicité, pas par logique applicative

`INSERT` d'abord, email ensuite. Un `stripe_session_id` déjà présent fait échouer l'insert, on renvoie 200 et on s'arrête. Aucun verrou, aucune condition de course possible, même si Stripe envoie trois fois le même événement en parallèle.

---

## 4. Risques et parades

| #   | Risque                                                                                                                          | Gravité  | Parade intégrée au plan                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **L'animation tue la performance mobile.** Le canvas + GSAP + Lenis font tomber sous 30 fps sur un téléphone d'entrée de gamme. | Élevée   | L'étape 2 se termine par une mesure au profileur, avant que la moindre choréographie n'existe. Si le fond seul ne tient pas 30 fps stables, on réduit _là_, pas trois semaines plus tard. Une porte de perf ferme chaque étape visuelle. |
| R2  | **Les emails partent en spam.** Sans SPF/DKIM/DMARC, rien n'est livré et le site est mort sans qu'on le sache.                  | Élevée   | Le DNS email est configuré à l'**étape 6**, pas à l'étape 9. Test obligatoire via mail-tester.com avec un score ≥ 9/10, plus une réception vérifiée chez Gmail et Outlook.                                                               |
| R3  | **Le bucket Supabase est public par erreur.** Tout le catalogue est téléchargeable gratuitement et on ne s'en aperçoit jamais.  | Critique | Tâche de vérification explicite : tenter un `curl` sur l'URL publique du bucket et **exiger un 400/403**. Rejouée à l'étape 8 et après la mise en production.                                                                            |
| R4  | **Pas de case de renonciation** → remboursements sous 14 jours après téléchargement.                                            | Élevée   | L'étape 7 bloque l'étape 9. Le bouton de paiement est désactivé tant que la case n'est pas cochée, et c'est un test e2e, pas une intention.                                                                                              |
| R5  | **OneDrive corrompt les builds** (verrous sur `node_modules`).                                                                  | Moyenne  | Première tâche du plan : déplacer le projet hors de OneDrive.                                                                                                                                                                            |
| R6  | **Contenu réel indisponible.** Les vrais packs, prix et visuels n'existent pas encore.                                          | Moyenne  | Développement sur données fictives réalistes dès l'étape 3. `packs.ts` est la seule source à remplacer — une tâche de 10 minutes le jour où le contenu arrive.                                                                           |
| R7  | **Le webhook ne peut pas être testé en local** sans la CLI Stripe.                                                              | Faible   | Installation de la CLI en tâche explicite à l'étape 5, avant d'en avoir besoin.                                                                                                                                                          |
| R8  | **La CSP casse Stripe ou les polices** en production alors que tout marchait en dev.                                            | Moyenne  | La CSP est posée à l'étape 1, pas à l'étape 8. On développe _avec_ la contrainte plutôt que de la découvrir à la fin.                                                                                                                    |
| R9  | **Le curseur réticule casse l'accessibilité** ou gêne sur les zones de saisie.                                                  | Faible   | Desktop + pointeur fin uniquement, curseur natif conservé sur tout élément de formulaire, audit axe à l'étape 8.                                                                                                                         |

---

## 5. Portes de vérification

Aucune étape n'est « terminée » sans franchir sa porte. Une porte échouée arrête la progression — on corrige avant d'avancer.

| Après            | Porte                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| 1. Socle         | `npm run verify` au vert, CSP active en dev sans erreur console                                               |
| 2. Atmosphère    | Fond à 30 fps stables sur mobile (profileur), tout s'éteint en reduced-motion, rien ne tourne en onglet caché |
| 3. Catalogue     | Contenu lisible JS désactivé, Lighthouse mobile ≥ 85, rendu correct de 375 px à 2560 px                       |
| 4. Choréographie | Défilement complet de l'accueil > 50 fps, JS ≤ 200 Ko gzip, reduced-motion toujours propre                    |
| 5. Checkout      | Paiement test abouti, montant falsifié rejeté                                                                 |
| 6. Livraison     | Email reçu < 60 s, lien fonctionnel, 6ᵉ téléchargement refusé, rejeu sans doublon, mail-tester ≥ 9/10         |
| 7. Légal         | Case décochée = paiement impossible (test e2e)                                                                |
| 8. Durcissement  | securityheaders.com ≥ A, `npm audit` propre, zéro secret dans le bundle, zéro violation axe critique          |
| 9. Mise en ligne | Achat réel de bout en bout avec une vraie carte                                                               |

---

## 6. Stratégie de livraison

**Une branche par étape**, préfixée par son numéro : `02-atmosphere`, `05-checkout`. Preview Vercel automatique sur chaque branche, merge sur `main` après la porte franchie.

**Commits atomiques** — un commit par tâche de `todo.md`, message en français à l'impératif (`ajoute le canvas de brume`, `verrouille le bucket packs`).

**TDD obligatoire** sur les étapes 5, 6 et 8 : jeton, webhook, prix, limitation de débit. Le test qui échoue s'écrit en premier. Sur les étapes visuelles, le test suit l'implémentation — on ne teste pas un rendu qu'on n'a pas encore vu.

---

## 7. Estimation

| Étape            | Charge       | Note                                                  |
| ---------------- | ------------ | ----------------------------------------------------- |
| 1. Socle         | 0,5 j        | Sans surprise                                         |
| 2. Atmosphère    | 1,5 j        | Le canvas est le morceau le plus technique du projet  |
| 3. Catalogue     | 1,5 j        | Dépend beaucoup de la qualité des visuels disponibles |
| 4. Choréographie | 2 j          | La section épinglée horizontale est le point délicat  |
| 5. Checkout      | 0,5 j        | Stripe Checkout fait le gros du travail               |
| 6. Livraison     | 1 j          | Dont une bonne partie en attente de propagation DNS   |
| 7. Légal         | 0,5 j        | Rédaction, peu de code                                |
| 8. Durcissement  | 1 j          |                                                       |
| 9. Mise en ligne | 0,5 j        |                                                       |
| **Total**        | **~9 jours** | Hors production du contenu réel des packs             |

L'animation représente environ 40 % de la charge. C'est le prix du parti pris visuel, et il est payé sciemment.

---

## 8. Ce qui est explicitement hors périmètre v1

Comptes clients, réachat, codes promo, packs en abonnement, interface d'administration, filigrane par acheteur, avis clients, blog, version anglaise, application mobile.

Chacun de ces éléments est une v1.1 possible. Aucun n'est nécessaire pour encaisser le premier euro, et chacun ajouté maintenant repousse ce premier euro.
