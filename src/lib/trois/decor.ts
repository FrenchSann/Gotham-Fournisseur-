import * as THREE from 'three'

/**
 * Le décor : ce qui donne une échelle à la fumée.
 *
 * Un volume de fumée seul n'a pas de taille. Il peut faire trois mètres ou
 * trois kilomètres, rien dans l'image ne permet de trancher — et une image
 * sans échelle reste un fond d'écran. Il suffit d'une silhouette reconnaissable
 * au fond du champ pour que tout le reste se mette en place : la fumée devient
 * l'air d'un lieu, le faisceau devient une lampe accrochée quelque part, et la
 * caméra devient un point de vue.
 *
 * D'où ces quelques dizaines de blocs sombres, disposés en couloir qui fuit
 * vers l'arrière. On ne doit jamais les identifier précisément — ce ne sont ni
 * des caisses, ni des murs, ni des piliers, mais des masses qui pourraient
 * être les trois. Elles sont là pour être devinées à travers la fumée.
 *
 * ## Le coût
 *
 * Un `InstancedMesh` : **un seul appel de dessin** pour tout le décor, quelle
 * que soit le nombre de blocs. Le matériau est écrit à la main plutôt que pris
 * chez three.js — pas de carte d'environnement, pas d'ombres, pas de PBR :
 * une diffuse, un liseré, un brouillard. Le décor ne doit pas coûter, il doit
 * seulement exister.
 */

/** Demi-dimensions, position et orientation d'un bloc. Rien d'autre. */
interface Bloc {
  x: number
  y: number
  z: number
  largeur: number
  hauteur: number
  profondeur: number
  rotation: number
}

/**
 * Générateur à graine (mulberry32), identique à celui du bruit 2D.
 *
 * Le décor est tiré au hasard **une fois**, puis figé par la graine : la
 * composition est donc la même à chaque chargement. C'est un parti pris —
 * un décor différent à chaque visite serait invérifiable, et une capture
 * d'écran ne prouverait plus rien.
 */
