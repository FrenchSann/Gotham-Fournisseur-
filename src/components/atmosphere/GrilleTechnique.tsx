'use client'

import { useMouvementReduit } from '@/lib/animation/use-reduced-motion'

/**
 * Grille technique et ligne de balayage.
 *
 * Volontairement en CSS et non sur le canvas : une grille est un motif
 * répétitif et une translation, exactement ce que le compositeur du navigateur
 * sait faire en GPU sans réveiller le processeur. La dessiner au canvas
 * coûterait des images entières pour un résultat identique.
 *
 * La grille dérive de 80 px — un pas exactement — sur un cycle de 60 s. Comme
 * le motif se répète tous les 80 px, l'animation boucle sans aucun saut : à la
 * fin du cycle, l'image est rigoureusement identique au début.
 */
export function GrilleTechnique() {
  const mouvementReduit = useMouvementReduit()

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* La grille reste affichée en mouvement réduit : c'est un décor, pas
          une animation. Seule sa dérive est coupée. */}
      <div
        className="absolute inset-[-80px] opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-steel-500) 1px, transparent 1px),' +
            'linear-gradient(to bottom, var(--color-steel-500) 1px, transparent 1px)',
          backgroundSize: 'var(--pas-grille) var(--pas-grille)',
          animation: mouvementReduit
            ? undefined
            : 'derive-grille var(--cycle-grille) linear infinite',
        }}
      />

      {/* Estompe la grille sur les bords : sans ce masque, le quadrillage
          court jusqu'aux angles et le fond ressemble à du papier millimétré. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% 40%, transparent 30%, var(--color-void) 100%)',
        }}
      />

      {mouvementReduit ? null : (
        <div
          className="absolute inset-x-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(198,150,82,0.28) 30%, rgba(198,150,82,0.28) 70%, transparent)',
            animation: 'balayage var(--cycle-balayage) linear infinite',
          }}
        />
      )}
    </div>
  )
}
