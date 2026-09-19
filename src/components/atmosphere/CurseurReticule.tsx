'use client'

import { useEffect, useRef, useState } from 'react'
import { POINTEUR_PRECIS, useSourceMedia } from '@/lib/animation/media'
import { useMouvementReduit } from '@/lib/animation/use-reduced-motion'

/**
 * Curseur réticule.
 *
 * Un viseur fin remplace la flèche du système et s'élargit au survol de ce qui
 * est cliquable, en affichant une étiquette contextuelle. C'est le détail qui
 * rattache l'interface au registre « instrument de visée » plutôt qu'à celui
 * du site marchand.
 *
 * Trois garde-fous, sans lesquels l'idée devient hostile :
 *
 *   - **Pointeur fin uniquement.** Sur tactile il n'y a pas de curseur à
 *     remplacer, et la position du doigt n'est pas celle du regard.
 *   - **Curseur natif conservé sur les champs de saisie.** Remplacer la barre
 *     de texte par un réticule empêche de voir où l'on écrit.
 *   - **Aucune dépendance au curseur pour comprendre la page.** L'étiquette
 *     répète une information déjà écrite dans le bouton ; elle ne la remplace
 *     pas. Un utilisateur au clavier ne perd rien.
 *
 * La position est écrite directement dans le style de l'élément plutôt que
 * dans un état React : à chaque mouvement de souris, un rendu React coûterait
 * un cycle complet de réconciliation pour déplacer un carré de 20 px.
 */

/** Attribut posé sur un élément pour changer le texte affiché dans le viseur. */
const ATTRIBUT_ETIQUETTE = 'data-reticule'

const SELECTEUR_CLIQUABLE = 'a, button, [role="button"], summary'
const SELECTEUR_SAISIE = 'input, textarea, select, [contenteditable="true"]'

export function CurseurReticule() {
  const refViseur = useRef<HTMLDivElement>(null)
  const [etiquette, setEtiquette] = useState<string | null>(null)
  const [survole, setSurvole] = useState(false)
  const mouvementReduit = useMouvementReduit()
  const pointeurPrecis = useSourceMedia(POINTEUR_PRECIS)

  // Lu par React au bon moment plutôt que posé depuis un effet : un
  // `setState` synchrone au montage déclencherait un rendu en cascade.
  const actif = !mouvementReduit && pointeurPrecis

  useEffect(() => {
    if (!actif) return

    function auMouvement(e: PointerEvent) {
      const viseur = refViseur.current
      if (!viseur) return
      // translate3d plutôt que top/left : pas de recalcul de mise en page.
      viseur.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`

      const cible = e.target as Element | null
      if (!cible?.closest) return

      if (cible.closest(SELECTEUR_SAISIE)) {
        setSurvole(false)
        setEtiquette(null)
        viseur.style.opacity = '0'
        return
      }

      viseur.style.opacity = '1'
      const cliquable = cible.closest(SELECTEUR_CLIQUABLE)
      setSurvole(cliquable !== null)
      setEtiquette(cliquable?.getAttribute(ATTRIBUT_ETIQUETTE) ?? null)
    }

    function auDepart() {
      if (refViseur.current) refViseur.current.style.opacity = '0'
    }

    window.addEventListener('pointermove', auMouvement, { passive: true })
    document.addEventListener('pointerleave', auDepart)

    return () => {
      window.removeEventListener('pointermove', auMouvement)
      document.removeEventListener('pointerleave', auDepart)
    }
  }, [actif])

  if (!actif) return null

  return (
    <>
      {/* Le curseur système ne disparaît que si le réticule a effectivement
          pris le relais — jamais avant, sinon un échec de script laisse
          l'utilisateur sans curseur du tout. */}
      <style>{`
        @media (pointer: fine) and (hover: hover) {
          body { cursor: none; }
          ${SELECTEUR_SAISIE} { cursor: auto; }
        }
      `}</style>

      <div
        ref={refViseur}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[90] opacity-0"
        style={{ transition: 'opacity var(--duree-machine) var(--courbe-machine)' }}
      >
        <div
          className="relative"
          style={{
            transform: 'translate(-50%, -50%)',
            transition:
              'width var(--duree-machine) var(--courbe-machine), height var(--duree-machine) var(--courbe-machine)',
            width: survole ? 34 : 20,
            height: survole ? 34 : 20,
          }}
        >
          {/* Quatre segments d'angle, laissant le centre libre pour voir ce
              qu'on vise. */}
          {(
            [
              'top-0 left-0 border-t border-l',
              'top-0 right-0 border-t border-r',
              'bottom-0 left-0 border-b border-l',
              'bottom-0 right-0 border-b border-r',
            ] as const
          ).map((position) => (
            <span
              key={position}
              className={`absolute h-2 w-2 ${position}`}
              style={{ borderColor: survole ? 'var(--color-ember)' : 'var(--color-bone)' }}
            />
          ))}
          <span
            className="absolute top-1/2 left-1/2 h-px w-px"
            style={{ backgroundColor: 'var(--color-ember)' }}
          />
        </div>

        {etiquette ? (
          <span
            className="etiquette absolute top-6 left-6 whitespace-nowrap"
            style={{ color: 'var(--color-ember)' }}
          >
            {etiquette}
          </span>
        ) : null}
      </div>
    </>
  )
}
