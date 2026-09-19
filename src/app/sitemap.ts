import type { MetadataRoute } from 'next'
import { PACKS } from '@/content/packs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    ...PACKS.map((pack) => ({
      url: `${BASE}/packs/${pack.slug}`,
      // La date vient du catalogue : elle ne peut pas se désynchroniser du
      // contenu réel comme le ferait une valeur saisie ici.
      lastModified: new Date(`${pack.misAJour}-01`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...['mentions', 'cgv', 'confidentialite'].map((page) => ({
      url: `${BASE}/legal/${page}`,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ]
}
