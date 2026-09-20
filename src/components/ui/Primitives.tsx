import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/**
 * Les primitives visuelles du site.
 *
 * Regroupées dans un seul fichier parce qu'elles sont minuscules et
 * indissociables : elles partagent la même grammaire — capitales, mono,
 * filets de 1 px, aucun coin arrondi — et les éclater en six fichiers
 * d'une douzaine de lignes ferait perdre de vue qu'elles forment un système.
 *
 * Toutes sont des composants serveur : aucune n'a d'état.
 */

/** Étiquette technique en mono. La signature « catalogue d'armurier ». */
export function Etiquette({
  children,
  className = '',
  accent = false,
}: {
  children: ReactNode
  className?: string
  accent?: boolean
}) {
  return <span className={`etiquette ${accent ? 'text-ember' : ''} ${className}`}>{children}</span>
}

/** Numéro de section, façon sommaire de catalogue : 01, 02, 03. */
export function NumeroSection({ n, titre }: { n: number; titre: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-4 pb-4">
        <Etiquette accent>{String(n).padStart(2, '0')}</Etiquette>
        <Etiquette>{titre}</Etiquette>
      </div>
      <Filet anime />
    </div>
  )
}

/**
 * Filet horizontal.
 *
 * Avec `anime`, il porte l'attribut que la choréographie retrouve au montage
 * pour le faire se tracer depuis la gauche — en `scaleX`, jamais en `width` :
 * animer une largeur force un recalcul de mise en page à chaque image, et il y
 * a des dizaines de filets sur la page.
 *
 * L'attribut plutôt qu'un composant client : le filet reste un composant
 * serveur, et c'est `Choregraphie` qui lui pose l'animation. Voir son en-tête
 * pour la raison.
 */
export function Filet({ className = '', anime = false }: { className?: string; anime?: boolean }) {
  return (
    <div
      data-filet={anime ? '' : undefined}
      className={`h-px w-full bg-steel-500 ${className}`}
      aria-hidden="true"
    />
  )
}

type VarianteBouton = 'principal' | 'secondaire'

const STYLE_BOUTON: Record<VarianteBouton, string> = {
  // Remplissage par volet depuis la gauche : le pseudo-élément s'étire en
  // scaleX, et le texte passe en négatif. Pas de fondu de couleur.
  principal: 'border-bone text-bone before:bg-bone hover:text-void focus-visible:text-void',
  secondaire:
    'border-steel-500 text-ash before:bg-steel-700 hover:text-bone focus-visible:text-bone',
}

const BASE_BOUTON =
  'group relative isolate inline-flex items-center justify-center overflow-hidden border ' +
  'px-8 py-4 font-mono text-xs tracking-[0.12em] uppercase transition-colors ' +
  'duration-[var(--duree-machine)] ease-[var(--courbe-machine)] ' +
  'before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 ' +
  'before:transition-transform before:duration-[var(--duree-machine)] ' +
  'before:ease-[var(--courbe-machine)] hover:before:scale-x-100 ' +
  'focus-visible:before:scale-x-100'

export function BoutonLien({
  href,
  variante = 'principal',
  reticule,
  children,
  className = '',
  ...reste
}: {
  href: string
  variante?: VarianteBouton
  /** Texte affiché dans le curseur réticule au survol. */
  reticule?: string
  children: ReactNode
  className?: string
} & Omit<ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link
      href={href}
      data-reticule={reticule}
      className={`${BASE_BOUTON} ${STYLE_BOUTON[variante]} ${className}`}
      {...reste}
    >
      {children}
    </Link>
  )
}

/** Paire étiquette / valeur, pour les fiches techniques. */
export function Caracteristique({ label, valeur }: { label: string; valeur: ReactNode }) {
  return (
    <div className="border-t border-steel-500 pt-3">
      <Etiquette>{label}</Etiquette>
      <p className="mt-1 font-titre text-2xl font-bold text-bone">{valeur}</p>
    </div>
  )
}
