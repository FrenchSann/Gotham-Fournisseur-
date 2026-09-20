'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import { ECRAN_LARGE, useSourceMedia } from '@/lib/animation/media'
import { useMouvementReduit } from '@/lib/animation/use-reduced-motion'
import { FondAnime } from './FondAnime'
import { GrilleTechnique } from './GrilleTechnique'

/**
 * Choisit le fond et le monte.
 *
 * Trois états possibles, dans cet ordre de préférence :
 *
 *   1. **Scène 3D** — WebGL2 disponible et mouvement autorisé.
 *   2. **Fond 2D** — pas de WebGL, three.js en échec, ou contexte perdu en
 *      cours de route. C'est le site tel qu'il était à la porte 2 : il tenait
 *      déjà 60 fps, ce n'est pas une page au rabais.
 *   3. **Rien** — mouvement réduit. Seules la grille et le contenu restent.
 *
 * Le repli est un aller simple : une fois basculé en 2D, on n'essaie pas de
 * revenir en 3D. Un contexte WebGL qui vient d'être perdu se reperdra, et une
 * page qui alterne entre deux fonds est pire que les deux.
 */

// `ssr: false` : une scène WebGL n'a rien à rendre côté serveur, et le code
// three.js n'a alors aucune raison d'être évalué pendant le build.
const Fond3D = dynamic(() => import('./Fond3D').then((m) => m.Fond3D), { ssr: false })

export function Atmosphere() {
  const mouvementReduit = useMouvementReduit()
  const ecranLarge = useSourceMedia(ECRAN_LARGE)
  const [replier, setReplier] = useState(false)
  const [grainDansLeShader, setGrainDansLeShader] = useState(false)

  // Références stables : sans `useCallback`, chaque rendu du parent
  // redémarrerait la scène 3D.
  const surEchec = useCallback(() => {
    setReplier(true)
    // Le repli 2D ne sait pas produire de grain dans son shader : le calque
    // doit revenir, sinon une perte de contexte WebGL emporterait le grain
    // avec elle sans que rien ne le signale.
    setGrainDansLeShader(false)
  }, [])
  const surActivation = useCallback(() => setGrainDansLeShader(true), [])

  return (
    <>
      <GrilleTechnique />
      {mouvementReduit ? null : replier ? (
        <FondAnime />
      ) : (
        <Fond3D surEchec={surEchec} surActivation={surActivation} />
      )}
      {/* Le grain est un calque 2D plein écran en `mix-blend-mode`, et c'est
          précisément ce qui le rend cher : le navigateur relit tout le cadre à
          chaque image pour le mélanger, et il le refait à chaque image où la
          page défile. Deux façons de ne pas le payer :

          — quand la scène 3D tourne, elle le produit dans sa passe
            d'étalonnage et le calque n'existe pas ;
          — sous 768 px, il n'est tout simplement pas monté. C'est le seul
            retrait du « mobile allégé » du spec qui n'était pas prévu, et il
            est mesuré : le calque coûtait une dizaine d'images par seconde au
            défilement sur un téléphone milieu de gamme, pour une texture de
            trois pour cent d'opacité qu'on ne distingue pas à bout de bras.

          Le fondre dans le canvas d'ambiance a été essayé, et c'est pire :
          `globalCompositeOperation` en canvas 2D est un mélange fait par le
          processeur à chaque image, quand `mix-blend-mode` est fait par le
          compositeur. La mesure donnait 23 images par seconde au lieu de 56. */}
      {mouvementReduit || grainDansLeShader || !ecranLarge ? null : <FondAnime couches="grain" />}
    </>
  )
}
