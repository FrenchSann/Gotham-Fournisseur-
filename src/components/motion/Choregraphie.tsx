'use client'

import type { ReactNode } from 'react'
import { ATMOSPHERE, SEUIL_MOBILE } from '@/lib/animation/motion-tokens'
import { useChoregraphie } from '@/lib/animation/use-choregraphie'
import type { Moteur } from '@/lib/animation/gsap'

/**
 * La choréographie au défilement, pour toute une page.
 *
 * ## Pourquoi un seul composant plutôt qu'un composant par effet
 *
 * L'approche évidente — un `<RevelationVolet>` autour de chaque bloc, un
 * `<Parallaxe>` autour de chaque plan — a un défaut qui ne se voit qu'une fois
 * écrite : **elle force chaque élément animé à devenir un composant client.**
 * Or les sections de ce site sont des composants serveur, et elles n'ont
 * aucune raison de cesser de l'être pour recevoir un effet de défilement. Les
 * convertir ferait descendre leur balisage dans le bundle JavaScript pour le
 * seul bénéfice d'un volet qui se lève.
 *
 * Ici, les sections restent du serveur et se contentent de **porter un
 * attribut** — `data-revelation`, `data-filet`, `data-parallaxe`. Ce composant
 * les retrouve au montage et leur pose l'animation. Le balisage ne quitte pas
 * le serveur, et toute la choréographie de la page tient dans un seul contexte
 * GSAP, donc dans un seul nettoyage.
 *
 * ## Le contenu est masqué ici, jamais dans le CSS
 *
 * Chaque effet commence par cacher ce qu'il va révéler, et il le fait depuis ce
 * fichier, au montage. Le HTML servi, lui, est entièrement visible. Si le
 * JavaScript ne s'exécute jamais — réseau coupé, erreur de script, navigateur
 * ancien — la page reste complète et lisible. L'inverse (masquer en CSS,
 * révéler en JS) donne une page blanche le jour où le script échoue, et ce
 * jour-là arrive.
 */

/** Course de la parallaxe au plan le plus lointain, en pixels. */
const COURSE_PARALLAXE = 150

/** Vitesse relative de chaque plan. 1 = solidaire de la page. */
const PLANS: Record<string, number> = {
  fond: 0.2,
  median: 0.6,
}

