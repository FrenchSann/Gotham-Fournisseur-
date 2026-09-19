import { z } from 'zod'

/**
 * Validation des variables d'environnement au démarrage.
 *
 * Pourquoi au démarrage plutôt qu'au premier usage : une clé Stripe manquante
 * doit faire échouer le boot, pas le premier paiement d'un vrai client un
 * samedi soir. Mieux vaut un site qui refuse de démarrer qu'un site qui encaisse
 * sans livrer.
 *
 * Les variables serveur ne sont lues que côté serveur. Y toucher depuis un
 * composant client fait échouer le build — c'est voulu, c'est la barrière qui
 * empêche `SUPABASE_SERVICE_ROLE_KEY` de se retrouver dans le bundle.
 */

const schemaServeur = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  STRIPE_SECRET_KEY: z.string().min(1, 'Clé secrète Stripe manquante'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Secret de signature du webhook Stripe manquant'),

  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Clé service_role Supabase manquante'),

  RESEND_API_KEY: z.string().min(1, 'Clé API Resend manquante'),

  /** 32 octets aléatoires. Générer avec : openssl rand -base64 32 */
  DOWNLOAD_TOKEN_SECRET: z
    .string()
    .min(32, 'Le secret de signature doit faire au moins 32 caractères'),
})

const schemaClient = z.object({
  NEXT_PUBLIC_SITE_URL: z.url('URL du site invalide (exemple : https://arsenalnoir.com)'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'Clé publiable Stripe manquante'),
  NEXT_PUBLIC_SUPABASE_URL: z.url('URL Supabase invalide'),
})

/**
 * Les variables `NEXT_PUBLIC_*` doivent être référencées littéralement pour que
 * Next les remplace à la compilation. Un accès dynamique du type
 * `process.env[nom]` renverrait `undefined` dans le bundle client.
 */
const valeursClient = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
}

function echouer(erreur: z.ZodError, portee: string): never {
  const details = erreur.issues
    .map((probleme) => `  - ${probleme.path.join('.')} : ${probleme.message}`)
    .join('\n')

  throw new Error(
    `\nVariables d'environnement ${portee} invalides :\n${details}\n\n` +
      `Copie .env.example vers .env.local et renseigne les valeurs manquantes.\n`
  )
}

/** Variables publiques. Disponibles partout, client comme serveur. */
export const envClient = (() => {
  const resultat = schemaClient.safeParse(valeursClient)
  if (!resultat.success) echouer(resultat.error, 'publiques')
  return resultat.data
})()

/**
 * Variables secrètes. Accessibles uniquement côté serveur.
 *
 * L'évaluation est paresseuse : le module peut être importé par un fichier que
 * Next analyse pendant le build sans que les secrets soient présents (cas des
 * previews). La validation se déclenche au premier accès réel.
 */
let cacheServeur: z.infer<typeof schemaServeur> | null = null

export function env(): z.infer<typeof schemaServeur> {
  if (typeof window !== 'undefined') {
    throw new Error('env() est réservé au serveur. Utilise envClient côté navigateur.')
  }
  if (cacheServeur) return cacheServeur

  const resultat = schemaServeur.safeParse(process.env)
  if (!resultat.success) echouer(resultat.error, 'serveur')

  cacheServeur = resultat.data
  return cacheServeur
}
