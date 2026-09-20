import { Compteur } from '@/components/motion/Compteur'
import { TexteDecode } from '@/components/motion/TexteDecode'
import { TOTAUX } from '@/content/packs'
import { BoutonLien, Etiquette } from './ui/Primitives'

/**
 * Hero.
 *
 * Le titre **est** l'image : capitales condensées à `clamp(2.5rem, 11vw, 9rem)`,
 * posées sur la fumée volumétrique. Aucune illustration à charger, donc rien
 * qui retarde le plus gros élément affiché.
 *
 * Tout est du texte rendu côté serveur. Le titre et les chiffres reçoivent leur
 * animation *après coup*, par des composants qui lisent le contenu déjà servi
 * pour connaître leur cible : sans JavaScript, on lit le titre et les vrais
 * chiffres. Le masquage vient du script, jamais du CSS servi.
 */
export function Hero() {
  return (
    <section className="mx-auto flex min-h-[86vh] max-w-[1400px] flex-col justify-center px-4 py-20 sm:px-8">
      <Etiquette accent>Réf. AN — Dossiers de sourcing</Etiquette>

      <TexteDecode
        as="h1"
        texte={'Arsenal\nNoir'}
        className="mt-6 block text-[clamp(2.5rem,11vw,9rem)] leading-[0.86] font-black"
      />

      <p data-revelation className="mt-8 max-w-xl text-lg text-ash">
        Des dossiers de fournisseurs vérifiés un par un. Usines contactées, minimums réels,
        interlocuteurs directs. Vous payez, vous recevez le document par email dans la minute.
      </p>

      <div data-revelation className="mt-10 flex flex-wrap gap-4">
        <BoutonLien href="/#catalogue" reticule="Catalogue">
          Voir les dossiers
        </BoutonLien>
        <BoutonLien href="/#methode" variante="secondaire" reticule="En savoir plus">
          Notre méthode
        </BoutonLien>
      </div>

      <dl className="mt-20 grid max-w-3xl grid-cols-2 gap-px border border-steel-500 bg-steel-500 sm:grid-cols-4">
        {[
          { label: 'Fournisseurs', valeur: TOTAUX.fournisseurs },
          { label: 'Pays couverts', valeur: TOTAUX.pays },
          { label: 'Pages', valeur: TOTAUX.pages },
          { label: 'Dossiers', valeur: TOTAUX.packs },
        ].map((stat) => (
          <div key={stat.label} className="bg-void px-4 py-5">
            {/* Ces chiffres sont calculés depuis le catalogue, jamais saisis
                à la main : ils ne peuvent donc pas mentir, et le compteur ne
                fait que courir jusqu'à une valeur déjà servie. */}
            <dd className="font-titre text-4xl font-black">
              <Compteur valeur={stat.valeur} />
            </dd>
            <dt className="etiquette mt-1">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
