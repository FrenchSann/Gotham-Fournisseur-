const JETONS = [
  { nom: 'void', valeur: '#08090B', usage: 'Fond de page' },
  { nom: 'steel-900', valeur: '#101317', usage: 'Cartes, surfaces' },
  { nom: 'steel-700', valeur: '#1A1E24', usage: 'Surfaces surélevées' },
  { nom: 'steel-500', valeur: '#2A3038', usage: 'Bordures, filets' },
  { nom: 'ash', valeur: '#8A9099', usage: 'Texte secondaire' },
  { nom: 'bone', valeur: '#E6E4E0', usage: 'Texte principal' },
  { nom: 'ember', valeur: '#C1272D', usage: 'Accent unique' },
  { nom: 'brass', valeur: '#B8912F', usage: 'Accent secondaire' },
] as const

/**
 * Page de contrôle de l'étape 1.
 *
 * Elle ne fait qu'une chose : prouver que les jetons de design, les trois
 * polices et la grille sont en place. Elle sera remplacée par le vrai hero à
 * l'étape 3.
 */
export default function PageControle() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 lg:py-24">
      <p className="etiquette">Réf. AN-00 · Étape 01 · Socle</p>

      <h1 className="mt-6 text-[clamp(2.5rem,8vw,7rem)] font-black">
        Arsenal
        <br />
        Noir
      </h1>

      <div className="mt-6 h-px w-full bg-steel-500" />

      <p className="mt-6 text-ash">
        Approvisionnement stratégique. Dossiers de fournisseurs vérifiés, livraison immédiate.
      </p>

      <section className="mt-20">
        <p className="etiquette">01 — Palette</p>
        <div className="mt-6 grid grid-cols-2 gap-px bg-steel-500 sm:grid-cols-4">
          {JETONS.map((jeton) => (
            <div key={jeton.nom} className="bg-void p-4">
              <div
                className="h-20 w-full border border-steel-500"
                style={{ backgroundColor: jeton.valeur }}
              />
              <p className="etiquette mt-3">{jeton.nom}</p>
              <p className="etiquette text-[0.6875rem]">{jeton.valeur}</p>
              <p className="mt-1 text-sm text-ash">{jeton.usage}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <p className="etiquette">02 — Typographie</p>
        <div className="mt-6 space-y-8 border-t border-steel-500 pt-8">
          <div>
            <p className="etiquette">Barlow Condensed · titres</p>
            <p className="mt-2 font-titre text-6xl font-black uppercase">Manufacture</p>
          </div>
          <div>
            <p className="etiquette">IBM Plex Mono · étiquettes techniques</p>
            <p className="etiquette mt-2 text-base">RÉF. AN-04 · 112 USINES · MAJ 2026-09</p>
          </div>
          <div>
            <p className="etiquette">Inter · corps</p>
            <p className="mt-2">
              Chaque dossier recense des usines contactées et vérifiées une à une. Références,
              minimums de commande, délais et interlocuteurs directs.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-20">
        <p className="etiquette">03 — Registre machine (120-200 ms)</p>
        <div className="mt-6 flex flex-wrap gap-4 border-t border-steel-500 pt-8">
          <button
            type="button"
            className="border border-bone px-8 py-3 font-mono text-xs tracking-[0.12em] uppercase transition-colors duration-[160ms] ease-[cubic-bezier(.2,0,0,1)] hover:bg-bone hover:text-void"
          >
            Acquérir
          </button>
          <button
            type="button"
            className="border border-ember px-8 py-3 font-mono text-xs tracking-[0.12em] text-ember uppercase transition-colors duration-[160ms] ease-[cubic-bezier(.2,0,0,1)] hover:bg-ember hover:text-white"
          >
            Consulter
          </button>
        </div>
      </section>

      <p className="etiquette mt-24 border-t border-steel-500 pt-6">
        Fin de la page de contrôle · Le hero réel arrive à l&apos;étape 03
      </p>
    </div>
  )
}
