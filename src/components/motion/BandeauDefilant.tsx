'use client'

import { useCallback } from 'react'
import type { Moteur } from '@/lib/animation/gsap'
import { useChoregraphie } from '@/lib/animation/use-choregraphie'

/**
 * Bandeau défilant entre les sections.
 *
 * Deux copies identiques de la même suite de mentions glissent vers la gauche
 * sur la moitié de leur largeur, en boucle. Comme la seconde copie occupe
 * exactement la place que la première vient de quitter, le raccord est
 * invisible et il n'y a rien à recalculer : **une seule animation, jouée en
 * boucle, sans aucun code par image.**
 *
 * La vitesse suit le défilement : plus vite quand on descend, à l'envers quand
 * on remonte. C'est le détail qui rattache le bandeau à la page au lieu d'en
 * faire une décoration posée dessus.
 */

/** Durée d'un tour complet au repos, en secondes. */
const DUREE = 26

/** Facteur appliqué à la vitesse de défilement. Calibré à la main. */
const SENSIBILITE = 0.0016

/** Vitesse maximale, en multiples de la vitesse de repos. */
const PLAFOND = 5

export function BandeauDefilant({ mentions }: { mentions: readonly string[] }) {
  const monter = useCallback(({ gsap, ScrollTrigger }: Moteur, racine: HTMLElement) => {
    const piste = racine.firstElementChild
    if (!piste) return

    const boucle = gsap.to(piste, {
      xPercent: -50,
      duration: DUREE,
      ease: 'none',
      repeat: -1,
    })

    // Le bandeau est arrêté tant qu'il n'est pas à l'écran.
    //
    // Sans cette ligne, une animation en boucle infinie tourne en permanence,
    // y compris quand le visiteur lit le hero et que le bandeau est à deux
    // écrans plus bas. Sur un profil mobile bridé, c'était la source de tâches
    // longues *au repos* : le site travaillait pour montrer quelque chose que
    // personne ne regardait.
    boucle.pause()

    // `quickTo` et non un `gsap.to` par mise à jour. Le second crée une
    // animation à chaque événement de défilement — plusieurs dizaines par
    // seconde, chacune allouée puis jetée. `quickTo` prépare l'animation une
    // fois et se contente ensuite de lui donner une nouvelle cible.
    const viser = gsap.quickTo(boucle, 'timeScale', { duration: 0.4 })

    const declencheur = ScrollTrigger.create({
      trigger: racine,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? boucle.play() : boucle.pause()),
      onUpdate: (self) => {
        // `getVelocity` rend des pixels par seconde, signés. On borne : un
        // défilement brusque à la molette dépasse facilement 4000 px/s, et
        // sans plafond le bandeau devient une barre grise illisible.
        const vitesse = self.getVelocity() * SENSIBILITE
        const cible = gsap.utils.clamp(-PLAFOND, PLAFOND, vitesse)

        // On ne fixe pas la vitesse, on la vise : la remise à 1 se fait en
        // douceur quand le défilement s'arrête, sinon le bandeau pile.
        viser(cible >= 0 ? 1 + cible : cible)
      },
    })

    return () => {
      declencheur.kill()
      boucle.kill()
    }
  }, [])

  const ref = useChoregraphie<HTMLDivElement>(monter)

  return (
    <div ref={ref} aria-hidden="true" className="overflow-hidden border-y border-steel-500 py-4">
      <div className="flex w-max">
        {/* Deux copies, et la seconde est cachée aux technologies d'assistance
            comme le bandeau entier : c'est un ornement, il ne porte aucune
            information qui ne soit ailleurs dans la page. */}
        {[0, 1].map((copie) => (
          <div key={copie} className="flex shrink-0">
            {mentions.map((mention) => (
              <span key={mention} className="etiquette px-8">
                {mention}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
