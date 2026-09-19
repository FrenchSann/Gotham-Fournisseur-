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
  return bord.x * bord.y * bord.z * smoothstep(BOITE.y, -BOITE.y * 0.6, p.y);
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
float densite(vec3 p) {
  vec3 hors = abs(p) - BOITE;
  if (max(hors.x, max(hors.y, hors.z)) > 0.0) return 0.0;

  float n = fbm(p * 0.55 + derive());

  // Le seuil sculpte la fumée : trop haut, elle disparaît ; trop bas, elle
  // remplit tout l'écran d'un voile gris.
  return max(0.0, n - 0.30) * enveloppe(p) * 3.0;
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

  // Rayon primaire. 1.6 correspond a un champ de vision d'environ 64 degres.
  vec3 direction = normalize(uOrientationCamera * vec3(uv, -1.6));
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
      float d = densite(p);

      if (d > 0.001) {
        vec3 versLumiere = normalize(uPositionLumiere - p);
        float distanceLumiere = length(uPositionLumiere - p);

        // Atténuation géométrique : la lumière faiblit avec la distance.
        float eclairage = 1.0 / (1.0 + distanceLumiere * distanceLumiere * 0.006);

        #if ECLAIRAGE_VOLUMETRIQUE
          // Seconde marche vers la source : c'est elle qui crée les rais et
          // l'ombre portée d'une nappe sur celle de derrière. Deux
          // échantillons espacés suffisent, en densité approchée.
          float occultation =
            densiteGrossiere(p + versLumiere * 1.3) +
            densiteGrossiere(p + versLumiere * 3.1);
          eclairage *= exp(-occultation * 1.1);
        #endif

        // Diffusion vers l'avant : la fumée éclairée de dos rayonne plus.
        float phase = 0.55 + 0.45 * pow(max(dot(direction, versLumiere), 0.0), 3.0);

        vec3 apport = (uCouleurAmbiante + uCouleurLumiere * eclairage * phase) * d * pas;
        couleur += apport * transmittance;
        transmittance *= exp(-d * pas * 1.15);
      }

      t += pas;
    }
  }

  // Halo du faisceau lui-même, visible même là où la fumée est absente.
  vec3 versSource = normalize(uPositionLumiere - origine);
  float alignement = max(dot(direction, versSource), 0.0);
  couleur += uCouleurLumiere * pow(alignement, 24.0) * 0.06;

  couleur *= uIntensite;

  // Le fond du site est presque noir : l'alpha porte la fumée, pas une
  // couleur de fond opaque qui masquerait la grille CSS en dessous.
  float alpha = clamp(1.0 - transmittance, 0.0, 1.0) * 0.9 + length(couleur) * 0.12;
  gl_FragColor = vec4(couleur, clamp(alpha, 0.0, 1.0));
}
`
