import 'server-only'
import Stripe from 'stripe'
import { env } from './env'

/**
 * Le client Stripe, côté serveur et seulement là.
 *
 * `import 'server-only'` en première ligne : si un composant client importe ce
 * fichier, même indirectement, **le build échoue**. C'est une barrière de
 * compilation et non une convention, parce que la conséquence d'une erreur est
 * une clé secrète servie dans le bundle de tous les visiteurs.
 *
 * ## Version d'API épinglée
 *
 * Stripe fait évoluer son API et applique la version *du compte* aux appels qui
 * n'en précisent pas. Un changement de version décidé un jour dans le tableau
 * de bord modifierait alors la forme des réponses en production, sans aucun
 * déploiement de notre part et sans que rien ne le signale. En l'épinglant ici,
 * la montée de version devient un commit, avec les tests qui vont avec.
 *
 * ## Instance unique et paresseuse
 *
 * Paresseuse pour la même raison que `env()` : le module peut être importé
 * pendant un build où les secrets ne sont pas présents. Unique parce que le
 * client Stripe garde un agent HTTP et sa configuration de reprise sur échec —
 * en créer un par requête, c'est rouvrir une connexion à chaque paiement.
 */

/** Épinglée sur la version embarquée par le SDK installé. */
const VERSION_API = '2026-08-26.dahlia' as const

let instance: Stripe | null = null

export function stripe(): Stripe {
  instance ??= new Stripe(env().STRIPE_SECRET_KEY, {
    apiVersion: VERSION_API,
    // Deux tentatives supplémentaires en cas d'échec réseau. Stripe garantit
    // l'idempotence de ses reprises : une session ne sera pas créée deux fois.
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: 'Arsenal Noir', version: '0.1.0' },
  })
  return instance
}
