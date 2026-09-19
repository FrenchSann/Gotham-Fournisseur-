'use client'

import { useEffect, useRef } from 'react'
import { creerBoucle } from '@/lib/animation/boucle'
import { creerBrume } from '@/lib/animation/couches/brume'
import { creerGrain } from '@/lib/animation/couches/grain'
import { creerPoussiere } from '@/lib/animation/couches/poussiere'
import { creerProjecteur } from '@/lib/animation/couches/projecteur'
import type { Couche, Scene } from '@/lib/animation/couches/types'
import { SEUIL_MOBILE } from '@/lib/animation/motion-tokens'
import { useMouvementReduit } from '@/lib/animation/use-reduced-motion'

/**
 * Fond en canvas 2D.
 *
 * Deux rôles, choisis par `couches` :
 *
 *   - **`ambiance`** — brume, projecteur et poussière. C'est le repli quand la
 *     scène 3D ne peut pas tourner. Pas une version au rabais : c'est le site
 *     tel qu'il était à la porte 2, qui tenait déjà 60 fps.
 *   - **`grain`** — le grain de film seul, en calque `overlay`. Il est monté
 *     en permanence, par-dessus la 3D comme par-dessus le 2D, parce qu'il
 *     n'aurait rien à gagner à passer en WebGL et qu'il est ce qui empêche les
 *     aplats noirs de paraître plats.
 *
 * Le composant ne rend **rien du tout** en mouvement réduit : pas un canvas
 * figé, pas un élément caché. Rien dans le DOM, aucune boucle.
 */

/** Plafond de densité de pixels. Au-delà, on quadruple le coût de remplissage
 *  pour un flou et un bruit que personne ne verra plus net. */
const DPR_MAX = 1.5

export function FondAnime({ couches = 'ambiance' }: { couches?: 'ambiance' | 'grain' }) {
  const refCanvas = useRef<HTMLCanvasElement>(null)
  const mouvementReduit = useMouvementReduit()
  const estGrain = couches === 'grain'

  useEffect(() => {
    if (mouvementReduit) return

    const canvas = refCanvas.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const scene: Scene = { largeur: 0, hauteur: 0, sourisX: 0, sourisY: 0, allege: false }

    const listeCouches: Couche[] = estGrain
      ? [creerGrain()]
      : [creerBrume(), creerProjecteur(), creerPoussiere()]

    // Le grain reste en densité 1 : du bruit en haute définition, c'est du
    // bruit plus fin — donc moins visible — pour quatre fois le coût.
    const densiteCible = estGrain ? 1 : Math.min(window.devicePixelRatio || 1, DPR_MAX)

    function redimensionner() {
      scene.largeur = window.innerWidth
      scene.hauteur = window.innerHeight
      scene.allege = window.innerWidth < SEUIL_MOBILE

      canvas!.width = Math.round(scene.largeur * densiteCible)
      canvas!.height = Math.round(scene.hauteur * densiteCible)
      canvas!.style.width = `${scene.largeur}px`
      canvas!.style.height = `${scene.hauteur}px`
      // On raisonne partout en pixels CSS ; la mise à l'échelle est faite ici,
      // une fois, plutôt que dans chaque couche.
      ctx!.setTransform(densiteCible, 0, 0, densiteCible, 0, 0)

      for (const couche of listeCouches) couche.redimensionner(scene)
    }

    function auMouvementSouris(e: PointerEvent) {
      scene.sourisX = (e.clientX / scene.largeur) * 2 - 1
      scene.sourisY = (e.clientY / scene.hauteur) * 2 - 1
    }

    redimensionner()

    const boucle = creerBoucle()
    const desabonner = boucle.abonner((_delta, temps) => {
      // Le grain gère son propre effacement : il ne redessine qu'à 12 fps et
      // doit conserver son image entre deux.
      if (!estGrain) ctx.clearRect(0, 0, scene.largeur, scene.hauteur)
      for (const couche of listeCouches) couche.dessiner(ctx, temps, scene)
    })

    window.addEventListener('resize', redimensionner, { passive: true })
    if (!estGrain) window.addEventListener('pointermove', auMouvementSouris, { passive: true })

    return () => {
      window.removeEventListener('resize', redimensionner)
      window.removeEventListener('pointermove', auMouvementSouris)
      desabonner()
      boucle.detruire()
    }
  }, [mouvementReduit, estGrain])

  if (mouvementReduit) return null

  return (
    <canvas
      ref={refCanvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 block"
      style={estGrain ? { mixBlendMode: 'overlay', zIndex: -9 } : undefined}
    />
  )
}
