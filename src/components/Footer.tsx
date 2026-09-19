import Link from 'next/link'
import { TOTAUX } from '@/content/packs'
import { Etiquette } from './ui/Primitives'

const LIENS_LEGAUX = [
  { href: '/legal/mentions', libelle: 'Mentions légales' },
  { href: '/legal/cgv', libelle: 'CGV' },
  { href: '/legal/confidentialite', libelle: 'Confidentialité' },
] as const

export function Footer() {
  return (
    <footer className="relative z-40 mt-32 border-t border-steel-500">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8">
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          <div>
            <p className="font-titre text-2xl font-black uppercase">Arsenal Noir</p>
            <Etiquette className="mt-2 block">
              {TOTAUX.fournisseurs} fournisseurs · {TOTAUX.pays} pays · {TOTAUX.packs} dossiers
            </Etiquette>
          </div>

          {/* Les liens légaux sont obligatoirement accessibles depuis toutes
              les pages : c'est une exigence du Code de la consommation, pas
              une convention de mise en page. Les pages arrivent à l'étape 7. */}
          <nav aria-label="Informations légales" className="flex flex-col gap-2">
            {LIENS_LEGAUX.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="etiquette transition-colors duration-[var(--duree-machine)] ease-[var(--courbe-machine)] hover:text-bone"
              >
                {lien.libelle}
              </Link>
            ))}
          </nav>
        </div>

        <p className="etiquette mt-12 border-t border-steel-500 pt-6">
          © {new Date().getFullYear()} Arsenal Noir — Les dossiers vendus sont des documents
          numériques. Aucune arme, aucun matériel réglementé n’est proposé.
        </p>
      </div>
    </footer>
  )
}
