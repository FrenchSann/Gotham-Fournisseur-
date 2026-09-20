import { VoletTransition } from '@/components/atmosphere/VoletTransition'
import { PackCard } from '@/components/catalogue/PackCard'
import { Vitrine3D } from '@/components/catalogue/Vitrine3D'
import { Hero } from '@/components/Hero'
import { BandeauDefilant } from '@/components/motion/BandeauDefilant'
import { Choregraphie } from '@/components/motion/Choregraphie'
import { CatalogueEpingle } from '@/components/sections/CatalogueEpingle'
import { Etiquette, Filet, NumeroSection } from '@/components/ui/Primitives'
import { PACKS, TOTAUX } from '@/content/packs'

const ETAPES = [
  {
    titre: 'On contacte',
    texte:
      'Chaque usine du dossier a été contactée directement, sans passer par un intermédiaire. On obtient le minimum de commande réellement pratiqué, pas celui affiché sur la vitrine.',
  },
  {
    titre: 'On vérifie',
    texte:
      'Existence légale, numéro d’enregistrement, photographies d’atelier datées. Un négociant qui se présente en fabricant est écarté du dossier.',
  },
  {
    titre: 'On livre',
    texte:
      'Paiement par carte, puis un lien de téléchargement personnel dans votre boîte mail. Pas de compte à créer, pas d’abonnement, pas de relance commerciale.',
  },
] as const

const QUESTIONS = [
  {
    q: 'Que contient exactement un dossier ?',
    r: 'Des fiches fournisseur avec contact direct, minimum de commande constaté, délais observés et spécialités. Selon les dossiers s’ajoutent des grilles tarifaires, des modèles de prise de contact et des mémos réglementaires. Le détail figure sur chaque fiche produit.',
  },
  {
    q: 'Sous quel format, et en combien de temps ?',
    r: 'Un PDF, accompagné d’un tableur pour la plupart des dossiers. Le lien de téléchargement arrive par email dans la minute qui suit le paiement. Il reste valable 72 heures et autorise 5 téléchargements.',
  },
  {
    q: 'Les dossiers sont-ils mis à jour ?',
    r: 'Chaque dossier porte son mois de dernière mise à jour. Un fournisseur qui ferme ou cesse d’accepter les petites séries est retiré à la révision suivante.',
  },
  {
    q: 'Puis-je me faire rembourser ?',
    r: 'Il s’agit d’un contenu numérique livré immédiatement. Conformément à l’article L221-28 du Code de la consommation, vous renoncez à votre droit de rétractation en cochant la case prévue avant le paiement. Si le fichier reçu ne correspond pas à ce qui est décrit, écrivez-nous : on rembourse.',
  },
  {
    q: 'Vendez-vous des armes ?',
    r: 'Non. Arsenal Noir vend des annuaires de fournisseurs industriels : textile, cosmétique, métal, packaging. Le nom et l’esthétique du site relèvent du parti pris graphique, rien d’autre.',
  },
] as const

/**
 * Les mentions du bandeau défilant.
 *
 * Construites depuis le catalogue et non écrites à la main : le jour où un
 * dossier s'ajoute, le bandeau se met à jour tout seul. Un chiffre décoratif
 * qui contredit la page est pire que pas de chiffre du tout.
 */
const MENTIONS = [
  'Fournisseurs vérifiés',
  'Livraison immédiate',
  `${TOTAUX.fournisseurs} usines contactées`,
  `${TOTAUX.pays} pays couverts`,
  'Aucun intermédiaire',
  `Réf. AN-01 à AN-0${TOTAUX.packs}`,
] as const

export default function Accueil() {
  return (
    <VoletTransition>
      <Vitrine3D>
        <Choregraphie>
          <Hero />

          <CatalogueEpingle>
            {/* `w-full` explicite : la section épinglée est une colonne flex,
                et un enfant sans largeur s'y rétracte sur son contenu. Le titre
                et l'intro se retrouvaient alors centrés au milieu de l'écran au
                lieu d'être alignés sur la grille du site. */}
            <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
              <NumeroSection n={1} titre="Les dossiers" />
              <p data-revelation className="mt-8 max-w-2xl text-ash">
                Chaque dossier couvre une filière. Référence, nombre de fournisseurs et nombre de
                pages sont indiqués avant l’achat — il n’y a rien à découvrir après paiement.
              </p>
            </div>

            {/* Le rayonnage. En ligne à partir de 768 px, où il défile
              horizontalement pendant que la section est épinglée ; en grille
              verticale en dessous, où épingler confisquerait le seul geste de
              navigation dont dispose l'utilisateur. */}
            <div
              data-piste
              className="mt-12 grid gap-px bg-steel-500 sm:grid-cols-2 md:flex md:w-max md:grid-cols-none md:pl-4 xl:grid-cols-none 2xl:pl-8"
            >
              {PACKS.map((pack) => (
                <div key={pack.ref} className="md:w-[min(30rem,72vw)] md:shrink-0">
                  <PackCard pack={pack} />
                </div>
              ))}
            </div>
          </CatalogueEpingle>

          <BandeauDefilant mentions={MENTIONS} />

          <section id="methode" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-24 sm:px-8">
            <NumeroSection n={2} titre="La méthode" />
            {/* Plan médian : il descend à 0,6× la vitesse de la page. L'écart avec
              le plan du fond (0,2×) et avec le reste (1×) est ce qui donne le
              volume — pris isolément, aucun des trois ne se remarque. */}
            <div data-parallaxe="median" className="mt-12 grid gap-12 md:grid-cols-3">
              {ETAPES.map((etape, i) => (
                <div key={etape.titre} data-revelation>
                  <Etiquette accent>{String(i + 1).padStart(2, '0')}</Etiquette>
                  <h3 className="mt-3 text-3xl font-bold">{etape.titre}</h3>
                  <Filet anime className="my-4" />
                  <p className="text-sm text-ash">{etape.texte}</p>
                </div>
              ))}
            </div>
          </section>

          <section
            id="questions"
            className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-24 sm:px-8"
          >
            <NumeroSection n={3} titre="Questions" />
            <dl className="mt-12 max-w-3xl">
              {QUESTIONS.map((item) => (
                <div key={item.q} data-revelation className="py-6">
                  <dt className="font-titre text-2xl font-bold uppercase">{item.q}</dt>
                  <dd className="mt-3 text-sm text-ash">{item.r}</dd>
                  <Filet anime className="mt-6" />
                </div>
              ))}
            </dl>
          </section>
        </Choregraphie>
      </Vitrine3D>
    </VoletTransition>
  )
}
