'use client'

import { useCallback, type ElementType } from 'react'
import { brouiller } from '@/lib/animation/decodage'
import type { Moteur } from '@/lib/animation/gsap'
import { useChoregraphie } from '@/lib/animation/use-choregraphie'

/**
 * Texte à décodage.
 *
 * Le texte final est dans le HTML servi, et c'est lui que le composant lit au
 * montage pour connaître sa cible. Le brouillage vient donc **après** le
 * contenu, jamais à sa place : sans JavaScript, on lit le titre ; avec, on le
 * voit se déchiffrer. La logique elle-même vit dans `lib/animation/decodage.ts`
 * et se teste sans navigateur.
 *
 * Les retours à la ligne sont préservés par `whitespace-pre-line` plutôt que
 * par un `<br>` : le composant remplace le contenu textuel du nœud, et un
 * élément enfant serait effacé au premier brouillage.
 */

/** Durée du décodage complet, cascade comprise. */
const DUREE = 1.1

export function TexteDecode({
  texte,
  as: Balise = 'span',
  className = '',
  delai = 0,
}: {
  texte: string
  as?: ElementType
  className?: string
  /** Retard au démarrage, en secondes. Sert à échelonner plusieurs textes. */
  delai?: number
}) {
  const monter = useCallback(
    ({ gsap }: Moteur, racine: HTMLElement) => {
      const final = racine.textContent ?? ''
      const etat = { avancement: 0 }

      // Masquage immédiat, avant même que l'animation ne démarre : sans cette
      // ligne, un texte en attente de son retard resterait lisible puis
      // sauterait brusquement en glyphes.
      racine.textContent = brouiller(final, 0)

      gsap.to(etat, {
        avancement: 1,
        duration: DUREE,
        delay: delai,
        // `none` et pas une courbe : la cascade porte déjà le rythme, et une
        // accélération par-dessus donne un effet mou au début et précipité à
        // la fin.
        ease: 'none',
        onUpdate: () => {
          racine.textContent = brouiller(final, etat.avancement)
        },
        onComplete: () => {
          racine.textContent = final
        },
        scrollTrigger: { trigger: racine, start: 'top 90%', once: true },
      })

      // Rendu au contexte GSAP, qui l'appellera à la révocation. C'est ce qui
      // garantit qu'un démontage en plein décodage laisse le texte lisible et
      // non une ligne de glyphes figée.
      return () => {
        racine.textContent = final
      }
    },
    [delai]
  )

  const ref = useChoregraphie<HTMLElement>(monter)

  return (
    <Balise ref={ref} className={`whitespace-pre-line ${className}`}>
      {texte}
    </Balise>
  )
}
