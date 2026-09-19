'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { LENIS_LERP } from '@/lib/animation/motion-tokens'
import { useMouvementReduit } from '@/lib/animation/use-reduced-motion'

/**
 * Défilement lissé.
 *
 * Sans inertie, toute la choréographie de l'étape 4 paraîtra saccadée : les
 * révélations, la parallaxe et la section épinglée se déclenchent sur la
 * position de défilement, et une position qui avance par sauts de molette
 * produit des animations qui avancent par sauts. Lenis interpole cette
 * position, et c'est ce qui rend le reste fluide.
 *
 * Note d'architecture : Lenis tourne ici sur sa propre boucle, à la cadence de
 * l'écran — contrairement au fond, le défilement a besoin de 60 fps ou plus.
 * À l'étape 4, GSAP arrivera avec son propre ticker et Lenis sera branché
 * dessus (`gsap.ticker.add`), ce qui ramènera le site à deux boucles au lieu
 * de trois.
 */
export function DefilementLisse() {
  const mouvementReduit = useMouvementReduit()

  useEffect(() => {
    // En mouvement réduit, on rend la main au défilement natif du navigateur :
    // c'est celui que l'utilisateur a réglé et auquel il s'attend.
    if (mouvementReduit) return

    const lenis = new Lenis({
      lerp: LENIS_LERP,
      // Le défilement tactile reste natif : sur mobile, intercepter le
      // défilement casse le geste attendu et le rebond du système.
      smoothWheel: true,
      syncTouch: false,
    })

    let idImage = requestAnimationFrame(function image(temps: number) {
      lenis.raf(temps)
      idImage = requestAnimationFrame(image)
    })

    return () => {
      cancelAnimationFrame(idImage)
      lenis.destroy()
    }
  }, [mouvementReduit])

  return null
}
