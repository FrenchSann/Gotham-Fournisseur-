import type { Metadata } from 'next'
import Link from 'next/link'
import { Etiquette, Filet } from '@/components/ui/Primitives'

/**
 * Page de remerciement.
 *
 * ## Elle ne livre rien, et c'est le sujet
 *
 * Arriver ici veut seulement dire que Stripe a redirigé le navigateur. Ça ne
 * prouve pas qu'un paiement a réussi : l'URL est devinable, et un visiteur
 * peut l'ouvrir directement. **La livraison est déclenchée par le webhook
 * `checkout.session.completed` et par lui seul** (étape 6), parce que c'est le
 * seul message qui vienne de Stripe et qui soit signé.
 *
 * Cette page ne fait donc que trois choses : confirmer, dire quand l'email
 * arrive, et dire quoi faire s'il n'arrive pas.
 *
 * L'identifiant de session est affiché tel quel, **sans être vérifié auprès de
 * Stripe**. Il ne sert qu'à donner au client quelque chose à citer s'il écrit
 * au support. Aller le vérifier reviendrait à faire croire que cette page
 * atteste de quelque chose.
 *
 * Aucune animation : elle vit dans le groupe `(transaction)`, dont le layout ne
 * monte aucune couche d'ambiance. On n'anime pas l'écran où quelqu'un vient de
 * payer et attend son fichier.
 */

export const metadata: Metadata = {
  title: 'Commande enregistrée',
  description: 'Votre dossier arrive par email dans la minute.',
  // Une page de confirmation n'a aucune raison d'être indexée, et elle ne doit
  // surtout pas apparaître dans un moteur de recherche avec un identifiant de
  // session dans l'URL.
  robots: { index: false, follow: false },
}

export default async function Merci({ searchParams }: PageProps<'/merci'>) {
  const params = await searchParams
  const session = typeof params.session_id === 'string' ? params.session_id : null

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-20 sm:px-8">
      <Etiquette accent>Commande enregistrée</Etiquette>

      <h1 className="mt-6 text-[clamp(2rem,6vw,3.5rem)] leading-[0.95] font-black">
        Votre dossier
        <br />
        arrive par email
      </h1>

      <Filet className="my-8" />

      <p className="text-lg text-ash">
        Le lien de téléchargement part dans la minute qui suit la confirmation du paiement, à
        l’adresse que vous venez de saisir. Il reste valable{' '}
        <strong className="text-bone">72 heures</strong> et autorise{' '}
        <strong className="text-bone">5 téléchargements</strong>.
      </p>

      <div className="mt-8 border border-steel-500 bg-steel-900/50 p-6">
        <Etiquette>Si l’email n’arrive pas</Etiquette>
        <ul className="mt-4 space-y-2 text-sm text-ash">
          <li>— Vérifiez le dossier indésirables ou promotions.</li>
          <li>
            — Patientez cinq minutes : les serveurs de messagerie prennent parfois leur temps.
          </li>
          <li>
            — Écrivez à{' '}
            <a
              className="text-bone underline underline-offset-4"
              href="mailto:contact@arsenalnoir.fr"
            >
              contact@arsenalnoir.fr
            </a>{' '}
            en citant la référence ci-dessous.
          </li>
        </ul>

        {session ? (
          <p className="mt-5 border-t border-steel-500 pt-4 font-mono text-xs break-all text-ash">
            RÉF. TRANSACTION — {session}
          </p>
        ) : null}
      </div>

      <p className="mt-10 text-sm text-ash">
        <Link className="text-bone underline underline-offset-4" href="/">
          Retour au catalogue
        </Link>
      </p>
    </div>
  )
}
