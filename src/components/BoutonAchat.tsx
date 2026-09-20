'use client'

import { useState } from 'react'
import { Etiquette } from '@/components/ui/Primitives'

/**
 * Le bouton d'achat.
 *
 * Il ne connaît qu'un slug, et c'est **tout ce qu'il envoie**. Ni prix, ni
 * devise, ni identifiant de produit : le serveur les lit dans le catalogue.
 * Voir l'en-tête de `app/api/checkout/route.ts` — la règle est écrite là, et
 * ce composant en est le seul appelant.
 *
 * ## Trois états, et le deuxième est celui qu'on oublie
 *
 * **Au repos**, le bouton propose. **Pendant la requête**, il est désactivé et
 * le dit : entre le clic et la redirection vers Stripe il s'écoule une seconde
 * ou deux, et un bouton qui ne répond pas pendant une seconde se clique une
 * deuxième fois. Deux sessions créées pour un seul achat, ce n'est pas grave
 * chez Stripe — mais l'hésitation, elle, se voit. **Après un échec**, il
 * redevient cliquable et affiche une phrase neutre : le message technique est
 * resté dans les journaux du serveur.
 *
 * L'état de chargement n'est jamais remis à faux en cas de succès, et c'est
 * volontaire : la page est en train de partir vers Stripe, et un bouton qui
 * redeviendrait actif pendant la redirection invite à cliquer encore.
 *
 * ## La mention obligatoire
 *
 * « Commande avec obligation de paiement » n'est pas une formule de style :
 * l'article L221-14 du Code de la consommation impose que le bouton qui
 * déclenche un paiement porte cette mention, ou une formule non ambiguë
 * équivalente. Un bouton « Valider » suffit à rendre la commande contestable.
 */

export function BoutonAchat({ slug, className = '' }: { slug: string; className?: string }) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function acheter() {
    setEnCours(true)
    setErreur(null)

    try {
      const reponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug }),
      })

      const donnees: unknown = await reponse.json().catch(() => null)
      const url =
        donnees && typeof donnees === 'object' && 'url' in donnees
          ? (donnees as { url?: unknown }).url
          : null

      if (!reponse.ok || typeof url !== 'string') {
        throw new Error('checkout indisponible')
      }

      // `location.assign` et non `router.push` : Stripe est un autre domaine,
      // le routeur de Next n'a rien à y faire.
      window.location.assign(url)
    } catch {
      setErreur('Le paiement n’a pas pu démarrer. Réessayez dans un instant — rien n’a été débité.')
      setEnCours(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={acheter}
        disabled={enCours}
        data-reticule="Acquérir"
        className="group relative isolate inline-flex w-full items-center justify-center overflow-hidden border border-bone px-8 py-4 font-mono text-xs tracking-[0.12em] text-bone uppercase transition-colors duration-[var(--duree-machine)] ease-[var(--courbe-machine)] before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:bg-bone before:transition-transform before:duration-[var(--duree-machine)] before:ease-[var(--courbe-machine)] hover:text-void hover:before:scale-x-100 focus-visible:text-void focus-visible:before:scale-x-100 disabled:cursor-wait disabled:border-steel-500 disabled:text-ash disabled:before:scale-x-0"
      >
        {enCours ? 'Redirection…' : 'Commander avec obligation de paiement'}
      </button>

      <Etiquette className="mt-3 block text-center">
        Paiement Stripe · Carte jamais vue par ce site
      </Etiquette>

      {/* `role="alert"` : l'échec doit être annoncé à qui n'a pas les yeux sur
          le bouton. Le message ne dit pas *pourquoi* — la cause est chez Stripe
          et la nommer n'aiderait personne — mais il dit ce qui compte : rien
          n'a été débité. */}
      {erreur ? (
        <p role="alert" className="mt-3 border-l-2 border-ember pl-3 text-sm text-bone">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
