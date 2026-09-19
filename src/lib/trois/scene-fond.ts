import * as THREE from 'three'
import type { Capacites } from './capacites'
import { FPS } from '../animation/motion-tokens'
import { poserCamera } from './camera-cine'
import { creerDecor } from './decor'
import { fragmentShaderComposition, vertexShaderComposition } from './shaders/composition'
import { fragmentShader, vertexShader } from './shaders/volume'

/**
 * La scène 3D de fond.
 *
 * Quatre passes sur un seul rendu, et leur **ordre est le sujet** : c'est lui
 * qui produit la profondeur, pas la géométrie.
 *
 *   1. **Le volume** est rendu dans une cible hors écran à résolution réduite.
 *      C'est la passe coûteuse, et la seule qu'on dégrade.
 *   2. **Le décor** — quelques masses sombres qui fuient vers le fond, dessinées
 *      en premier à l'écran, donc *derrière* la fumée. C'est ce qui donne une
 *      échelle au volume : sans lui, la fumée pourrait faire trois mètres ou
 *      trois kilomètres.
 *   3. **L'étalonnage** étire la cible au format de l'écran en lui appliquant
 *      les défauts d'un objectif — halo, traînée, frange chromatique,
 *      vignettage, courbe filmique, grain.
 *   4. **La poussière** passe par-dessus tout, à pleine résolution. Elle reste
 *      donc nette alors que la fumée est floue, et ce rapport de netteté est
 *      exactement celui d'une vraie mise au point : le grain de poussière est
 *      dans le plan, le brouillard ne l'est pas.
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
  /** Avancement dans la page, dans [0, 1]. Pilote le travelling. */
  viserDefilement: (progression: number) => void
  /** Reprend le grain de pellicule à son compte, calque 2D retiré. */
  absorberGrain: () => void
  detruire: () => void
}

/** Ambre du faisceau et gris bleuté de l'ambiance — les mêmes qu'en 2D. */
const COULEUR_LUMIERE = new THREE.Color(0.78, 0.59, 0.32)
/**
 * L'ambiante a été baissée d'un tiers en même temps qu'apparaissait le
 * contre-jour froid. Les deux s'additionnent dans la fumée : garder l'ancienne
 * valeur aurait simplement éclairci toute l'image, et l'écart entre l'ombre
 * bleue et la lumière ambrée — qui est tout l'intérêt de l'opération — se
 * serait dilué dans un gris général.
 */
const COULEUR_AMBIANTE = new THREE.Color(0.018, 0.023, 0.032)
/** Contre-jour froid : la lune, ou une veilleuse au bout du hangar. */
const COULEUR_FROIDE = new THREE.Color(0.05, 0.075, 0.13)

/**
 * Réglages de l'objectif, injectés à la compilation du shader d'étalonnage.
 *
 * Injectés plutôt que passés en uniformes parce qu'aucun ne change en cours de
 * route : le pilote peut alors replier les constantes et, pour la traînée
 * anamorphique, supprimer purement et simplement quatre lectures de texture
 * quand elle est coupée.
 */
