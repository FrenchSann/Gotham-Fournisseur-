/**
 * Fumée volumétrique par lancer de rayon.
 *
 * Ce n'est pas une image de fumée posée sur le fond : pour chaque pixel, un
 * rayon part de la caméra et traverse une boîte remplie de bruit fractal, en
 * accumulant la densité et la lumière rencontrées. C'est ce qui produit la
 * profondeur — les nappes passent réellement devant et derrière le faisceau,
 * et l'occultent.
 *
 * Coût maîtrisé par trois moyens :
 *   - le rendu se fait dans une cible réduite (1/2 sur bureau, 1/3 sur mobile)
 *     puis est étiré : un flou volumétrique n'a aucun besoin de finesse ;
 *   - le nombre de pas est injecté à la compilation (`PAS`), pas lu dans une
 *     variable — la boucle est ainsi déroulable par le pilote ;
 *   - l'éclairage se calcule par une seconde marche très courte, désactivée en
 *     mode allégé où une atténuation analytique suffit.
 */

export const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const fragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTemps;
uniform vec2  uResolution;
uniform vec3  uPositionCamera;
uniform mat3  uOrientationCamera;
uniform vec3  uPositionLumiere;
uniform vec3  uCouleurLumiere;
uniform vec3  uCouleurAmbiante;
uniform float uIntensite;
/** Contre-jour froid : direction seule, sans position ni atténuation. */
uniform vec3  uDirectionFroide;
uniform vec3  uCouleurFroide;
/** Phase des lames du gobo. Dérive très lentement, indépendamment du faisceau. */
uniform float uPhaseLames;
/** Inverse de tan(fov/2) : la focale de la caméra de perspective. */
uniform float uFocale;

// Demi-dimensions de la boîte qui contient la fumée.
const vec3 BOITE = vec3(9.0, 5.0, 7.0);

// ---------------------------------------------------------------- bruit ----

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

/** Bruit de valeur trilinéaire : continu, donc des nappes plutôt que de la neige. */
float bruit(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

/**
 * Bruit fractal, trois octaves.
 *
 * La fonction bruit coûte huit appels de hachage, donc celle-ci en coûte
 * vingt-quatre. Dans une boucle de raymarching, c'est LE chiffre qui décide
 * de la fluidité du site : tout le reste du shader est négligeable devant lui.
 */
float fbm(vec3 p) {
  float somme = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    somme += amplitude * bruit(p);
    p = p * 2.03 + vec3(11.3, 7.1, 5.7);
    amplitude *= 0.5;
  }
  return somme;
}

/** Enveloppe de la fumée : bords estompés et gradient bas. Sans bruit. */
float enveloppe(vec3 p) {
  // Estompe vers les bords de la boîte : sans ça, on voit les faces.
  vec3 bord = smoothstep(vec3(0.0), BOITE * 0.55, BOITE - abs(p));
  // La fumée est basse : plus dense en bas qu'en haut.
  return bord.x * bord.y * bord.z * smoothstep(BOITE.y * 1.7, -BOITE.y * 0.6, p.y);
}

vec3 derive() {
  return vec3(uTemps * 0.013, uTemps * -0.008, uTemps * 0.006);
}

/**
 * Densité de fumée en un point, nulle hors de la boîte.
 *
 * Fréquence calibrée sur la taille de la boîte, qui fait ±9 unités : à 0.19
 * le rayon ne traversait que trois ou quatre cellules de bruit, la densité
 * était donc quasi uniforme et la fumée invisible. À 0.55 on traverse une
 * dizaine de cellules, ce qui donne des nappes distinctes sans tomber dans
 * le grain.
 */
float densite(vec3 p, float env) {
  if (env <= 0.0) return 0.0;

  float n = fbm(p * 0.55 + derive());

  // Le seuil sculpte la fumée : trop haut, elle disparaît ; trop bas, elle
  // remplit tout l'écran d'un voile gris.
  return max(0.0, n - 0.34) * env * 3.0;
}

/**
 * Densité approchée, pour la marche vers la lumière uniquement.
 *
 * Une seule octave au lieu de trois : huit hachages contre vingt-quatre.
 * L'approximation est invisible parce que cette valeur ne sert qu'à savoir
 * *combien* de matière se trouve entre un point et la source — une ombre
 * portée n'a pas besoin du détail fin de la fumée, seulement de sa masse.
 *
 * Sans cette distinction, chaque pas du rayon coûtait quatre densités
 * complètes, soit 192 hachages par pas et plus d'un milliard par image :
 * le site tombait à 10 images par seconde.
 */
