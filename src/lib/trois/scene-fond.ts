import * as THREE from 'three'
import type { Capacites } from './capacites'
import { FPS } from '../animation/motion-tokens'
import { fragmentShader, vertexShader } from './shaders/volume'

/**
 * La scène 3D de fond.
 *
 * Deux passes sur un seul rendu :
 *
 *   1. **Le volume** est rendu dans une cible hors écran à résolution réduite.
 *      C'est la passe coûteuse, et la seule qu'on dégrade.
 *   2. **La composition** étire cette cible au format de l'écran et dessine
 *      par-dessus le champ de poussière, lui à pleine résolution. La poussière
 *      reste donc nette alors que la fumée est floue — ce qui est exactement
 *      le rapport qu'on veut entre les deux.
 *
 * Tout vit hors de React. Une scène 3D n'a rien à gagner d'un arbre de
 * composants : elle a un cycle de vie propre, un état mutable, et soixante
 * images par seconde à produire.
 */

export interface SceneFond {
  /**
   * Compile les shaders avant la première image.
   *
   * `compileAsync` s'appuie sur KHR_parallel_shader_compile : le pilote
   * compile sur un autre thread et le thread principal reste libre. Sans
   * cela, three.js compile paresseusement au premier rendu — et la
   * traduction du shader de raymarching vers HLSL gelait la page plusieurs
   * secondes, mesure à l'appui.
   */
  preparer: () => Promise<void>
  redimensionner: (largeur: number, hauteur: number) => void
  rendre: (tempsMs: number) => void
  viserPointeur: (x: number, y: number) => void
  detruire: () => void
}

/** Ambre du faisceau et gris bleuté de l'ambiance — les mêmes qu'en 2D. */
const COULEUR_LUMIERE = new THREE.Color(0.78, 0.59, 0.32)
const COULEUR_AMBIANTE = new THREE.Color(0.055, 0.065, 0.08)

