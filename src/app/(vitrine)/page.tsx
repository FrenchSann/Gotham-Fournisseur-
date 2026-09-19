import { PackCard } from '@/components/catalogue/PackCard'
import { Vitrine3D } from '@/components/catalogue/Vitrine3D'
import { Hero } from '@/components/Hero'
import { Etiquette, Filet, NumeroSection } from '@/components/ui/Primitives'
import { PACKS } from '@/content/packs'

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

export default function Accueil() {
  return (
    <Vitrine3D>
      <Hero />

      <section id="catalogue" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-24 sm:px-8">
        <NumeroSection n={1} titre="Les dossiers" />
        <p className="mt-8 max-w-2xl text-ash">
          Chaque dossier couvre une filière. Référence, nombre de fournisseurs et nombre de pages
          sont indiqués avant l’achat — il n’y a rien à découvrir après paiement.
        </p>

        {/* Cette grille sera épinglée et défilera horizontalement à
            l'étape 4. Elle reste une grille verticale sous 768 px et en
            mouvement réduit. */}
        <div className="mt-12 grid gap-px bg-steel-500 sm:grid-cols-2 xl:grid-cols-3">
          {PACKS.map((pack) => (
            <PackCard key={pack.ref} pack={pack} />
          ))}
        </div>
      </section>

      <section id="methode" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-24 sm:px-8">
        <NumeroSection n={2} titre="La méthode" />
        <div className="mt-12 grid gap-12 md:grid-cols-3">
          {ETAPES.map((etape, i) => (
            <div key={etape.titre}>
              <Etiquette accent>{String(i + 1).padStart(2, '0')}</Etiquette>
              <h3 className="mt-3 text-3xl font-bold">{etape.titre}</h3>
              <Filet className="my-4" />
              <p className="text-sm text-ash">{etape.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="questions" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-24 sm:px-8">
        <NumeroSection n={3} titre="Questions" />
        <dl className="mt-12 max-w-3xl">
          {QUESTIONS.map((item) => (
            <div key={item.q} className="border-b border-steel-500 py-6">
              <dt className="font-titre text-2xl font-bold uppercase">{item.q}</dt>
              <dd className="mt-3 text-sm text-ash">{item.r}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Vitrine3D>
  )
}
