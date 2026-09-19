'use client'

import { useEffect, useRef, useState } from 'react'
import { creerBoucle } from '@/lib/animation/boucle'
import { FPS } from '@/lib/animation/motion-tokens'
import { detecterCapacites, type Capacites } from '@/lib/trois/capacites'
import { auTempsMort } from '@/lib/trois/differer'
import type { SceneFond } from '@/lib/trois/scene-fond'

/**
 * Le fond 3D.
 *
 * Rend `null` et prévient son parent dès qu'une condition manque, pour que le
 * fond 2D de l'étape 2 reprenne la main. Les conditions :
 *
 *   - WebGL2 réellement obtenu (testé en créant un contexte, pas en lisant
 *     une annonce du navigateur) ;
 *   - three.js chargé sans erreur ;
 *   - le contexte n'a pas été perdu depuis.
 *
 * Le dernier point n'est pas théorique : sur mobile, le système reprend la
 * mémoire vidéo d'un onglet en arrière-plan et l'événement `webglcontextlost`
 * arrive en pleine visite. Sans repli, l'utilisateur se retrouve devant un
 * rectangle noir à la place du fond.
 *
 * three.js est importé dynamiquement, jamais en haut du fichier : il ne doit
 * pas entrer dans le bundle initial ni retarder l'affichage du contenu.
 */

export function Fond3D({ surEchec }: { surEchec: () => void }) {
  const refCanvas = useRef<HTMLCanvasElement>(null)
  const [capacites] = useState<Capacites | null>(() =>
    typeof window === 'undefined' ? null : detecterCapacites()
  )

  useEffect(() => {
    if (!capacites || capacites.niveau === 'aucun') {
      surEchec()
      return
    }

    const canvas = refCanvas.current
    if (!canvas) return

    let scene: SceneFond | null = null
    let desabonner: (() => void) | null = null
    let annule = false

    function auPointeur(e: PointerEvent) {
      // Normalisé dans [-1, 1] : la scène n'a pas à connaître la taille de
      // l'écran pour incliner sa caméra.
      scene?.viserPointeur(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1
      )
    }

    function redimensionner() {
      scene?.redimensionner(window.innerWidth, window.innerHeight)
    }

    function auContextePerdu(e: Event) {
      e.preventDefault()
      surEchec()
    }

    canvas.addEventListener('webglcontextlost', auContextePerdu)

    // Import dynamique **et** différé à un temps mort : three.js n'est ni
    // téléchargé ni évalué tant que le navigateur a mieux à faire. Le coût de
    // démarrage de la scène ne tombe donc jamais pendant le chargement.
    const annulerAttente = auTempsMort(() => {
      import('@/lib/trois/scene-fond')
        .then(async ({ creerSceneFond }) => {
          if (annule || !refCanvas.current) return

          scene = creerSceneFond(refCanvas.current, capacites)
          if (!scene) {
            surEchec()
            return
          }

          redimensionner()

          // Compilation avant la première image, en parallèle quand le pilote
          // le permet. Sans cette attente, la première image déclenche la
          // compilation en synchrone au pire moment.
          await scene.preparer()
          if (annule) return

          // La 3D tourne à 60 fps, pas aux 30 du fond 2D : une caméra qui
          // dérive et une parallaxe au pointeur se voient saccader à 30,
          // contrairement à une nappe de brume.
          const boucle = creerBoucle(60)
          desabonner = boucle.abonner((_delta, temps) => scene?.rendre(temps))

          window.addEventListener('resize', redimensionner, { passive: true })
          window.addEventListener('pointermove', auPointeur, { passive: true })
        })
        .catch(() => {
          if (!annule) surEchec()
        })
    })

    return () => {
      annule = true
      annulerAttente()
      canvas.removeEventListener('webglcontextlost', auContextePerdu)
      window.removeEventListener('resize', redimensionner)
      window.removeEventListener('pointermove', auPointeur)
      desabonner?.()
      scene?.detruire()
    }
    // `surEchec` est stable côté parent ; le relister relancerait la scène.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacites])

  if (!capacites || capacites.niveau === 'aucun') return null

  return (
    <canvas
      ref={refCanvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 block h-full w-full"
    />
  )
}

/** Cadence du fond 2D, exportée pour que les deux fonds restent comparables. */
export const FPS_FOND_2D = FPS.fond
