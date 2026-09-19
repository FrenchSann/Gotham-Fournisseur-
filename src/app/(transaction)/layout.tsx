/**
 * Layout TRANSACTION — le monde sobre.
 *
 * Checkout, remerciement, téléchargement. Aucune couche d'atmosphère n'est
 * montée ici, et c'est une règle du spec, pas une préférence : on n'anime pas
 * un moment où le client doit avoir confiance. Fond statique, lecture directe,
 * rien qui bouge pendant qu'il vérifie un montant.
 *
 * Si tu es tenté d'ajouter une animation dans ce layout, relis SPEC.md § 13.
 */
export default function LayoutTransaction({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-col bg-void">
      <main id="contenu" className="flex-1">
        {children}
      </main>
    </div>
  )
}
