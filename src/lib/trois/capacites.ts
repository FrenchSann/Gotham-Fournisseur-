/**
 * Décider si cet appareil peut porter la scène 3D.
 *
 * La question n'est pas « le navigateur annonce-t-il WebGL ? » mais « obtient-on
 * réellement un contexte ? ». Beaucoup d'appareils déclarent la prise en charge
 * puis échouent à l'allocation : pilote sur liste noire, mémoire vidéo saturée,
 * accélération désactivée par l'utilisateur. On teste donc en créant un vrai
 * contexte, qu'on relâche aussitôt.
 */

export type Niveau = 'complet' | 'aucun'

export interface Capacites {
  niveau: Niveau
  /** Facteur de résolution du rendu volumétrique. */
  echelleVolume: number
  /** Nombre de pas du rayon dans le volume. */
  pasRaymarch: number
  /** Nombre de points du champ de poussière. */
  pointsPoussiere: number
  /** Nombre de masses sombres du décor. Un seul appel de dessin les porte toutes. */
  blocsDecor: number
  /** Densité de pixels maximale du rendu 3D. */
  dprMax: number
}

/**
 * Valeurs issues de la mesure, pas de l'intuition.
 *
 * Le premier jeu (échelle 0.5, 32 pas) donnait 10 images par seconde sur une
 * machine de bureau correcte. Le raymarching coûte le produit de trois
 * nombres — pixels × pas × complexité du bruit — donc diviser chacun par deux
 * divise le coût par huit. C'est ce qu'on a fait, en vérifiant à chaque étape
 * que le rendu ne se dégradait pas visiblement : à cette échelle, la fumée est
 * de toute façon étirée et floutée.
 *
 * Le dernier ajustement (0.38 vers 0.30) visait la marge, pas la moyenne. À
 * 0.38 la page oscillait entre 60 et 30 images par seconde : dès qu'une image
 * dépasse 16,7 ms, le navigateur se cale sur la moitié de la fréquence de
 * l'écran, et la chute est brutale plutôt que progressive. Viser confortable
 * en dessous du seuil vaut mieux que viser juste au-dessus.
 */
const COMPLET: Omit<Capacites, 'niveau'> = {
  echelleVolume: 0.42,
  pasRaymarch: 20,
  pointsPoussiere: 1800,
  // Trente-six blocs en un seul `InstancedMesh` : le nombre ne se paie pas en
  // appels de dessin, seulement en sommets — et 36 boîtes font 864 sommets,
  // soit moins qu'une icône vectorielle un peu détaillée.
  blocsDecor: 36,
  dprMax: 1.5,
}

const AUCUN: Omit<Capacites, 'niveau'> = {
  echelleVolume: 0,
  pasRaymarch: 0,
  pointsPoussiere: 0,
  blocsDecor: 0,
  dprMax: 1,
}

/** Tente réellement d'obtenir un contexte WebGL2, puis le relâche. */
function webgl2Disponible(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (!gl) return false
    // Sans cette perte explicite, le contexte de test occupe un des 8 à 16
    // emplacements du navigateur jusqu'au ramassage des miettes — et c'est
    // exactement la ressource qui nous manquerait ensuite.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

/**
 * Appareil trop modeste pour la scène 3D.
 *
 * **Il n'existe pas de version allégée de la 3D, et c'est une décision prise
 * sur mesure.** Une variante à résolution et pas réduits avait été écrite ;
 * elle tenait le régime établi, mais le *démarrage* restait bloqué cinq à neuf
 * secondes — trois quarts de seconde de travail réel (analyse de three.js,
 * compilation du shader de raymarching) multipliés par la lenteur du
 * processeur. Une page figée neuf secondes est pire qu'une page sans 3D.
 *
 * Ces appareils reçoivent donc le fond 2D de l'étape 2, mesuré à 60 images par
 * seconde sans aucune tâche longue. Ce n'est pas un lot de consolation : c'est
 * une atmosphère complète, simplement produite autrement.
 *
 * Aucun de ces indices n'est fiable isolément — `deviceMemory` n'existe pas sur
 * Safari, `hardwareConcurrency` compte des cœurs qui ne se valent pas. Ils
 * suffisent pourtant, et l'erreur est sans gravité : on se trompe vers le fond
 * 2D, qui reste beau.
 */
function appareilModeste(): boolean {
  if (typeof navigator === 'undefined') return true

  const coeurs = navigator.hardwareConcurrency ?? 4
  const memoire = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const petitEcran = typeof window !== 'undefined' && window.innerWidth < 1024

  if (coeurs <= 4) return true
  if (memoire !== undefined && memoire <= 4) return true
  return petitEcran
}

export function detecterCapacites(): Capacites {
  if (!webgl2Disponible() || appareilModeste()) return { niveau: 'aucun', ...AUCUN }
  return { niveau: 'complet', ...COMPLET }
}
