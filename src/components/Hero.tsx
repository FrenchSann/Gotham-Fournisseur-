import { TOTAUX } from '@/content/packs'
import { BoutonLien, Etiquette } from './ui/Primitives'

/**
 * Hero.
 *
 * Le titre **est** l'image : capitales condensées à `clamp(2.5rem, 11vw, 9rem)`,
 * posées sur la fumée volumétrique. Aucune illustration à charger, donc rien
 * qui retarde le plus gros élément affiché.
 *
 * Tout est du texte rendu côté serveur. À l'étape 4, le titre recevra l'effet
 * de décodage — chaque caractère défilant en glyphes avant de se fixer — mais
 * il restera lisible sans JavaScript, parce que le masquage viendra du script
 * et jamais du CSS servi.
 */
export function Hero() {
  return (
    <section className="mx-auto flex min-h-[86vh] max-w-[1400px] flex-col justify-center px-4 py-20 sm:px-8">
      <Etiquette accent>Réf. AN — Dossiers de sourcing</Etiquette>

      <h1 className="mt-6 text-[clamp(2.5rem,11vw,9rem)] leading-[0.86] font-black">
        Arsenal
        <br />
        Noir
      </h1>

      <p className="mt-8 max-w-xl text-lg text-ash">
        Des dossiers de fournisseurs vérifiés un par un. Usines contactées, minimums réels,
        interlocuteurs directs. Vous payez, vous recevez le document par email dans la minute.
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
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
            {/* Ces chiffres s'incrémenteront à l'entrée dans le viewport à
                l'étape 4. Ils sont calculés depuis le catalogue, jamais
                saisis à la main : ils ne peuvent donc pas mentir. */}
            <dd className="font-titre text-4xl font-black">{stat.valeur}</dd>
            <dt className="etiquette mt-1">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
