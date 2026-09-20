'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { definirLenis, estPiloteExterieurement } from '@/lib/animation/lenis'
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
 * Note d'architecture : Lenis tourne sur sa propre boucle tant qu'il est seul,
 * à la cadence de l'écran — contrairement au fond, le défilement a besoin de
 * 60 fps ou plus. Dès que GSAP se charge, il réclame le pilotage et fait
 * avancer Lenis depuis son propre ticker ; la boucle ci-dessous continue de
 * tourner mais cesse d'appeler `raf`. Deux boucles sur la page, jamais deux
 * positions de défilement différentes dans la même image.
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

    definirLenis(lenis)

    let idImage = requestAnimationFrame(function image(temps: number) {
      // Le test est refait à chaque image plutôt qu'une fois au montage :
      // GSAP peut arriver à n'importe quel moment, et il arrive toujours
      // après — c'est tout l'intérêt de son chargement différé.
      if (!estPiloteExterieurement()) lenis.raf(temps)
      idImage = requestAnimationFrame(image)
    })

    return () => {
      cancelAnimationFrame(idImage)
      definirLenis(null)
      lenis.destroy()
    }
  }, [mouvementReduit])

  return null
}