const OBJECTIF = {
  DISTORSION: '0.030',
  ABERRATION: '0.0055',
  RAYON_HALO: '2.0',
  INTENSITE_HALO: '0.85',
  ETIREMENT_TRAINEE: '7.0',
  INTENSITE_TRAINEE: '0.30',
  EXPOSITION: '1.0',
  VIGNETTE: '0.62',
} as const

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
    uCouleurFroide: { value: COULEUR_FROIDE },
    uDirectionFroide: { value: new THREE.Vector3(0, 0.4, 0.4).normalize() },
    uPhaseLames: { value: 0 },
    uIntensite: { value: 0.75 },
    // Le shader lance ses rayons lui-même : il lui faut la focale de la caméra
    // de perspective, sinon la fumée et la poussière ne bougent pas du même
    // geste quand l'objectif se resserre au défilement — et cet écart-là se
    // voit immédiatement, bien plus qu'une focale approximative.
    uFocale: { value: 1.6 },
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
      // Quantité de lumière diffusée par l'air lui-même à chaque pas. C'est le
      // réglage du faisceau : trop bas il disparaît, trop haut le cadre se
      // remplit d'un cône laiteux et le texte du site passe devant.
      DIFFUSION_AIR: '0.95',
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

  const uniformsComposition = {
    uFumee: { value: cible.texture },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uTemps: { value: 0 },
    uGrain: { value: 0 },
    uFormat: { value: 1 },
  }

  const materiauComposition = new THREE.ShaderMaterial({
    vertexShader: vertexShaderComposition,
    fragmentShader: fragmentShaderComposition,
    uniforms: uniformsComposition,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    defines: { ...OBJECTIF, TRAINEE_ANAMORPHIQUE: capacites.niveau === 'complet' ? 1 : 0 },
  })
  // Le rendu volumétrique a écrit `couleur × alpha` dans la cible ; déclarer la
  // sortie prémultipliée évite de multiplier une seconde fois, ce que faisait
  // l'ancien `MeshBasicMaterial` transparent. Voir l'en-tête de
  // `shaders/composition.ts` : c'est la correction qui a rendu à la fumée sa
  // luminosité réelle.
  materiauComposition.premultipliedAlpha = true

  // Le même triangle unique que pour le volume : la géométrie de composition
  // n'a aucune raison d'être plus riche que celle qui a produit l'image.
  const quadComposition = new THREE.Mesh(planPleinEcran, materiauComposition)
  quadComposition.frustumCulled = false
  sceneComposition.add(quadComposition)

  // --- Passes 2 et 4 : décor et poussière, en perspective ------------------

  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 100)
  camera.position.set(0, 0.6, 12)

  const sceneDecor = new THREE.Scene()
  const decor = creerDecor(capacites.blocsDecor)
  sceneDecor.add(decor.objet)

  const scenePoussiere = new THREE.Scene()
  const poussiere = creerPoussiere(capacites.pointsPoussiere)
  scenePoussiere.add(poussiere.points)

  // --- Caméra --------------------------------------------------------------

  let pointeurX = 0
  let pointeurY = 0
  let viseX = 0
  let viseY = 0
  let defilement = 0
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
    // Le halo et la traînée s'expriment en texels de la cible, pas en pixels
    // d'écran : leur taille apparente reste ainsi la même quelle que soit la
    // définition de l'écran, ce qui est la seule façon d'avoir un réglage
    // d'objectif qui ne se dérègle pas d'une machine à l'autre.
    uniformsComposition.uTexel.value.set(1 / cible.width, 1 / cible.height)
    uniformsComposition.uFormat.value = largeur / Math.max(hauteur, 1)

    camera.aspect = largeur / Math.max(hauteur, 1)
    camera.updateProjectionMatrix()
  }

  function viserDefilement(progression: number) {
    defilement = progression
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

    const pose = poserCamera({ temps: t, pointeurX, pointeurY, defilement })

    camera.position.set(pose.x, pose.y, pose.z)
    camera.lookAt(pose.cibleX, pose.cibleY, pose.cibleZ)
    // Le roulis s'applique *après* la visée : `lookAt` écrase l'orientation
    // entière, il remettrait l'horizon à plat.
    camera.rotateZ(pose.roulis)

    if (camera.fov !== pose.fov) {
      camera.fov = pose.fov
      camera.updateProjectionMatrix()
      // tan(fov/2) en radians : la moitié de la hauteur du plan image à une
      // unité de distance. Son inverse est ce que le shader appelle focale.
      uniforms.uFocale.value = 1 / Math.tan((pose.fov * Math.PI) / 360)
    }
    camera.updateMatrixWorld()

    uniforms.uTemps.value = t
    uniforms.uPositionCamera.value.copy(camera.position)
    uniforms.uOrientationCamera.value.setFromMatrix4(camera.matrixWorld)

    // Le faisceau balaie la scène, comme le projecteur 2D de l'étape 2.
    const phase = (t / 25) * Math.PI
    uniforms.uPositionLumiere.value.set(Math.sin(phase) * 16, 8.5, -9 + Math.cos(phase) * 3)
    // Le contre-jour froid reste à l'opposé du faisceau tout au long du
    // balayage. C'est ce qui maintient l'écart chaud/froid quel que soit le
    // moment du cycle — sinon les deux sources finissent par se superposer et
    // l'image s'aplatit pendant plusieurs secondes.
    uniforms.uDirectionFroide.value.set(-Math.sin(phase), 0.42, 0.38).normalize()
    // Les lames dérivent trente fois plus lentement que le faisceau : on ne
    // doit pas voir le motif défiler, seulement constater qu'il n'est plus tout
    // à fait au même endroit quand on revient sur la page.
    uniforms.uPhaseLames.value = t * 0.035

    uniformsComposition.uTemps.value = t

    poussiere.animer(t, camera)

    if (tempsMs - dernierVolume >= intervalleVolumeMs) {
      dernierVolume = tempsMs
      renderer.setRenderTarget(cible)
      renderer.clear()
      renderer.render(sceneVolume, cameraPlan)
    }

    renderer.setRenderTarget(null)
    renderer.clear()

    // Effacement manuel ci-dessus, automatique coupé ci-dessous : les trois
    // rendus qui suivent se superposent dans la même image, et leur ordre est
    // celui de la profondeur — décor, puis fumée par-dessus, puis poussière.
    renderer.autoClear = false
    renderer.render(sceneDecor, camera)
    renderer.render(sceneComposition, cameraPlan)
    renderer.render(scenePoussiere, camera)
    renderer.autoClear = true
  }

  async function preparer() {
    await renderer.compileAsync(sceneVolume, cameraPlan)
    await renderer.compileAsync(sceneComposition, cameraPlan)
    await renderer.compileAsync(sceneDecor, camera)
    await renderer.compileAsync(scenePoussiere, camera)
  }

  /**
   * Fond le grain de pellicule dans l'étalonnage.
   *
   * Appelé par le composant quand il a retiré le calque 2D qui s'en chargeait.
   * Le gain n'est pas dans le calcul du bruit — il était déjà négligeable —
   * mais dans la **composition** : un calque plein écran en `mix-blend-mode`
   * oblige le navigateur à relire tout le cadre à chaque image pour le
   * mélanger. C'est ce coût-là, invisible au profileur JavaScript, qui paie
   * les effets ajoutés ici.
   */
  function absorberGrain() {
    uniformsComposition.uGrain.value = 1
  }

  function detruire() {
    planPleinEcran.dispose()
    materiauVolume.dispose()
    materiauComposition.dispose()
    cible.dispose()
    decor.detruire()
    poussiere.detruire()
    renderer.dispose()
  }

  return {
    preparer,
    redimensionner,
    rendre,
    viserPointeur,
    viserDefilement,
    absorberGrain,
    detruire,
  }
}

