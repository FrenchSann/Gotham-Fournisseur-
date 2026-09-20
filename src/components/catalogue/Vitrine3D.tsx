'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { creerBoucle } from '@/lib/animation/boucle'
import { useMouvementReduit } from '@/lib/animation/use-reduced-motion'
import { detecterCapacites } from '@/lib/trois/capacites'
import { auTempsMort } from '@/lib/animation/differer'
import type { Emplacement, SceneCatalogue } from '@/lib/trois/scene-catalogue'

/**
 * Le contexte des caisses 3D du catalogue.
 *
 * Les cartes ne savent rien de three.js : elles déclarent un emplacement — un
 * `<div>` vide et sa teinte — et signalent leur survol. Tout le rendu vit
 * dans un canvas unique monté ici (voir `scene-catalogue.ts` pour la raison,
 * qui est la limite du nombre de contextes WebGL par page).
 *
 * Quand la 3D ne peut pas tourner, `actif` passe à `false` et chaque carte
 * affiche son emblème de repli. Le catalogue reste complet et lisible : la 3D
 * est un ornement, jamais le porteur d'une information.
 */

interface ValeurContexte {
  actif: boolean
  enregistrer: (emplacement: Emplacement) => () => void
  survoler: (element: HTMLElement | null) => void
}

const Contexte = createContext<ValeurContexte>({
  actif: false,
  enregistrer: () => () => {},
  survoler: () => {},
})

export function useVitrine3D() {
  return useContext(Contexte)
}

export function Vitrine3D({ children }: { children: ReactNode }) {
  const refCanvas = useRef<HTMLCanvasElement>(null)
  const refScene = useRef<SceneCatalogue | null>(null)
  /** Emplacements déclarés avant que la scène ne soit prête. */
  const enAttente = useRef(new Map<Emplacement, (() => void) | null>())
  const [pret, setPret] = useState(false)
  const mouvementReduit = useMouvementReduit()

  const capacites = useMemo(() => (typeof window === 'undefined' ? null : detecterCapacites()), [])
  const possible = !mouvementReduit && capacites !== null && capacites.niveau !== 'aucun'

  useEffect(() => {
    if (!possible) return

    const canvas = refCanvas.current
    if (!canvas) return

    let annule = false
    let desabonner: (() => void) | null = null

    function redimensionner() {
      refScene.current?.redimensionner(window.innerWidth, window.innerHeight)
    }

    function auContextePerdu(e: Event) {
      e.preventDefault()
      setPret(false)
      refScene.current = null
    }

    canvas.addEventListener('webglcontextlost', auContextePerdu)

    // Même différé que le fond : la compilation des matériaux métalliques et
    // la génération de la carte de reflets attendent un temps mort.
    const annulerAttente = auTempsMort(() => {
      import('@/lib/trois/scene-catalogue')
        .then(async ({ creerSceneCatalogue }) => {
          if (annule || !refCanvas.current) return

          const scene = creerSceneCatalogue(refCanvas.current, capacites!.dprMax)
          if (!scene) return

          refScene.current = scene
          redimensionner()
          await scene.preparer()
          if (annule) return

          // Les cartes montées avant que three.js ne soit chargé sont
          // enregistrées maintenant : sans ce rattrapage, seules les cartes
          // apparues après le chargement auraient leur caisse.
          for (const [emplacement] of enAttente.current) {
            enAttente.current.set(emplacement, scene.ajouter(emplacement))
          }

          const boucle = creerBoucle(60)
          desabonner = boucle.abonner((_delta, temps) => scene.rendre(temps))

          window.addEventListener('resize', redimensionner, { passive: true })
          setPret(true)
        })
        .catch(() => {
          /* Pas de 3D : les cartes gardent leur emblème de repli. */
        })
    })

    return () => {
      annule = true
      annulerAttente()
      canvas.removeEventListener('webglcontextlost', auContextePerdu)
      window.removeEventListener('resize', redimensionner)
      desabonner?.()
      refScene.current?.detruire()
      refScene.current = null
    }
  }, [possible, capacites])

  const enregistrer = useCallback((emplacement: Emplacement) => {
    const scene = refScene.current
    if (scene) {
      const retirer = scene.ajouter(emplacement)
      return () => retirer()
    }
    // Scène pas encore prête : on mémorise, le rattrapage ci-dessus s'en
    // occupera.
    enAttente.current.set(emplacement, null)
    return () => {
      enAttente.current.get(emplacement)?.()
      enAttente.current.delete(emplacement)
    }
  }, [])

  const survoler = useCallback((element: HTMLElement | null) => {
    refScene.current?.survoler(element)
  }, [])

  const valeur = useMemo<ValeurContexte>(
    () => ({ actif: possible && pret, enregistrer, survoler }),
    [possible, pret, enregistrer, survoler]
  )

  return (
    <Contexte.Provider value={valeur}>
      {possible ? (
        <canvas
          ref={refCanvas}
          aria-hidden="true"
          // z-30 : au-dessus du fond et des cartes, sous le curseur réticule.
          // Les emplacements sont des zones vides, donc rien n'est masqué.
          className="pointer-events-none fixed inset-0 z-30 block h-full w-full"
        />
      ) : null}
      {children}
    </Contexte.Provider>
  )
}

/**
 * Emplacement réservé à une caisse dans une carte.
 *
 * Rend une zone vide que la scène 3D vient remplir. Quand la 3D est
 * indisponible, affiche un emblème géométrique construit en CSS — pas un
 * espace blanc, pas un texte d'excuse.
 */
export function EmplacementCaisse({
  teinte,
  ref: refExterne,
  className = '',
}: {
  teinte: string
  ref?: React.Ref<HTMLDivElement>
  className?: string
}) {
  const refInterne = useRef<HTMLDivElement>(null)
  const { actif, enregistrer } = useVitrine3D()

  useEffect(() => {
    const element = refInterne.current
    if (!element) return
    return enregistrer({ element, teinte })
  }, [enregistrer, teinte])

  return (
    <div
      ref={(noeud) => {
        refInterne.current = noeud
        if (typeof refExterne === 'function') refExterne(noeud)
        else if (refExterne) refExterne.current = noeud
      }}
      aria-hidden="true"
      className={`relative ${className}`}
    >
      {actif ? null : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-24 border-2" style={{ borderColor: teinte, opacity: 0.55 }} />
          <div
            className="absolute h-10 w-10 rotate-45 border"
            style={{ borderColor: teinte, opacity: 0.35 }}
          />
        </div>
      )}
    </div>
  )
}
