import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Un lien de téléchargement indexé serait un fichier payant accessible
      // par une recherche. Le jeton signé le protège déjà, mais il n'y a
      // aucune raison de laisser ces URL entrer dans un index.
      disallow: ['/telecharger/', '/merci', '/api/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
