/**
 * Layout VITRINE — le monde animé.
 *
 * C'est ici que viendront le canvas de fond, la grille technique, Lenis, le
 * curseur réticule et les transitions de page (étape 2 du plan).
 *
 * La séparation d'avec `(transaction)` est structurelle et non conventionnelle :
 * elle rend impossible d'animer accidentellement une page de paiement. On ne
 * met pas de brume et de parallaxe sur l'écran où le client entre sa carte.
 */
export default function LayoutVitrine({ children }: LayoutProps<'/'>) {
  return (
    <div className="relative flex min-h-full flex-col">
      {/* Étape 2 : <FondAnime /> et <GrilleTechnique /> s'insèrent ici, en -z-10. */}
      <main id="contenu" className="flex-1">
        {children}
      </main>
    </div>
  )
}
