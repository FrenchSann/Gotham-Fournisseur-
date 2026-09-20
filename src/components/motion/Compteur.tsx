'use client'

import { useCallback } from 'react'
import type { Moteur } from '@/lib/animation/gsap'
import { useChoregraphie } from '@/lib/animation/use-choregraphie'

/**
 * Chiffre qui s'incrémente à l'entrée dans le champ.
 *
 * La valeur est rendue par le serveur et le composant ne fait que compter
 * jusqu'à elle. Elle vient toujours du catalogue, jamais d'une saisie : un
 * compteur qui affiche un chiffre inventé est un mensonge animé.
 */

/** Durée de l'incrémentation. Assez pour qu'on la voie, pas assez pour attendre. */
const DUREE = 1.4

export function Compteur({ valeur, className = '' }: { valeur: number; className?: string }) {
  const monter = useCallback(
    ({ gsap }: Moteur, racine: HTMLElement) => {
      const etat = { n: 0 }
      const formater = new Intl.NumberFormat('fr-FR')

      racine.textContent = '0'

      gsap.to(etat, {
        n: valeur,
        duration: DUREE,
        // `power2.out` : le compte ralentit en approchant de sa valeur, comme
        // un totalisateur mécanique. Linéaire, il s'arrête net et on doute du
        // chiffre affiché.
        ease: 'power2.out',
        onUpdate: () => {
          racine.textContent = formater.format(Math.round(etat.n))
        },
        onComplete: () => {
          racine.textContent = formater.format(valeur)
        },
        scrollTrigger: { trigger: racine, start: 'top 92%', once: true },
      })

      return () => {
        racine.textContent = formater.format(valeur)
      }
    },
    [valeur]
  )

  const ref = useChoregraphie<HTMLSpanElement>(monter)

  // `tabular-nums` : sans chiffres de largeur fixe, le bloc s'élargit et se
  // rétrécit pendant le comptage, et toute la ligne danse.
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {valeur}
    </span>
  )
}