/**
 * Champ de poussière en volume, et quelques braises dedans.
 *
 * C'est l'élément qui fait la différence entre « joli fond » et « espace » :
 * les points proches se déplacent plus que les lointains quand la caméra
 * bouge, et cette parallaxe-là, l'œil la lit comme de la profondeur.
 *
 * Les braises ne sont pas un second système de particules mais un attribut du
 * premier : même géométrie, même appel de dessin, même shader. Elles montent
 * plus vite, dérivent de côté et scintillent. Elles coûtent un attribut et
 * quatre lignes, là où un émetteur séparé aurait coûté un appel de dessin et
 * un cycle de vie à tenir.
 */
function creerPoussiere(nombre: number) {
  const positions = new Float32Array(nombre * 3)
  const vitesses = new Float32Array(nombre)
  const tailles = new Float32Array(nombre)
  const chaleurs = new Float32Array(nombre)

  for (let i = 0; i < nombre; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 26
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2
    vitesses[i] = 0.08 + Math.random() * 0.22
    tailles[i] = 0.6 + Math.random() * 1.8
    // Une particule sur quarante est une braise, soit une quarantaine dans
    // tout le volume. La proportion compte plus que l'effet lui-même, et elle
    // a été corrigée à la baisse après coup : à une sur douze, les points
    // chauds se répartissaient trop régulièrement dans le cadre et se lisaient
    // comme du bruit de capteur — un défaut d'image, pas une braise. Rares,
    // ils redeviennent des événements.
    chaleurs[i] = Math.random() < 0.025 ? 1 : 0
  }

  const geometrie = new THREE.BufferGeometry()
  geometrie.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometrie.setAttribute('aTaille', new THREE.BufferAttribute(tailles, 1))
  geometrie.setAttribute('aVitesse', new THREE.BufferAttribute(vitesses, 1))
  geometrie.setAttribute('aChaleur', new THREE.BufferAttribute(chaleurs, 1))

  const materiau = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uCouleur: { value: new THREE.Color(0.62, 0.63, 0.66) },
      uCouleurBraise: { value: new THREE.Color(1.0, 0.64, 0.28) },
      uEchelle: { value: 1 },
      uTemps: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aTaille;
      attribute float aVitesse;
      attribute float aChaleur;
      uniform float uEchelle;
      uniform float uTemps;
      varying float vAttenuation;
      varying float vChaleur;
      varying float vScintillement;

      void main() {
        // La montée des particules est calculée ici plutôt que sur le
        // processeur. La version précédente parcourait 4000 particules à
        // chaque image et renvoyait 48 Ko au GPU : du travail principal et un
        // transfert, soixante fois par seconde, pour une trajectoire qui
        // s'écrit en une ligne. Le modulo assure la réapparition en bas sans
        // aucun état à conserver.
        vChaleur = aChaleur;

        vec3 pos = position;
        // Les braises montent une fois et demie plus vite que la poussière et
        // partent de côté en montant : une escarbille est portée par l'air
        // chaud, une poussière ne fait que flotter. Sans ce décalage les deux
        // se ressemblent et on ne voit qu'une poussière colorée.
        float vitesse = aVitesse * (1.0 + aChaleur * 0.55);
        pos.y = mod(pos.y + uTemps * vitesse + 7.0, 14.0) - 7.0;
        pos.x += sin(uTemps * 0.6 + position.y * 0.8) * aChaleur * 0.4;

        // Scintillement : une braise ne brûle pas d'une intensité constante.
        vScintillement = 0.55 + 0.45 * sin(uTemps * 3.1 + position.x * 5.3);

        vec4 positionVue = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * positionVue;

        float distance = -positionVue.z;
        // uEchelle est calibre pour donner des points de 1 a 3 pixels. Une
        // poussiere doit se deviner, pas se compter : au-dela de quelques
        // pixels elle devient une tempete de neige et mange le texte.
        gl_PointSize = clamp(
          aTaille * (1.0 + aChaleur * 0.7) * uEchelle / max(distance, 2.0), 0.8, 4.0);

        // Brouillard de profondeur : les points lointains s'effacent, ce qui
        // donne l'échelle du volume.
        vAttenuation = smoothstep(26.0, 3.0, distance);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCouleur;
      uniform vec3 uCouleurBraise;
      varying float vAttenuation;
      varying float vChaleur;
      varying float vScintillement;

      void main() {
        // Point rond et flou plutôt que carré : gl_PointCoord donne la
        // position dans le sprite, on en fait un dégradé radial.
        float d = length(gl_PointCoord - 0.5);
        // En fusion additive, chaque point s'ajoute au fond : 0.5 saturait
        // le blanc des la deuxieme superposition.
        float alpha = smoothstep(0.5, 0.06, d) * vAttenuation * 0.14;
        alpha *= 1.0 + vChaleur * vScintillement * 3.4;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(mix(uCouleur, uCouleurBraise, vChaleur), alpha);
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
