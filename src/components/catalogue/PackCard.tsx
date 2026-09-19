'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { Etiquette } from '@/components/ui/Primitives'
import { formaterPrix, type Pack } from '@/content/types'
import { EmplacementCaisse, useVitrine3D } from './Vitrine3D'

/**
 * Carte de pack.
 *
 * Trois effets discrets au survol plutôt qu'un gros : un filet d'accent qui se
 * trace à gauche, la référence qui glisse de quelques pixels, et la caisse 3D
 * qui accélère et s'incline. Un seul effet spectaculaire ferait cheap ; trois
 * petits, simultanés, se lisent comme de la qualité de fabrication.
 *
 * La carte entière est un lien. Tout ce qui compte — référence, nom, prix,
 * nombre de fournisseurs — est du texte : la caisse 3D est un ornement et ne
 * porte aucune information qu'on perdrait sans elle.
 */
export function PackCard({ pack }: { pack: Pack }) {
  const refEmplacement = useRef<HTMLDivElement>(null)
  const { survoler } = useVitrine3D()

  return (
    <Link
      href={`/packs/${pack.slug}`}
      data-reticule="Consulter"
      onPointerEnter={() => survoler(refEmplacement.current)}
      onPointerLeave={() => survoler(null)}
      onFocus={() => survoler(refEmplacement.current)}
      onBlur={() => survoler(null)}
      className="group relative flex flex-col border border-steel-500 bg-steel-900/40 p-6 transition-colors duration-[var(--duree-machine)] ease-[var(--courbe-machine)] hover:bg-steel-900/80 focus-visible:bg-steel-900/80"
    >
      {/* Filet d'accent qui se trace de haut en bas. scaleY, pas height :
          animer une hauteur force un recalcul de mise en page par image. */}
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-px origin-top scale-y-0 transition-transform duration-[var(--duree-machine-long)] ease-[var(--courbe-machine)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
        style={{ backgroundColor: pack.teinte }}
      />

      <div className="flex items-baseline justify-between">
        <Etiquette className="inline-block transition-transform duration-[var(--duree-machine)] ease-[var(--courbe-machine)] group-hover:translate-x-1 group-focus-visible:translate-x-1">
          Réf. {pack.ref}
        </Etiquette>
        <Etiquette>{pack.formatFichier}</Etiquette>
      </div>

      <EmplacementCaisse ref={refEmplacement} teinte={pack.teinte} className="h-44 w-full" />

      <h3 className="mt-2 text-3xl font-bold">{pack.nom}</h3>
      <p className="mt-3 flex-1 text-sm text-ash">{pack.accroche}</p>

      <div className="mt-6 flex items-end justify-between border-t border-steel-500 pt-4">
        <div>
          <Etiquette>{pack.fournisseurs} fournisseurs</Etiquette>
          <p className="etiquette">{pack.pages} pages</p>
        </div>
        <p className="font-titre text-3xl font-black">{formaterPrix(pack.prixCentimes)}</p>
      </div>
    </Link>
  )
}
