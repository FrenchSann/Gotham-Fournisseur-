import Link from 'next/link'
import { Etiquette } from './ui/Primitives'

export function Header() {
  return (
    <header className="relative z-40 border-b border-steel-500">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-4 py-5 sm:px-8">
        <Link href="/" data-reticule="Accueil" className="flex items-baseline gap-3">
          <span className="font-titre text-xl font-black tracking-[0.06em] uppercase">
            Arsenal Noir
          </span>
          <Etiquette className="hidden sm:inline">Approvisionnement stratégique</Etiquette>
        </Link>

        <nav aria-label="Navigation principale">
          <Link
            href="/#catalogue"
            data-reticule="Catalogue"
            className="etiquette transition-colors duration-[var(--duree-machine)] ease-[var(--courbe-machine)] hover:text-bone"
          >
            Catalogue
          </Link>
        </nav>
      </div>
    </header>
  )
}