function creerAleatoire(graine: number): () => number {
  let etat = graine >>> 0
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0
    let t = etat
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Deux rangées qui fuient, et rien au milieu.
 *
 * Le couloir central laissé vide est la seule décision de composition du
 * fichier, et c'est la plus importante : c'est lui qui donne au regard un
 * chemin vers le fond, et c'est dans ce vide que la fumée et le faisceau
 * viennent travailler. Rempli, le décor deviendrait un mur et l'image
 * s'aplatirait.
 */
function disposer(nombre: number): Bloc[] {
  const hasard = creerAleatoire(0x4e01)
  const blocs: Bloc[] = []

  for (let i = 0; i < nombre; i++) {
    const cote = i % 2 === 0 ? -1 : 1
    // Progression vers le fond : les blocs se raréfient et s'écartent, ce qui
    // accentue la fuite sans qu'on ait à toucher à la perspective.
    const avancement = i / nombre
    const z = -10 - avancement * 38 - hasard() * 3

    const ecart = 7.5 + avancement * 5 + hasard() * 3.5
    const hauteur = 1.4 + hasard() * hasard() * 9

    blocs.push({
      x: cote * ecart,
      // Posé au sol : tous les blocs partent du même plan, sinon ils flottent
      // et l'échelle qu'on cherchait à donner se perd.
      y: -5 + hauteur / 2,
      z,
      largeur: 1.2 + hasard() * 3.4,
      hauteur,
      profondeur: 1.2 + hasard() * 4,
      // Quelques degrés, jamais plus : des blocs parfaitement alignés font
      // décor de jeu vidéo, des blocs de travers font tas.
      rotation: (hasard() - 0.5) * 0.35,
    })
  }

  // Deux poutres en travers, très haut : elles ferment le cadre par le haut et
  // c'est sur elles que le faisceau vient buter.
  for (const z of [-15, -26]) {
    blocs.push({
      x: (hasard() - 0.5) * 4,
      y: 5.4,
      z,
      largeur: 30,
      hauteur: 0.55,
      profondeur: 0.8,
      rotation: 0,
    })
  }

  return blocs
}

export interface Decor {
  objet: THREE.Object3D
  detruire: () => void
}

export function creerDecor(nombre: number): Decor {
  const blocs = disposer(nombre)

  const geometrie = new THREE.BoxGeometry(1, 1, 1)
  const materiau = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uDirectionLumiere: { value: new THREE.Vector3(-1, 0.4, 0.3).normalize() },
      uCouleurLumiere: { value: new THREE.Color(0.78, 0.59, 0.32) },
      uCouleurFroide: { value: new THREE.Color(0.13, 0.18, 0.28) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormale;
      varying float vDistance;
      varying float vHauteur;

      void main() {
        // La normale doit être tournée par la matrice d'instance, sinon tous
        // les blocs s'éclairent comme s'ils étaient alignés sur les axes.
        vNormale = normalize(mat3(instanceMatrix) * normal);

        vec4 positionMonde = instanceMatrix * vec4(position, 1.0);
        vHauteur = positionMonde.y;

        vec4 positionVue = modelViewMatrix * positionMonde;
        vDistance = -positionVue.z;
        gl_Position = projectionMatrix * positionVue;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;

      uniform vec3 uDirectionLumiere;
      uniform vec3 uCouleurLumiere;
      uniform vec3 uCouleurFroide;

      varying vec3 vNormale;
      varying float vDistance;
      varying float vHauteur;

      void main() {
        vec3 n = normalize(vNormale);

        // Une seule diffuse, volontairement faible : le décor doit rester une
        // silhouette. Dès qu'on distingue ses faces, il cesse d'être une masse
        // devinée dans le noir et devient un objet — et un objet mal modélisé.
        float diffuse = max(dot(n, uDirectionLumiere), 0.0);

        // Liseré : les faces qui regardent vers le haut attrapent un reste de
        // ciel. C'est ce qui détache les arêtes supérieures du fond, et c'est
        // presque tout ce qu'on verra du décor.
        float dessus = max(n.y, 0.0);

        vec3 couleur =
            uCouleurFroide * (0.18 + 0.62 * dessus)
          + uCouleurLumiere * diffuse * 0.22;

        // Brouillard : les blocs lointains se dissolvent dans le noir du fond
        // au lieu de s'arrêter net. Sans lui, le décor a un bord, et un décor
        // qui a un bord se voit.
        float presence = exp(-max(vDistance - 10.0, 0.0) * 0.058);
        // Le bas est noyé dans la fumée rasante, qui est plus dense au sol :
        // les blocs semblent sortir d'elle plutôt que reposer dessus.
        presence *= smoothstep(-5.6, -2.6, vHauteur) * 0.85 + 0.15;

        if (presence < 0.01) discard;
        gl_FragColor = vec4(couleur * presence, presence);
      }
    `,
  })
  materiau.premultipliedAlpha = true

  const maille = new THREE.InstancedMesh(geometrie, materiau, blocs.length)
  const matrice = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const axe = new THREE.Vector3(0, 1, 0)

  blocs.forEach((bloc, i) => {
    quaternion.setFromAxisAngle(axe, bloc.rotation)
    matrice.compose(
      new THREE.Vector3(bloc.x, bloc.y, bloc.z),
      quaternion,
      new THREE.Vector3(bloc.largeur, bloc.hauteur, bloc.profondeur)
    )
    maille.setMatrixAt(i, matrice)
  })
  maille.instanceMatrix.needsUpdate = true
  // Le décor est immobile et toujours devant la caméra : le test de frustum
  // ne peut rien en retrancher, il ne ferait que coûter un calcul par image.
  maille.frustumCulled = false

  return {
    objet: maille,
    detruire() {
      geometrie.dispose()
      materiau.dispose()
      maille.dispose()
    },
  }
}
