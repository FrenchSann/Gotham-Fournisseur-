import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, IBM_Plex_Mono, Inter } from 'next/font/google'
import './globals.css'

/**
 * Les trois polices du site.
 *
 * `next/font` les télécharge au build et les sert depuis notre domaine : aucune
 * requête vers Google au runtime. C'est à la fois une exigence RGPD (pas de
 * transfert d'IP vers un tiers sans consentement) et une exigence CSP
 * (`font-src 'self'` suffit, inutile d'ouvrir fonts.gstatic.com).
 */
const titre = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--police-titre',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--police-mono',
  display: 'swap',
})

const corps = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--police-corps',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ARSENAL NOIR — Approvisionnement stratégique',
    template: '%s — ARSENAL NOIR',
  },
  description:
    'Dossiers de fournisseurs vérifiés pour e-commerçants. Usines sourcées, contacts validés, livraison immédiate par email.',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'ARSENAL NOIR',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#08090b',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fr"
      className={`${titre.variable} ${mono.variable} ${corps.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#contenu" className="saut-contenu">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  )
}