function monterChoregraphie({ gsap, ScrollTrigger }: Moteur, racine: HTMLElement) {
  const media = gsap.matchMedia()

  // --- Révélations et filets, en lots --------------------------------------
  //
  // `ScrollTrigger.batch` et non un déclencheur par élément. La différence est
  // une décision de performance, et elle est mesurée :
  //
  // Un ScrollTrigger classique connaît sa position dans la page et la compare à
  // la position de défilement **à chaque image**. Trente blocs révélés et une
  // vingtaine de filets font une cinquantaine de comparaisons par image, plus
  // une cinquantaine de positions à recalculer à chaque redimensionnement et à
  // chaque changement de hauteur de la page.
  //
  // `batch` s'appuie sur un `IntersectionObserver` : le navigateur prévient
  // lui-même, hors du thread principal, quand un élément entre dans le champ.
  // Deux observateurs remplacent cinquante déclencheurs, et le coût par image
  // tombe à zéro.
  //
  // Le compromis : `batch` ne sait pas faire de `scrub`. Il ne convient donc
  // qu'aux effets qui se jouent une fois — ce que sont, par construction, une
  // révélation et un filet qui se trace.

  const blocs = racine.querySelectorAll<HTMLElement>('[data-revelation]')
  if (blocs.length > 0) {
    /**
     * Deux révélations pour un même effet, et c'est une question de coût.
     *
     * **Le volet** (`clip-path`) est celui que demande le spec, et c'est le
     * bon : il découvre le bloc au lieu de le faire apparaître. Mais un
     * `clip-path` animé n'est pas composé, il est **repeint** — à chaque image,
     * sur toute la surface du bloc. Sur un écran large et un processeur
     * ordinaire, personne ne le voit. Sur un téléphone d'entrée de gamme, une
     * douzaine de blocs qui se révèlent pendant un défilement rapide bloquaient
     * le thread principal plus d'une seconde sur quatre, et la page tombait à
     * 23 images par seconde.
     *
     * **Le fondu-glissé** (`opacity` + `y`) dit la même chose en deux
     * propriétés que le compositeur sait animer sans repeindre quoi que ce
     * soit. Il est moins beau ; il est le seul tenable sur ces appareils. Le
     * spec prévoit déjà un « mobile allégé » — pas de curseur, pas de section
     * épinglée, parallaxe de moitié. Ceci en fait partie.
     */
    media.add(
      {
        large: `(min-width: ${SEUIL_MOBILE}px)`,
        etroit: `(max-width: ${SEUIL_MOBILE - 1}px)`,
      },
      (contexte) => {
        const volet = contexte.conditions?.large

        // Le volet se lève toujours du bas vers le haut, sur tous les blocs de
        // la page. Un sens qui change d'un bloc à l'autre se remarque et ne veut
        // rien dire ; un sens unique devient une grammaire.
        const depart = volet ? { clipPath: 'inset(0% 0% 100% 0%)' } : { opacity: 0, y: 18 }
        const arrivee = volet ? { clipPath: 'inset(0% 0% 0% 0%)' } : { opacity: 1, y: 0 }

        gsap.set(blocs, depart)
        ScrollTrigger.batch(blocs, {
          // 88 % : le bloc est révélé juste avant d'entrer franchement dans le
          // champ. Déclencher plus bas donne l'impression que la page attend
          // qu'on la regarde pour se décider.
          start: 'top 88%',
          once: true,
          onEnter: (lot) =>
            gsap.to(lot, {
              ...arrivee,
              duration: ATMOSPHERE.normal,
              ease: ATMOSPHERE.courbe,
              // Les blocs entrés dans la même image se révèlent en chaîne
              // plutôt qu'ensemble : trois colonnes qui se lèvent d'un bloc
              // font un rideau, décalées elles font une énumération.
              stagger: 0.08,
            }),
        })
      }
    )
  }

  const filets = racine.querySelectorAll<HTMLElement>('[data-filet]')
  if (filets.length > 0) {
    // `transformOrigin` et non une animation de largeur : une largeur déclenche
    // un recalcul de mise en page à chaque image, sur chaque filet de la page,
    // donc sur toute la page.
    gsap.set(filets, { scaleX: 0, transformOrigin: 'left center' })
    ScrollTrigger.batch(filets, {
      start: 'top 92%',
      once: true,
      onEnter: (lot) =>
        gsap.to(lot, {
          scaleX: 1,
          duration: ATMOSPHERE.court,
          ease: ATMOSPHERE.courbe,
          stagger: 0.06,
        }),
    })
  }

  // --- Parallaxe sur trois plans -------------------------------------------

  media.add(
    {
      large: `(min-width: ${SEUIL_MOBILE}px)`,
      etroit: `(max-width: ${SEUIL_MOBILE - 1}px)`,
    },
    (contexte) => {
      // Amplitude divisée par deux sous 768 px : sur un écran haut et étroit,
      // la même course déplace les plans sur une bien plus grande part de la
      // hauteur visible, et la parallaxe cesse d'être subtile.
      const amplitude = contexte.conditions?.large ? COURSE_PARALLAXE : COURSE_PARALLAXE / 2

      for (const plan of racine.querySelectorAll<HTMLElement>('[data-parallaxe]')) {
        const vitesse = PLANS[plan.dataset.parallaxe ?? ''] ?? 1
        gsap.fromTo(
          plan,
          { y: 0 },
          {
            y: (1 - vitesse) * amplitude,
            ease: 'none',
            // Le plan est promu sur sa propre couche de composition pendant
            // qu'il bouge, et rendu au flux normal ensuite. Sans cette bascule,
            // le navigateur repeint la zone à chaque image, par-dessus un
            // canvas qui la repeint déjà ; avec, il ne fait que déplacer une
            // texture. `will-change` en permanence serait pire : chaque couche
            // promue consomme de la mémoire vidéo, et la 3D en a besoin.
            willChange: 'transform',
            scrollTrigger: {
              trigger: plan,
              start: 'top bottom',
              end: 'bottom top',
              // `scrub` lie l'avancement à la position de défilement au lieu de
              // le jouer sur une durée : c'est ce qui rend le mouvement
              // réversible et solidaire du doigt ou de la molette.
              scrub: true,
            },
          }
        )
      }
    }
  )

  // Les positions de déclenchement sont calculées au montage, alors que les
  // polices peuvent encore changer la hauteur des blocs. Un recalcul après leur
  // chargement évite des révélations décalées de quelques dizaines de pixels.
  document.fonts?.ready.then(() => ScrollTrigger.refresh())

  return () => media.revert()
}

export function Choregraphie({ children }: { children: ReactNode }) {
  // `monterChoregraphie` est définie au niveau du module : elle est donc déjà
  // stable, et l'envelopper dans un `useCallback` ne ferait qu'ajouter du bruit
  // pour garantir ce qui l'est par construction.
  const ref = useChoregraphie<HTMLDivElement>(monterChoregraphie)

  return <div ref={ref}>{children}</div>
}
