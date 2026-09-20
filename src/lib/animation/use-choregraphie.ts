'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { chargerGsap, type Moteur } from './gsap'
import { useMouvementReduit } from './use-reduced-motion'

/**
 * Le seul point d'entrée de la choréographie côté React.
 *
 * Tous les composants animés de l'étape 4 passent par ici, et aucun n'importe
 * GSAP directement. Ça tient en trois garanties, dont chacune aurait été
 * oubliée au moins une fois si elle avait dû être réécrite dans huit fichiers :
 *
 *   1. **Rien ne se monte en mouvement réduit.** Pas une animation figée sur sa
 *      valeur finale : pas d'animation du tout, et pas un octet de GSAP
 *      téléchargé.
 *   2. **Tout est révoqué au démontage.** `gsap.context` enregistre chaque
 *      animation et chaque ScrollTrigger créés dans sa portée ; `revert()` les
 *      détruit *et* remet le DOM dans l'état où il était. C'est ce qui évite
 *      qu'une navigation vers une fiche pack puis un retour laisse derrière
 *      elle une couche de ScrollTriggers morts qui continuent de recalculer
 *      leurs positions à chaque défilement.
 *   3. **Le contenu est masqué par le script, jamais par le CSS.** Le
 *      composant sert son contenu visible ; c'est la fonction de montage qui
 *      le masque, et seulement si elle s'exécute. Un échec de chargement de
 *      GSAP laisse donc une page complète, pas une page blanche.
 *
 * La fonction de montage doit être stable — définie hors du composant, ou
 * mémorisée. Une fonction recréée à chaque rendu relancerait toute la
 * choréographie à chaque rendu du parent.
 */
export function useChoregraphie<T extends HTMLElement = HTMLDivElement>(
  monter: (moteur: Moteur, racine: T) => void
): RefObject<T | null> {
  const ref = useRef<T>(null)
  const mouvementReduit = useMouvementReduit()

  useEffect(() => {
    const racine = ref.current
    if (mouvementReduit || !racine) return

    let contexte: ReturnType<Moteur['gsap']['context']> | null = null
    let annule = false

    chargerGsap().then((moteur) => {
      // `annule` couvre le cas où le composant est démonté pendant le
      // chargement : sans lui, on monterait une choréographie sur un élément
      // qui n'est plus dans le document, et elle ne serait jamais révoquée.
      if (annule || !moteur || !ref.current) return
      contexte = moteur.gsap.context(() => monter(moteur, ref.current as T), ref.current)
    })

    return () => {
      annule = true
      contexte?.revert()
    }
  }, [mouvementReduit, monter])

  return ref
}