export function creerSceneFond(canvas: HTMLCanvasElement, capacites: Capacites): SceneFond | null {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false, // Inutile : aucune arête franche dans cette scène.
    powerPreference: 'high-performance',
  })
  if (!renderer.getContext()) return null

  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, capacites.dprMax))

  // --- Passe 1 : le volume -------------------------------------------------

  const sceneVolume = new THREE.Scene()
  const cameraPlan = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const uniforms = {
    uTemps: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPositionCamera: { value: new THREE.Vector3(0, 0.6, 12) },
    uOrientationCamera: { value: new THREE.Matrix3() },
    uPositionLumiere: { value: new THREE.Vector3(-11, 4.5, -3) },
    uCouleurLumiere: { value: COULEUR_LUMIERE },
    uCouleurAmbiante: { value: COULEUR_AMBIANTE },
    uIntensite: { value: 1 },
  }

  const materiauVolume = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    defines: {
      PAS: capacites.pasRaymarch,
      // L'éclairage volumétrique triple le coût de chaque pas dense. C'est lui
      // qui crée les rais ; sur mobile on s'en passe et on garde l'atténuation.
      ECLAIRAGE_VOLUMETRIQUE: capacites.niveau === 'complet' ? 1 : 0,
    },
  })

  // Un triangle unique plutôt qu'un quad : une primitive au lieu de deux, et
  // aucune couture diagonale au milieu de l'écran.
  const planPleinEcran = new THREE.BufferGeometry()
  planPleinEcran.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)
  )
  planPleinEcran.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2))
  sceneVolume.add(new THREE.Mesh(planPleinEcran, materiauVolume))

  const cible = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  })

  // --- Passe 2 : composition -----------------------------------------------

  /**
   * La fumée est composée avec la **caméra orthographique**, pas avec la
   * perspective.
   *
   * Erreur commise puis corrigée ici, et elle est sournoise : un
   * `MeshBasicMaterial` applique la matrice de vue et de projection de la
   * caméra active. Composée avec la perspective, la cible plein écran se
   * retrouvait affichée comme un petit quadrilatère flottant dans la scène,
   * à quelques unités de l'origine. La fumée se calculait parfaitement — elle
   * était simplement dessinée grande comme un timbre au milieu de l'écran.
   *
   * L'orthographique en coordonnées (-1, 1) fait correspondre le plan
   * exactement au cadre, quelle que soit la position de la caméra 3D.
   */
  const sceneComposition = new THREE.Scene()
  const geoQuad = new THREE.PlaneGeometry(2, 2)
  const materiauComposition = new THREE.MeshBasicMaterial({
    map: cible.texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const quadComposition = new THREE.Mesh(geoQuad, materiauComposition)
  quadComposition.frustumCulled = false
  sceneComposition.add(quadComposition)

  // --- Passe 3 : poussière, en perspective ---------------------------------

  const scenePoussiere = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 100)
  camera.position.set(0, 0.6, 12)

  const poussiere = creerPoussiere(capacites.pointsPoussiere)
  scenePoussiere.add(poussiere.points)

  // --- Caméra --------------------------------------------------------------

  let pointeurX = 0
  let pointeurY = 0
  let viseX = 0
  let viseY = 0
  let dernierVolume = -Infinity

  // La fumée dérive sur plusieurs dizaines de secondes : la recalculer
  // soixante fois par seconde revient à jeter une image sur deux. Même
  // raisonnement que pour la brume 2D de l'étape 2, et même gain — la moitié
  // de la passe la plus coûteuse du site. La composition et la poussière,
  // elles, restent à la cadence de l'écran : ce sont elles qui portent la
  // parallaxe, et c'est là que l'œil verrait une saccade.
  const intervalleVolumeMs = 1000 / FPS.fond

  function redimensionner(largeur: number, hauteur: number) {
    renderer.setSize(largeur, hauteur, false)

    const dpr = renderer.getPixelRatio()
    cible.setSize(
      Math.max(2, Math.round(largeur * dpr * capacites.echelleVolume)),
      Math.max(2, Math.round(hauteur * dpr * capacites.echelleVolume))
    )

    uniforms.uResolution.value.set(largeur, hauteur)
    camera.aspect = largeur / Math.max(hauteur, 1)
    camera.updateProjectionMatrix()
  }

  function viserPointeur(x: number, y: number) {
    viseX = x
    viseY = y
  }

  function rendre(tempsMs: number) {
    const t = tempsMs / 1000

    // Suivi amorti du pointeur : la caméra rejoint sa cible au lieu de coller
    // au curseur. Un suivi direct paraît nerveux et trahit le truc.
    pointeurX += (viseX - pointeurX) * 0.03
    pointeurY += (viseY - pointeurY) * 0.03

    // Dérive lente et permanente, pour que la scène vive même immobile.
    const deriveX = Math.sin(t * 0.07) * 0.5
    const deriveY = Math.cos(t * 0.05) * 0.28

    camera.position.x = deriveX + pointeurX * 0.85
    camera.position.y = 0.6 + deriveY + pointeurY * -0.45
    camera.lookAt(pointeurX * 0.3, 0.3 + pointeurY * -0.15, 0)
    camera.updateMatrixWorld()

    uniforms.uTemps.value = t
    uniforms.uPositionCamera.value.copy(camera.position)
    uniforms.uOrientationCamera.value.setFromMatrix4(camera.matrixWorld)

    // Le faisceau balaie la scène, comme le projecteur 2D de l'étape 2.
    const phase = (t / 25) * Math.PI
    uniforms.uPositionLumiere.value.set(Math.sin(phase) * 13, 4.2, -3 + Math.cos(phase) * 4)

    poussiere.animer(t, camera)

    if (tempsMs - dernierVolume >= intervalleVolumeMs) {
      dernierVolume = tempsMs
      renderer.setRenderTarget(cible)
      renderer.clear()
      renderer.render(sceneVolume, cameraPlan)
    }

    renderer.setRenderTarget(null)
    renderer.clear()

    // La poussière se dessine par-dessus la fumée sans l'effacer : d'où
    // l'effacement manuel ci-dessus et la désactivation de l'effacement
    // automatique entre les deux rendus.
    renderer.autoClear = false
    renderer.render(sceneComposition, cameraPlan)
    renderer.render(scenePoussiere, camera)
    renderer.autoClear = true
  }

  async function preparer() {
    await renderer.compileAsync(sceneVolume, cameraPlan)
    await renderer.compileAsync(sceneComposition, cameraPlan)
    await renderer.compileAsync(scenePoussiere, camera)
  }

  function detruire() {
    planPleinEcran.dispose()
    geoQuad.dispose()
    materiauVolume.dispose()
    materiauComposition.dispose()
    cible.dispose()
    poussiere.detruire()
    renderer.dispose()
  }

  return { preparer, redimensionner, rendre, viserPointeur, detruire }
}

