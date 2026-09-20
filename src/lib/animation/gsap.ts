import type { gsap as TypeGsap } from 'gsap'
import type { ScrollTrigger as TypeScrollTrigger } from 'gsap/ScrollTrigger'
import { auTempsMort } from './differer'
import { obtenirLenis, reclamerPilotage } from './lenis'

/**
 * Le moteur de choréographie.
 *
 * ## Pourquoi GSAP est chargé à la demande et pas importé en haut de page
 *
 * GSAP et ScrollTrigger pèsent une cinquantaine de kilo-octets compressés, soit
 * le quart du budget de chargement initial du site. Et ils n'ont **rien** à
 * faire tant que la page n'est pas lisible : toute la choréographie de l'étape 4
 * est un ornement posé sur un contenu qui est déjà là, déjà visible, déjà
 * cliquable. Le masquage vient du script ; sans script, la page est simplement
 * statique et complète.
 *
 * Le chargement est donc différé **deux fois** : il attend un temps mort du
 * navigateur (`auTempsMort`), puis importe. Mesure à l'appui : sans l'attente,
 * l'analyse de GSAP et l'initialisation de ScrollTrigger tombaient en pleine
 * hydratation et ajoutaient 1,4 s de thread principal bloqué sur un profil
 * mobile bridé — du temps pendant lequel la page était à l'écran mais ne
 * répondait pas. Le coût n'a pas disparu, il a cessé d'être au mauvais moment.
 *
 * Un visiteur sur réseau lent lit et utilise le site avant d'avoir téléchargé
 * un octet d'animation.
 *
 * ## Un seul chargement, une seule inscription
 *
 * La promesse est mémorisée au niveau du module. Douze composants peuvent
 * appeler `chargerGsap()` dans la même image : il n'y aura qu'un import, qu'un
 * `registerPlugin`, qu'un branchement de Lenis.
 */

export interface Moteur {
  gsap: typeof TypeGsap
  ScrollTrigger: typeof TypeScrollTrigger
}

let promesse: Promise<Moteur | null> | null = null

export function chargerGsap(): Promise<Moteur | null> {
  promesse ??= new Promise((resoudre) => auTempsMort(() => resoudre(importer())))
  return promesse
}

async function importer(): Promise<Moteur | null> {
  try {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ])

    gsap.registerPlugin(ScrollTrigger)
    brancherLenis(gsap, ScrollTrigger)
    poserLaSonde(ScrollTrigger)

    return { gsap, ScrollTrigger }
  } catch {
    // Un échec de chargement n'est pas une panne : la page reste celle qu'elle
    // était avant, contenu visible et entièrement utilisable. On ne relance pas
    // — la promesse mémorisée garde l'échec, et un composant qui réessaie en
    // boucle sur un réseau coupé est pire que l'absence d'animation.
    return null
  }
}

/**
 * Une seule horloge pour le défilement et les animations.
 *
 * Les trois lignes ci-dessous sont le cœur du problème « pourquoi ça saccade
 * alors que le profileur dit 60 fps ». Sans elles, Lenis calcule une position
 * de défilement dans sa boucle, GSAP lit une position dans la sienne, et les
 * deux lectures d'une même image ne concordent pas : chaque animation liée au
 * défilement avance d'un pas inégal, une image sur deux.
 *
 * `lagSmoothing(0)` désactive le rattrapage de GSAP. Ce mécanisme sert à
 * absorber un gel du thread principal en déplaçant les animations d'un bond ;
 * appliqué à un défilement, il fait *sauter* la page, ce qui est exactement ce
 * qu'on cherche à éviter.
 */
function brancherLenis(gsap: typeof TypeGsap, ScrollTrigger: typeof TypeScrollTrigger) {
  const lenis = obtenirLenis()
  if (!lenis) return

  reclamerPilotage()
  lenis.on('scroll', ScrollTrigger.update)

  // `performance.now()` et non l'horodatage que le ticker fournit, alors que
  // toutes les recettes publiées écrivent `lenis.raf(temps * 1000)`.
  //
  // **La différence ne se voit qu'en production, et elle fait défiler la page
  // toute seule.** L'horloge du ticker part de l'initialisation de GSAP ;
  // celle du composant, de `performance.now()`. Ici GSAP est chargé en
  // différé : au moment de la reprise, Lenis reçoit donc un horodatage
  // brusquement inférieur de plusieurs secondes à celui qu'il vient de voir. Il
  // en déduit un intervalle négatif, et sa position part en vrille. Les
  // recettes publiées n'ont pas ce problème parce qu'elles créent Lenis et
  // GSAP dans la même image, avec la même horloge depuis le début.
  //
  // Une seule horloge pour les deux boucles, et le passage de l'une à l'autre
  // devient un non-événement.
  gsap.ticker.add(() => lenis.raf(performance.now()))
  gsap.ticker.lagSmoothing(0)
}

/**
 * Une sonde de test, et une seule.
 *
 * Elle expose le nombre de ScrollTriggers vivants, et rien d'autre : une
 * fonction sans argument qui rend un entier. `e2e/choregraphie.spec.ts` s'en
 * sert pour vérifier qu'aller et venir entre deux pages n'en laisse pas
 * derrière soi.
 *
 * **Pourquoi une sonde plutôt qu'une vérification dans le DOM.** Une fuite de
 * ScrollTrigger est invisible : les éléments animés disparaissent avec la page,
 * mais les déclencheurs, eux, restent abonnés au défilement et continuent de
 * recalculer leurs positions pour des éléments détachés. Le site ralentit
 * navigation après navigation sans qu'aucune capture d'écran, aucun test de
 * contenu et aucune erreur de console ne le signale. C'est exactement le genre
 * de défaut qu'on ne trouve qu'en le mesurant, et il faut bien un endroit d'où
 * le mesurer.
 *
 * Elle ne donne aucun pouvoir sur la page et ne lit aucune donnée.
 */
function poserLaSonde(ScrollTrigger: typeof TypeScrollTrigger) {
  ;(window as Window & { __scrollTriggers?: () => number }).__scrollTriggers = () =>
    ScrollTrigger.getAll().length
}
