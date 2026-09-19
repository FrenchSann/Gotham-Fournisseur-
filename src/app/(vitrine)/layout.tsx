import { Atmosphere } from '@/components/atmosphere/Atmosphere'
import { CurseurReticule } from '@/components/atmosphere/CurseurReticule'
import { DefilementLisse } from '@/components/atmosphere/DefilementLisse'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

/**
 * Layout VITRINE — le monde animé.
 *
 * Toutes les couches d'ambiance sont montées ici, une seule fois, et vivent
 * derrière le contenu de chaque page de la vitrine.
 *
 * La séparation d'avec `(transaction)` est structurelle et non
 * conventionnelle : elle rend impossible d'animer accidentellement une page de
 * paiement. On ne met pas de fumée volumétrique et de parallaxe sur l'écran où
 * le client entre sa carte.
 *
 * Chacune de ces couches décide seule de ne rien rendre quand l'utilisateur a
 * demandé moins de mouvement. Le repli n'est pas branché ici, il est dans les
 * composants — un seul endroit à vérifier par effet.
 */
export default function LayoutVitrine({ children }: LayoutProps<'/'>) {
  return (
    <div className="relative flex min-h-full flex-col">
      <Atmosphere />
      <DefilementLisse />
      <CurseurReticule />

      <Header />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
