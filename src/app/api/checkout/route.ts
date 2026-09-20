import { z } from 'zod'
import { trouverPack } from '@/content/packs'
import type { Pack } from '@/content/types'
import { envClient } from '@/lib/env'
import { stripe } from '@/lib/stripe'

/**
 * Création d'une session de paiement Stripe.
 *
 * ## La règle qui gouverne ce fichier
 *
 * **La requête ne transporte qu'un slug.** Pas de prix, pas de devise, pas de
 * quantité, pas de ligne d'article. Tout le reste est lu dans le catalogue,
 * côté serveur, et le schéma ci-dessous écarte silencieusement tout autre
 * champ. Un navigateur qui envoie `prixCentimes: 1` obtient très exactement le
 * même débit qu'un navigateur qui n'envoie rien : c'est le test central de
 * `tests/api/checkout.test.ts`, et il a été écrit avant cette route.
 *
 * C'est la seule protection qui compte ici. Une validation du genre « le prix
 * envoyé doit correspondre au catalogue » serait déjà une erreur de
 * conception : elle supposerait que le prix puisse venir d'ailleurs que du
 * catalogue.
 *
 * ## Ce que cette route ne fait pas
 *
 * Elle n'écrit rien, ne livre rien, n'envoie aucun email. Une session créée
 * n'est pas un paiement : le client peut fermer l'onglet, la carte peut être
 * refusée. **Seul le webhook `checkout.session.completed` fait foi**, et c'est
 * lui qui déclenchera la livraison à l'étape 6.
 */

/**
 * `strict()` refuserait la requête ; on préfère ignorer.
 *
 * Zod retire par défaut les champs qu'il ne connaît pas. Un client qui en
 * ajoute reçoit donc une session normale au prix normal, plutôt qu'une erreur
 * qui lui apprendrait quels noms de champs sont surveillés. Et un navigateur
 * qui ajoute un champ anodin ne casse pas son achat.
 */
const schemaRequete = z.object({
  slug: z.string().min(1).max(80),
})

/** Réponse d'erreur : un message pour l'humain, rien pour le curieux. */
function erreur(statut: number, message: string) {
  return Response.json({ erreur: message }, { status: statut })
}

/**
 * La ligne d'article, construite depuis le catalogue.
 *
 * Deux chemins, et le même montant dans les deux : un prix Stripe existant
 * quand il aura été créé (T5.1), un prix décrit à la volée sinon. Le second
 * permet de faire tourner tout le tunnel avant que les produits Stripe
 * n'existent, et il reste juste : `prixCentimes` est la source de vérité, et un
 * `stripePriceId` qui la contredirait serait un défaut de données — pas une
 * raison de facturer autre chose que le prix affiché.
 *
 * `tax_behavior: 'inclusive'` parce que le site affiche des prix TTC. Sans lui,
 * Stripe Tax ajouterait la TVA *au-dessus* du prix affiché, et le client
 * paierait plus cher que ce qu'il a lu — ce qui, en France, est illégal autant
 * que malhonnête.
 */
function ligneArticle(pack: Pack) {
  if (pack.stripePriceId) {
    return { price: pack.stripePriceId, quantity: 1 }
  }

  return {
    quantity: 1,
    price_data: {
      currency: 'eur',
      unit_amount: pack.prixCentimes,
      tax_behavior: 'inclusive' as const,
      product_data: {
        name: `${pack.ref} — ${pack.nom}`,
        description: pack.accroche,
        metadata: { ref: pack.ref, slug: pack.slug },
      },
    },
  }
}

export async function POST(requete: Request) {
  const corps = await requete.json().catch(() => null)
  const requeteValide = schemaRequete.safeParse(corps)
  if (!requeteValide.success) {
    return erreur(400, 'Requête invalide.')
  }

  const pack = trouverPack(requeteValide.data.slug)
  if (!pack) {
    return erreur(400, 'Dossier inconnu.')
  }

  const site = envClient.NEXT_PUBLIC_SITE_URL

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [ligneArticle(pack)],
      // `{CHECKOUT_SESSION_ID}` est remplacé par Stripe à la redirection. La
      // page de remerciement ne s'en sert **que** pour afficher une référence :
      // elle ne livre rien, et ne croit rien sur parole.
      success_url: `${site}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/packs/${pack.slug}`,
      // Lues par le webhook pour savoir quel dossier livrer.
      metadata: { slug: pack.slug, ref: pack.ref },
      // La TVA européenne est calculée par Stripe. À activer sur le compte
      // avant la mise en ligne (T9.3) : sans activation, la création de session
      // échoue explicitement, ce qui vaut mieux qu'une TVA silencieusement
      // fausse sur une vente réelle.
      automatic_tax: { enabled: true },
      locale: 'fr',
    })

    if (!session.url) {
      // Une session sans URL n'est pas exploitable. Sans ce garde-fou, le
      // bouton d'achat redirigerait le client vers « undefined ».
      console.error('[checkout] session créée sans URL', { session: session.id })
      return erreur(502, 'Le paiement est momentanément indisponible.')
    }

    return Response.json({ url: session.url })
  } catch (cause) {
    // Le message de Stripe nomme volontiers un compte ou une ressource. Il va
    // dans les journaux du serveur, jamais dans la réponse : un message
    // d'erreur est une information autant qu'une fuite.
    console.error('[checkout] Stripe a refusé la création de session', cause)
    return erreur(502, 'Le paiement est momentanément indisponible. Réessayez dans un instant.')
  }
}
