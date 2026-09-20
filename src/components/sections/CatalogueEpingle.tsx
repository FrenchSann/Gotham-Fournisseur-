'use client'

import { useCallback, type ReactNode } from 'react'
import type { Moteur } from '@/lib/animation/gsap'
import { SEUIL_MOBILE } from '@/lib/animation/motion-tokens'
import { useChoregraphie } from '@/lib/animation/use-choregraphie'

/**
 * Le rayonnage : la section catalogue s'épingle et les dossiers défilent
 * horizontalement pendant que la page continue de descendre.
 *
 * C'est le moment fort de l'accueil, et la tâche la plus délicate du projet.
 * Trois pièges, tous rencontrés :
 *
 * **1. La distance ne peut pas être calculée une fois.** Elle dépend de la
 * largeur de la fenêtre et de la largeur réelle des cartes, laquelle dépend des
 * polices, qui arrivent après. D'où `invalidateOnRefresh` : ScrollTrigger
 * rappelle les fonctions `end` et les valeurs de l'animation à chaque
 * recalcul, au lieu de figer un nombre calculé trop tôt.
 *
 * **2. L'épinglage déplace l'élément dans un conteneur.** ScrollTrigger insère
 * un `pin-spacer` autour de la section et lui donne une hauteur fixe. Toute
 * marge extérieure de la section s'y retrouve piégée et produit un saut à
 * l'entrée. La section n'a donc aucune marge propre : l'espacement est porté
 * par du remplissage intérieur.
 *
 * **3. Sous 768 px, il n'y a pas de version réduite de l'effet.** Épingler sur
 * un téléphone confisque le geste de défilement, qui est le seul geste de
 * navigation dont l'utilisateur dispose. La grille redevient verticale, ce qui
 * n'est pas un repli mais l'autre bonne réponse : sur un écran étroit, une
 * grille verticale *est* le rayonnage.
 */

/**
 * Marge de fin, en fraction de la largeur de la fenêtre.
 *
 * Sans elle, la dernière carte s'arrête collée au bord droit et l'épinglage se
 * relâche dans la même image : on lit la fin du rayonnage et la section
 * suivante arrive en même temps. La marge donne le temps de finir de lire.
 */
const RESPIRATION = 0.12

export function CatalogueEpingle({ children }: { children: ReactNode }) {
  const monter = useCallback(({ gsap }: Moteur, racine: HTMLElement) => {
    const media = gsap.matchMedia()

    media.add(`(min-width: ${SEUIL_MOBILE}px)`, () => {
      const piste = racine.querySelector<HTMLElement>('[data-piste]')
      if (!piste) return

      const course = () => Math.max(0, piste.scrollWidth - window.innerWidth * (1 - RESPIRATION))

      gsap.to(piste, {
        x: () => -course(),
        ease: 'none',
        scrollTrigger: {
          trigger: racine,
          start: 'top top',
          // La page descend d'exactement la distance parcourue à
          // l'horizontale : un pixel de molette donne un pixel de rayonnage,
          // ce qui est le seul rapport qui ne paraisse pas arbitraire.
          end: () => `+=${course()}`,
          pin: true,
          // `anticipatePin` laisse ScrollTrigger épingler une image avant le
          // point exact. Sans lui, un défilement rapide fait apparaître un
          // sursaut d'une image au moment où l'élément passe en position fixe.
          anticipatePin: 1,
          // Un scrub légèrement amorti plutôt que `true` : le rayonnage suit le
          // défilement avec une fraction de seconde de retard, ce qui lui donne
          // du poids. C'est le même parti pris que l'inertie de Lenis.
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      })
    })

    return () => media.revert()
  }, [])

  const ref = useChoregraphie<HTMLElement>(monter)

  return (
    <section
      ref={ref}
      id="catalogue"
      // Aucune marge extérieure : elle serait piégée dans le `pin-spacer`.
      // Voir le piège n° 2 de l'en-tête.
      //
      // Hauteur d'écran et contenu centré à partir de 768 px : une section
      // épinglée occupe le cadre entier pendant tout le temps où on la
      // parcourt, et un rayonnage collé en haut d'un écran aux trois quarts
      // vide ne ressemble à rien. Sous 768 px, la section reprend une hauteur
      // libre — elle n'est pas épinglée, rien ne justifie de la forcer.
      className="scroll-mt-24 overflow-hidden py-24 md:flex md:min-h-screen md:flex-col md:justify-center"
    >
      {children}
    </section>
  )
}
