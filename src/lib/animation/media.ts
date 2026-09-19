'use client'

import { useSyncExternalStore } from 'react'

/**
 * Lecture réactive d'une requête média, utilisable comme source externe React.
 *
 * Construit sur `useSyncExternalStore` plutôt que sur `useState` + `useEffect` :
 * appeler `setState` depuis un effet au montage déclenche un second rendu en
 * cascade, et React le signale à juste titre. Ici, React lit la valeur au bon
 * moment, gère l'abonnement et le rendu serveur lui-même.
 *
 * Toutes les sources partagent une règle : **en cas de doute, on répond la
 * valeur la plus prudente**. Côté serveur et quand `matchMedia` est
 * indisponible, on suppose que la fonctionnalité est absente plutôt que
 * présente. Une ambiance qui démarre une fraction de seconde trop tard ne
 * gêne personne ; une animation lancée chez quelqu'un qui ne la supporte pas,
 * si.
 */
export interface SourceMedia {
  sabonner: (auChangement: () => void) => () => void
  lire: () => boolean
  lireCoteServeur: () => boolean
}

export function creerSourceMedia(requete: string, valeurParDefaut: boolean): SourceMedia {
  function disponible(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  }

  return {
    sabonner(auChangement) {
      if (!disponible()) return () => {}
      const liste = window.matchMedia(requete)
      liste.addEventListener('change', auChangement)
      return () => liste.removeEventListener('change', auChangement)
    },
    lire() {
      if (!disponible()) return valeurParDefaut
      return window.matchMedia(requete).matches
    },
    lireCoteServeur() {
      return valeurParDefaut
    },
  }
}

export function useSourceMedia(source: SourceMedia): boolean {
  return useSyncExternalStore(source.sabonner, source.lire, source.lireCoteServeur)
}

/**
 * Pointeur précis et capable de survol : souris ou trackpad.
 *
 * Les deux conditions sont nécessaires. `pointer: fine` seul laisse passer un
 * stylet, qui n'a pas d'état de survol ; `hover: hover` seul laisse passer
 * certains appareils hybrides utilisés au doigt.
 */
export const POINTEUR_PRECIS = creerSourceMedia('(pointer: fine) and (hover: hover)', false)
