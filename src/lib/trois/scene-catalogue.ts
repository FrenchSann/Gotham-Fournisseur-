import * as THREE from 'three'
import { creerCaisse, type Caisse } from './caisse'
import { creerEclairage } from './environnement'

/**
 * Les objets 3D du catalogue, sur un contexte WebGL unique.
 *
 * **Le point d'architecture décisif.** La tentation naturelle est de mettre un
 * `<canvas>` dans chaque carte. Les navigateurs plafonnent autour de 8 à
 * 16 contextes WebGL simultanés et détruisent silencieusement les plus anciens
 * au-delà : avec six cartes plus le fond, des caisses disparaîtraient au
 * hasard, et le bug serait intermittent et illisible.
 *
 * On utilise donc **un seul canvas** en position fixe couvrant l'écran. Chaque
 * carte déclare un emplacement — un simple `<div>` vide — et la scène y
 * dessine sa caisse en limitant le rendu à ce rectangle, via le test de ciseau
 * du GPU. Les caisses suivent naturellement le défilement puisqu'on relit la
 * position de chaque emplacement à chaque image.
 */

export interface Emplacement {
  element: HTMLElement
  teinte: string
}

export interface SceneCatalogue {
  /** Compile les shaders hors du thread principal. Voir `SceneFond.preparer`. */
  preparer: () => Promise<void>
  /** Déclare un emplacement. Rend la fonction qui le retire. */
  ajouter: (emplacement: Emplacement) => () => void
  survoler: (element: HTMLElement | null) => void
  redimensionner: (largeur: number, hauteur: number) => void
  rendre: (tempsMs: number) => void
  detruire: () => void
}

interface Vue {
  emplacement: Emplacement
  caisse: Caisse
  /** Avancement du survol, de 0 à 1. Amorti, jamais binaire. */
  survol: number
  /** Décalage de phase, pour que les six caisses ne tournent pas à l'unisson. */
  dephasage: number
}

export function creerSceneCatalogue(
  canvas: HTMLCanvasElement,
  dprMax: number
): SceneCatalogue | null {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  if (!renderer.getContext()) return null

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprMax))
  renderer.setClearColor(0x000000, 0)
  // On efface une seule fois par image, à la main : chaque vue dessine ensuite
  // dans sa propre zone sans effacer celle des autres.
  renderer.autoClear = false

  const scene = new THREE.Scene()

  // Trois sources, aucune carte d'environnement : voir `environnement.ts`,
  // le générateur PMREM bloquait deux secondes au démarrage.
  const eclairage = creerEclairage()
  for (const lumiere of eclairage.lumieres) scene.add(lumiere)

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
  camera.position.set(0, 0.55, 5.4)
  camera.lookAt(0, 0, 0)

  const vues: Vue[] = []
  let survole: HTMLElement | null = null
  let largeurCanvas = 1
  let hauteurCanvas = 1

  function ajouter(emplacement: Emplacement) {
    const caisse = creerCaisse(emplacement.teinte)
    caisse.groupe.visible = false
    scene.add(caisse.groupe)

    const vue: Vue = {
      emplacement,
      caisse,
      survol: 0,
      dephasage: vues.length * 1.7,
    }
    vues.push(vue)

    return () => {
      const i = vues.indexOf(vue)
      if (i >= 0) vues.splice(i, 1)
      scene.remove(caisse.groupe)
      caisse.detruire()
    }
  }

  function survoler(element: HTMLElement | null) {
    survole = element
  }

  function redimensionner(largeur: number, hauteur: number) {
    largeurCanvas = largeur
    hauteurCanvas = hauteur
    renderer.setSize(largeur, hauteur, false)
  }

  function rendre(tempsMs: number) {
    const t = tempsMs / 1000

    renderer.setScissorTest(false)
    renderer.clear()
    renderer.setScissorTest(true)

    // Toutes les caisses vivent dans la même scène : sans ce masquage
    // préalable, chaque vue dessinerait les six caisses superposées dans son
    // propre rectangle. Elles paraissaient alors toutes identiques, avec les
    // renforts de six teintes différentes empilés.
    for (const vue of vues) vue.caisse.groupe.visible = false

    for (const vue of vues) {
      const rect = vue.emplacement.element.getBoundingClientRect()

      // Hors écran : on ne dessine pas, mais on laisse l'amortissement du
      // survol se poursuivre pour ne pas figer l'état.
      const visible =
        rect.bottom > 0 &&
        rect.top < hauteurCanvas &&
        rect.right > 0 &&
        rect.left < largeurCanvas &&
        rect.width > 1 &&
        rect.height > 1

      const cible = survole === vue.emplacement.element ? 1 : 0
      vue.survol += (cible - vue.survol) * 0.12

      if (!visible) continue
      vue.caisse.groupe.visible = true

      // Rotation lente au repos, nettement plus rapide au survol.
      const vitesse = 0.16 + vue.survol * 0.5
      vue.caisse.groupe.rotation.y = t * vitesse + vue.dephasage
      // Bascule vers l'avant au survol, comme si on soulevait la caisse pour
      // la regarder — plus léger qu'un zoom, et ça montre le couvercle.
      vue.caisse.groupe.rotation.x = -0.22 - vue.survol * 0.16
      vue.caisse.groupe.position.y = Math.sin(t * 0.6 + vue.dephasage) * 0.045
      vue.caisse.groupe.scale.setScalar(1 + vue.survol * 0.07)

      // WebGL compte les hauteurs depuis le bas de la fenêtre, le DOM depuis
      // le haut : d'où l'inversion. Oublier cette ligne dessine les caisses
      // symétriquement au mauvais endroit.
      const bas = hauteurCanvas - rect.bottom

      renderer.setViewport(rect.left, bas, rect.width, rect.height)
      renderer.setScissor(rect.left, bas, rect.width, rect.height)

      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()

      renderer.render(scene, camera)
      vue.caisse.groupe.visible = false
    }

    renderer.setScissorTest(false)
  }

  async function preparer() {
    await renderer.compileAsync(scene, camera)
  }

  function detruire() {
    for (const vue of vues) {
      scene.remove(vue.caisse.groupe)
      vue.caisse.detruire()
    }
    vues.length = 0
    eclairage.detruire()
    renderer.dispose()
  }

  return { preparer, ajouter, survoler, redimensionner, rendre, detruire }
}
