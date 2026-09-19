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
 * Le fond permanent du site.
 *
 * Deux canvas, une seule boucle :
 *
 *   - **fond** : brume, projecteur et poussière, composés ensemble à 30 fps.
 *   - **grain** : calque séparé en `mix-blend-mode: overlay`, redessiné à
 *     12 fps seulement. Le séparer permet de le rafraîchir moins souvent que
 *     le reste sans rien recalculer — le navigateur compose les deux couches
 *     gratuitement, en GPU.
 *
 * Le composant ne rend **rien du tout** quand l'utilisateur a demandé moins de
 * mouvement : pas un canvas figé, pas un élément caché. Rien dans le DOM, rien
 * en mémoire, aucune boucle. C'est la version sobre du site, pas une version
 * dégradée.
 */

/** Plafond de densité de pixels. Au-delà, on quadruple le coût de remplissage
 *  pour un flou et un bruit que personne ne verra plus net. */
const DPR_MAX = 1.5

export function FondAnime() {
  const refFond = useRef<HTMLCanvasElement>(null)
  const refGrain = useRef<HTMLCanvasElement>(null)
  const mouvementReduit = useMouvementReduit()

  useEffect(() => {
    if (mouvementReduit) return

    const canvasFond = refFond.current
    const canvasGrain = refGrain.current
    if (!canvasFond || !canvasGrain) return

    const ctxFond = canvasFond.getContext('2d', { alpha: true })
    const ctxGrain = canvasGrain.getContext('2d', { alpha: true })
    if (!ctxFond || !ctxGrain) return

    const scene: Scene = {
      largeur: 0,
      hauteur: 0,
      sourisX: 0,
      sourisY: 0,
      allege: false,
    }

    const couchesFond: Couche[] = [creerBrume(), creerProjecteur(), creerPoussiere()]
    const grain = creerGrain()

    function preparerCanvas(
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      densite: number
    ) {
      canvas.width = Math.round(scene.largeur * densite)
      canvas.height = Math.round(scene.hauteur * densite)
      canvas.style.width = `${scene.largeur}px`
      canvas.style.height = `${scene.hauteur}px`
      // On raisonne partout en pixels CSS ; la mise à l'échelle est faite ici,
      // une fois, plutôt que dans chaque couche.
      ctx.setTransform(densite, 0, 0, densite, 0, 0)
    }

    function redimensionner() {
      scene.largeur = window.innerWidth
      scene.hauteur = window.innerHeight
      scene.allege = window.innerWidth < SEUIL_MOBILE

      const densite = Math.min(window.devicePixelRatio || 1, DPR_MAX)
      preparerCanvas(canvasFond!, ctxFond!, densite)
      // Le grain reste en densité 1 : du bruit en haute définition, c'est du
      // bruit plus fin — donc moins visible — pour quatre fois le coût.
      preparerCanvas(canvasGrain!, ctxGrain!, 1)

      for (const couche of couchesFond) couche.redimensionner(scene)
      grain.redimensionner(scene)
    }

    function auMouvementSouris(e: PointerEvent) {
      // Normalisé dans [-1, 1] : les couches n'ont pas à connaître la taille
      // de l'écran pour réagir.
      scene.sourisX = (e.clientX / scene.largeur) * 2 - 1
      scene.sourisY = (e.clientY / scene.hauteur) * 2 - 1
    }

    redimensionner()

    const boucle = creerBoucle()
    const desabonner = boucle.abonner((_delta, temps) => {
      ctxFond.clearRect(0, 0, scene.largeur, scene.hauteur)
      for (const couche of couchesFond) couche.dessiner(ctxFond, temps, scene)
      // Le grain s'auto-limite à 12 fps et sort immédiatement le reste du temps.
      grain.dessiner(ctxGrain, temps, scene)
    })

    window.addEventListener('resize', redimensionner, { passive: true })
    window.addEventListener('pointermove', auMouvementSouris, { passive: true })

    return () => {
      window.removeEventListener('resize', redimensionner)
      window.removeEventListener('pointermove', auMouvementSouris)
      desabonner()
      boucle.detruire()
    }
  }, [mouvementReduit])

  if (mouvementReduit) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={refFond} className="absolute inset-0 block" />
      <canvas
        ref={refGrain}
        className="absolute inset-0 block"
        style={{ mixBlendMode: 'overlay' }}
      />
    </div>
  )
}