float densiteGrossiere(vec3 p) {
  vec3 hors = abs(p) - BOITE;
  if (max(hors.x, max(hors.y, hors.z)) > 0.0) return 0.0;

  float n = 0.5 * bruit(p * 0.55 + derive());
  return max(0.0, n - 0.18) * enveloppe(p) * 3.0;
}

/**
 * Le gobo : ce qui transforme une lampe en projecteur.
 *
 * Un faisceau nu traversant de la fumée donne un dégradé — joli, et parfaitement
 * anonyme. Ce qui fait lire « entrepôt la nuit », c'est que la lumière arrive
 * *découpée* : par une verrière, une claire-voie, des poutres. Au cinéma
 * l'accessoire qui découpe s'appelle un gobo, et c'est le geste le moins cher
 * du métier pour le plus grand effet.
 *
 * Le motif est calculé sur l'**angle d'élévation du point vu depuis la source**,
 * et non sur sa position. La conséquence est capitale : la valeur reste
 * constante le long d'un rayon partant de la lampe, donc les lames divergent en
 * éventail à mesure qu'elles s'éloignent, exactement comme de vrais rais. Un
 * motif calculé sur la position du monde donnerait des tranches parallèles,
 * qu'on lirait aussitôt comme une texture plaquée.
 *
 * La fonction atan n'est pas gratuite, mais il n'est évalué qu'aux pas où il y a de la
 * matière à éclairer — c'est-à-dire rarement, la fumée étant creuse.
 */
float lames(vec3 versPoint) {
  float elevation = atan(versPoint.y, length(versPoint.xz));

  // Trois lames et demie par radian, soit des rais d'une quinzaine de degrés.
  //
  // **C'est le réglage qui a demandé le plus d'essais, et la première intuition
  // était la mauvaise.** À onze lames par radian — un motif fin, qui paraissait
  // plus crédible — on ne voyait rien du tout : un rayon de caméra traverse le
  // volume en diagonale et coupe une dizaine de lames en chemin, dont il
  // accumule la moyenne. Un motif fin *s'auto-annule* le long du rayon. Seuls
  // des rais larges, dont le rayon ne coupe qu'un ou deux exemplaires, laissent
  // une modulation visible dans l'image finale.
  float principal = sin(elevation * 3.4 + uPhaseLames);
  // Une seconde fréquence, non multiple de la première, casse la régularité :
  // une charpente n'est jamais parfaitement régulière, et l'œil le sait.
  float irregulier = sin(elevation * 1.1 - uPhaseLames * 0.4);

  float motif = 0.5 + 0.5 * principal * (0.72 + 0.28 * irregulier);

  // La courbe décide de la largeur du rai : au cube, les bandes claires
  // s'affinent nettement et les zones d'ombre s'élargissent — une lame de
  // lumière, pas une ondulation.
  motif = motif * motif * motif;

  // Deux choses à la fois. Le plancher, d'abord : jamais zéro, sinon l'ombre
  // entre deux rais découperait la fumée en tranches franches, alors qu'en
  // réalité elle reste éclairée par diffusion. Le facteur, ensuite : la mise au
  // cube ci-dessus fait tomber la moyenne du motif à 0,3, ce qui éteindrait la
  // source d'un tiers à chaque fois qu'on resserre les lames. Le facteur 1,55
  // rend cette moyenne à 0,55 — inchangée — tout en laissant les crêtes
  // dépasser 1. Resserrer les rais ne change donc plus l'exposition générale :
  // ça ne fait que déplacer la lumière des creux vers les crêtes, ce qui est
  // exactement ce qu'on veut pouvoir régler sans tout redoser derrière.
  return 0.06 + 1.62 * motif;
}

// ---------------------------------------------------- intersection boîte ----

/** Entrée et sortie du rayon dans la boîte, ou (-1, -1) s'il la manque. */
vec2 traverseeBoite(vec3 origine, vec3 direction) {
  vec3 inv = 1.0 / direction;
  vec3 t0 = (-BOITE - origine) * inv;
  vec3 t1 = ( BOITE - origine) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float entree = max(max(tmin.x, tmin.y), tmin.z);
  float sortie = min(min(tmax.x, tmax.y), tmax.z);
  return sortie > max(entree, 0.0) ? vec2(max(entree, 0.0), sortie) : vec2(-1.0);
}

// -------------------------------------------------------------- rendu ------

