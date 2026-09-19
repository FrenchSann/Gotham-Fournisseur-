'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
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
  const [replier, setReplier] = useState(false)

  // Référence stable : sans `useCallback`, chaque rendu du parent
  // redémarrerait la scène 3D.
  const surEchec = useCallback(() => setReplier(true), [])

  return (
    <>
      <GrilleTechnique />
      {mouvementReduit ? null : replier ? <FondAnime /> : <Fond3D surEchec={surEchec} />}
      {/* Le grain reste en 2D dans tous les cas : c'est un calque plein écran
          en mode overlay, que le GPU compose gratuitement, et il n'aurait rien
          à gagner à passer en WebGL. */}
      <FondAnime couches="grain" />
    </>
  )
}
