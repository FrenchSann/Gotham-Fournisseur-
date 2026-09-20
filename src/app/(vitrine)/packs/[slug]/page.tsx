import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VoletTransition } from '@/components/atmosphere/VoletTransition'
import { BoutonAchat } from '@/components/BoutonAchat'
import { EmplacementCaisse, Vitrine3D } from '@/components/catalogue/Vitrine3D'
import { Choregraphie } from '@/components/motion/Choregraphie'
import { Caracteristique, Etiquette, Filet } from '@/components/ui/Primitives'
import { PACKS, trouverPack } from '@/content/packs'
import { formaterMois, formaterPrix } from '@/content/types'

/**
 * Les six fiches sont générées au build : aucune base de données n'est
 * interrogée à la visite, et la page part du CDN. C'est le principal levier
 * de performance du site, et la raison pour laquelle on a renoncé au nonce CSP
 * qui aurait imposé un rendu dynamique.
 */
export function generateStaticParams() {
  return PACKS.map((pack) => ({ slug: pack.slug }))
}

export async function generateMetadata({ params }: PageProps<'/packs/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const pack = trouverPack(slug)
  if (!pack) return { title: 'Dossier introuvable' }

  return {
    title: pack.nom,
    description: pack.accroche,
    alternates: { canonical: `/packs/${pack.slug}` },
    openGraph: { title: `${pack.nom} — ARSENAL NOIR`, description: pack.accroche },
  }
}

export default async function FichePack({ params }: PageProps<'/packs/[slug]'>) {
  const { slug } = await params
  const pack = trouverPack(slug)
  if (!pack) notFound()

  return (
    <VoletTransition>
      <Vitrine3D>
        <Choregraphie>
          <article className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8">
            <Etiquette accent>Réf. {pack.ref}</Etiquette>

            <div className="mt-6 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.9] font-black">
                  {pack.nom}
                </h1>
                <p data-revelation className="mt-6 text-lg text-ash">
                  {pack.accroche}
                </p>

                <Filet anime className="my-10" />

                {pack.description.map((paragraphe) => (
                  <p key={paragraphe.slice(0, 40)} className="mb-5 text-bone/85">
                    {paragraphe}
                  </p>
                ))}

                <h2 data-revelation className="mt-12 text-2xl font-bold">
                  Ce que contient le dossier
                </h2>
                <ul className="mt-5 space-y-3">
                  {pack.contenu.map((ligne) => (
                    <li key={ligne} className="flex gap-4 border-t border-steel-500 pt-3">
                      <span aria-hidden="true" className="mt-1 text-ember">
                        —
                      </span>
                      <span className="text-sm text-ash">{ligne}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <aside className="lg:sticky lg:top-8 lg:self-start">
                <div className="border border-steel-500 bg-steel-900/50 p-6">
                  <EmplacementCaisse teinte={pack.teinte} className="h-56 w-full" />

                  <p className="mt-4 font-titre text-5xl font-black">
                    {formaterPrix(pack.prixCentimes)}
                  </p>
                  <Etiquette className="mt-1 block">TTC · {pack.formatFichier}</Etiquette>

                  {/* La case de renonciation au droit de rétractation viendra
                      conditionner ce bouton à l'étape 7 : tant qu'elle n'est
                      pas cochée, aucune session ne doit pouvoir être créée. */}
                  <BoutonAchat slug={pack.slug} className="mt-6" />

                  <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4">
                    <Caracteristique label="Fournisseurs" valeur={pack.fournisseurs} />
                    <Caracteristique label="Pages" valeur={pack.pages} />
                    <Caracteristique label="Pays" valeur={pack.pays.length} />
                    <Caracteristique label="Mise à jour" valeur={formaterMois(pack.misAJour)} />
                  </div>

                  <p className="mt-6 border-t border-steel-500 pt-4 text-sm text-ash">
                    {pack.pays.join(' · ')}
                  </p>
                </div>
              </aside>
            </div>
          </article>
        </Choregraphie>
      </Vitrine3D>
    </VoletTransition>
  )
}
