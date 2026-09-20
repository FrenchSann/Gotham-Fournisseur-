import { ViewTransition } from 'react'
import type { ReactNode } from 'react'

/**
 * Transition de page : un volet se ferme sur le contenu qui part, puis se
 * rouvre sur celui qui arrive. Six cents millisecondes en tout.
 *
 * ## Pourquoi l'API du navigateur plutôt que GSAP
 *
 * Animer soi-même une transition de page demande de garder l'ancienne page
 * montée pendant que la nouvelle se prépare — donc de retarder la navigation,
 * de gérer le bouton Précédent, et de tenir deux arbres React en mémoire.
 * L'API View Transitions fait la seule chose qui rend tout cela inutile : elle
 * prend une **capture** de l'ancien écran et anime cette image pendant que le
 * nouveau se rend normalement. Aucun arbre en double, aucune navigation
 * retardée, et le bouton Précédent fonctionne sans qu'on s'en occupe.
 *
 * Le composant `<ViewTransition>` de React relie les deux : il marque le
 * sous-arbre à capturer et nomme ses animations, que le CSS retrouve sous
 * `::view-transition-old(.volet)` et `::view-transition-new(.volet)`.
 *
 * ## Ce qui est en retrait par rapport au spec
 *
 * Le spec prévoit que la **référence de la page suivante** s'affiche en mono au
 * centre pendant que le volet est fermé. Ce n'est pas fait, et c'est délibéré :
 * pendant la transition, il n'existe aucun élément vivant à l'écran — seulement
 * deux captures — et y faire apparaître un texte demanderait de monter un
 * calque hors de React, donc précisément le genre de machinerie que cette API
 * permet d'éviter. La référence reste affichée en haut de la fiche qui arrive,
 * et elle se découvre au moment où le volet se lève.
 *
 * ## Sans prise en charge
 *
 * Un navigateur sans View Transitions rend simplement la page, sans animation.
 * C'est le repli, et il n'y a rien à écrire pour l'obtenir.
 */
export function VoletTransition({ children }: { children: ReactNode }) {
  return (
    // `default="none"` : seules les transitions nommées ci-dessous animent
    // quelque chose. Sans lui, la moindre mise à jour déclenchant une
    // transition ferait rejouer le volet au milieu d'une page.
    <ViewTransition enter="volet" exit="volet" default="none">
      {children}
    </ViewTransition>
  )
}
