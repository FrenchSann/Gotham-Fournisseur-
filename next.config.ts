import type { NextConfig } from 'next'

const estDev = process.env.NODE_ENV === 'development'

/**
 * Politique de sécurité du contenu.
 *
 * Posée dès l'étape 1 et non à la fin : une CSP ajoutée en dernier casse
 * toujours quelque chose (Stripe, les polices, le HMR) et on la découvre en
 * production. On développe avec la contrainte.
 *
 * Compromis assumé sur `script-src 'unsafe-inline'` : Next injecte des scripts
 * inline pour l'hydratation. Les supprimer imposerait un nonce par requête,
 * donc un middleware, donc le rendu dynamique de toutes les pages — on perdrait
 * la génération statique du catalogue, qui est notre principal levier de
 * performance. Le risque résiduel est faible ici : aucun contenu utilisateur
 * n'est affiché, `dangerouslySetInnerHTML` est interdit, et React échappe tout.
 * `object-src 'none'` et `base-uri 'self'` ferment les vecteurs restants.
 * À réexaminer à l'étape 8 (T8.4).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js.stripe.com${estDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://api.stripe.com https://*.supabase.co${estDev ? ' ws: http://localhost:*' : ''}`,
  'frame-src https://js.stripe.com https://hooks.stripe.com',
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const enTetesSecurite = [
  { key: 'Content-Security-Policy', value: csp },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Une trace d'exécution ne doit jamais atteindre le navigateur.
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: enTetesSecurite }]
  },
}

export default nextConfig