void main() {
  vec2 uv = (vUv * 2.0 - 1.0);
  uv.x *= uResolution.x / uResolution.y;

  // Rayon primaire. La focale vient de la caméra de perspective plutôt que
  // d'une constante : elle se resserre avec le défilement, et la fumée doit se
  // resserrer avec elle.
  vec3 direction = normalize(uOrientationCamera * vec3(uv, -uFocale));
  vec3 origine = uPositionCamera;

  vec2 bornes = traverseeBoite(origine, direction);

  vec3 couleur = vec3(0.0);
  float transmittance = 1.0;

  if (bornes.x >= 0.0) {
    float pas = (bornes.y - bornes.x) / float(PAS);

    // Décalage aléatoire du point de départ : sans lui, les pas réguliers
    // dessinent des bandes concentriques très visibles dans les dégradés.
    float gigue = hash(vec3(gl_FragCoord.xy, uTemps * 0.05));
    float t = bornes.x + gigue * pas;

    for (int i = 0; i < PAS; i++) {
      if (transmittance < 0.02) break;

      vec3 p = origine + direction * t;

      // Géométrie de l'éclairage, calculée à **chaque** pas et non plus
      // seulement dans la matière. C'est le changement qui fait apparaître les
      // rais : un rai de lumière n'est pas de la fumée éclairée, c'est de
      // l'air éclairé. Tant qu'on n'éclairait que les nappes, le faisceau
      // n'existait que là où il y avait déjà quelque chose à voir — c'est-à-dire
      // nulle part, la fumée étant creuse aux trois quarts.
      vec3 versLumiere = uPositionLumiere - p;
      float distanceLumiere = length(versLumiere);
      versLumiere /= max(distanceLumiere, 0.001);

      // Atténuation géométrique : la lumière faiblit avec la distance.
      float eclairage = 1.0 / (1.0 + distanceLumiere * distanceLumiere * 0.006);
      float decoupe = lames(-versLumiere);
      float env = enveloppe(p);

      // Diffusion vers l'avant : ce qui est éclairé de dos rayonne plus.
      float phase = 0.55 + 0.45 * pow(max(dot(direction, versLumiere), 0.0), 3.0);

      // Le rai lui-même. Borné par l'enveloppe, sinon la boîte se découperait
      // franchement dans le noir et tout le travail d'estompage serait perdu —
      // mais par sa racine carrée, et non par elle : l'enveloppe est taillée
      // pour de la fumée, qui est basse et dense, alors qu'un rai traverse
      // aussi l'air vide au-dessus. Prise telle quelle, elle coupait les rais à
      // mi-hauteur et il ne restait qu'une lueur au ras du sol.
      couleur += uCouleurLumiere * (eclairage * decoupe * sqrt(env) * phase * DIFFUSION_AIR * pas)
                 * transmittance;

      float d = densite(p, env);

      if (d > 0.001) {
        #if ECLAIRAGE_VOLUMETRIQUE
          // Seconde marche vers la source : c'est elle qui creuse l'ombre
          // portée d'une nappe sur celle de derrière. Deux échantillons
          // espacés suffisent, en densité approchée.
          float occultation =
            densiteGrossiere(p + versLumiere * 1.3) +
            densiteGrossiere(p + versLumiere * 3.1);
          eclairage *= exp(-occultation * 1.1);
        #endif

        eclairage *= decoupe;

        // Contre-jour froid, sans position ni marche d'ombre : une direction et
        // un produit scalaire. Il ne sert pas à éclairer mais à *séparer* —
        // sans lui, toute l'image est ambrée et la fumée non éclairée tombe
        // dans un gris neutre qui ne ressemble à rien. Avec lui, l'ombre est
        // bleue et la lumière est chaude, ce qui est la grammaire de base de
        // l'image nocturne.
        float froid = 0.35 + 0.65 * max(dot(normalize(p), uDirectionFroide), 0.0);

        vec3 apport =
          (uCouleurAmbiante + uCouleurFroide * froid + uCouleurLumiere * eclairage * phase)
          * d * pas;
        couleur += apport * transmittance;
        transmittance *= exp(-d * pas * 1.15);
      }

      t += pas;
    }
  }

  // Halo du faisceau lui-même, visible même là où la fumée est absente. Il est
  // strié par le même gobo : une source découpée dont le halo ne le serait pas
  // trahirait le procédé au premier coup d'œil.
  vec3 versSource = normalize(uPositionLumiere - origine);
  float alignement = max(dot(direction, versSource), 0.0);
  float halo = pow(alignement, 24.0);
  couleur += uCouleurLumiere * halo * lames(-versSource * 6.0) * 0.09;

  couleur *= uIntensite;

  // Le fond du site est presque noir : l'alpha porte la fumée, pas une
  // couleur de fond opaque qui masquerait la grille CSS en dessous.
  float alpha = clamp(1.0 - transmittance, 0.0, 1.0) * 0.5 + length(couleur) * 0.10;
  gl_FragColor = vec4(couleur, clamp(alpha, 0.0, 1.0));
}
`