/**
 * Champ de poussière en volume.
 *
 * C'est l'élément qui fait la différence entre « joli fond » et « espace » :
 * les points proches se déplacent plus que les lointains quand la caméra
 * bouge, et cette parallaxe-là, l'œil la lit comme de la profondeur.
 */
function creerPoussiere(nombre: number) {
  const positions = new Float32Array(nombre * 3)
  const vitesses = new Float32Array(nombre)
  const tailles = new Float32Array(nombre)

  for (let i = 0; i < nombre; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 26
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2
    vitesses[i] = 0.08 + Math.random() * 0.22
    tailles[i] = 0.6 + Math.random() * 1.8
  }

  const geometrie = new THREE.BufferGeometry()
  geometrie.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometrie.setAttribute('aTaille', new THREE.BufferAttribute(tailles, 1))
  geometrie.setAttribute('aVitesse', new THREE.BufferAttribute(vitesses, 1))

  const materiau = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uCouleur: { value: new THREE.Color(0.62, 0.63, 0.66) },
      uEchelle: { value: 1 },
      uTemps: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aTaille;
      attribute float aVitesse;
      uniform float uEchelle;
      uniform float uTemps;
      varying float vAttenuation;

      void main() {
        // La montée des particules est calculée ici plutôt que sur le
        // processeur. La version précédente parcourait 4000 particules à
        // chaque image et renvoyait 48 Ko au GPU : du travail principal et un
        // transfert, soixante fois par seconde, pour une trajectoire qui
        // s'écrit en une ligne. Le modulo assure la réapparition en bas sans
        // aucun état à conserver.
        vec3 pos = position;
        pos.y = mod(pos.y + uTemps * aVitesse + 7.0, 14.0) - 7.0;

        vec4 positionVue = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * positionVue;

        float distance = -positionVue.z;
        // uEchelle est calibre pour donner des points de 1 a 3 pixels. Une
        // poussiere doit se deviner, pas se compter : au-dela de quelques
        // pixels elle devient une tempete de neige et mange le texte.
        gl_PointSize = clamp(aTaille * uEchelle / max(distance, 2.0), 0.8, 3.2);

        // Brouillard de profondeur : les points lointains s'effacent, ce qui
        // donne l'échelle du volume.
        vAttenuation = smoothstep(26.0, 3.0, distance);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCouleur;
      varying float vAttenuation;

      void main() {
        // Point rond et flou plutôt que carré : gl_PointCoord donne la
        // position dans le sprite, on en fait un dégradé radial.
        float d = length(gl_PointCoord - 0.5);
        // En fusion additive, chaque point s'ajoute au fond : 0.5 saturait
        // le blanc des la deuxieme superposition.
        float alpha = smoothstep(0.5, 0.06, d) * vAttenuation * 0.14;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uCouleur, alpha);
      }
    `,
  })

  const points = new THREE.Points(geometrie, materiau)
  points.frustumCulled = false

  function animer(t: number, camera: THREE.PerspectiveCamera) {
    // Deux uniformes, et c'est tout : aucune boucle, aucun transfert.
    materiau.uniforms.uTemps.value = t

    // gl_PointSize s'exprime en pixels physiques : sans le ratio de pixels,
    // la poussiere serait deux fois plus fine sur un ecran haute densite.
    materiau.uniforms.uEchelle.value = 18 * Math.min(window.devicePixelRatio || 1, 2)
    void camera
    void t
  }

  function detruire() {
    geometrie.dispose()
    materiau.dispose()
  }

  return { points, animer, detruire }
}
