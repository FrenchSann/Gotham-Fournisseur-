/**
 * Étalonnage de l'image.
 *
 * La cible basse résolution qui contient la fumée n'est pas simplement étirée
 * à l'écran : elle passe par cette passe, qui fait à peu près ce que fait un
 * objectif suivi d'un étalonnage — halo autour des sources, traînée
 * anamorphique, frange chromatique sur les bords, vignettage, courbe filmique,
 * grain. Chacun de ces défauts est un défaut d'appareil photo, et c'est
 * exactement pour ça qu'on les ajoute : une image *trop* propre est lue comme
 * une image de synthèse.
 *
 * Tout tient en une passe et onze lectures de texture. C'est beaucoup moins
 * cher qu'il n'y paraît : la cible fait moins d'un dixième de la surface de
 * l'écran (échelle 0,30), elle tient donc entièrement dans le cache de
 * texture du GPU, où une lecture coûte une fraction de ce que coûte un accès
 * mémoire.
 *
 * ## La composition est en alpha prémultiplié, et ce n'est pas un détail
 *
 * Le rendu volumétrique écrit `couleur × alpha` dans la cible — c'est ce que
 * produit le mélange standard au-dessus d'un fond transparent. La version
 * précédente réaffichait cette cible avec un `MeshBasicMaterial` transparent,
 * qui multipliait *une seconde fois* par alpha : la fumée était systématiquement
 * plus sombre que ce que le shader avait calculé, et on compensait sans le
 * savoir en montant l'intensité.
 *
 * Ici la sortie est déclarée prémultipliée (`premultipliedAlpha`), le mélange
 * devient `lumière + fond × (1 - couverture)`, et c'est la formule juste : la
 * fumée *émet* de la lumière et *occulte* ce qui est derrière. Les deux étaient
 * confondus, ils sont maintenant séparés.
 */

export const vertexShaderComposition = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const fragmentShaderComposition = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uFumee;
/** Taille d'un texel de la cible : le rayon du halo s'exprime en texels. */
uniform vec2  uTexel;
uniform float uTemps;
/** 1 quand le grain est fondu ici, 0 quand le calque 2D s'en charge encore. */
uniform float uGrain;
uniform float uFormat;

// Ambre du faisceau et bleu froid des hautes lumières : c'est le couple
// chaud/froid qui fait lire une image comme étalonnée plutôt que teintée.
const vec3 CHAUD = vec3(1.00, 0.74, 0.44);
const vec3 FROID = vec3(0.42, 0.58, 1.00);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/**
 * Courbe filmique (approximation ACES de Narkowicz).
 *
 * Sans elle, les hautes lumières du faisceau écrêtent à plat sur du blanc :
 * un dégradé ambré qui s'arrête net, la signature visuelle du rendu non
 * étalonné. La courbe écrase progressivement le haut de la plage et laisse
 * les valeurs basses presque intactes, là où vit toute la fumée.
 */
vec3 filmique(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 centre = vUv - 0.5;
  // Correction du format : sans elle, le vignettage et l'aberration seraient
  // des ellipses aplaties sur un écran large, et se verraient comme tels.
  vec2 centreCorrige = vec2(centre.x * uFormat, centre.y);
  float r2 = dot(centreCorrige, centreCorrige) * 2.0;

  // --- Optique ------------------------------------------------------------

  // Distorsion en barillet, très faible. On ne doit pas la voir ; on doit
  // seulement sentir que les bords de l'image ne sont pas parfaitement plans.
  vec2 uv = 0.5 + centre * (1.0 + DISTORSION * r2);

  // Frange chromatique radiale : nulle au centre, croissante vers les bords,
  // comme sur un objectif réel. C'est le défaut le plus reconnaissable.
  vec2 frange = centre * ABERRATION * r2;
  vec4 base = texture2D(uFumee, uv);
  vec3 lumiere = vec3(
    texture2D(uFumee, uv + frange).r,
    base.g,
    texture2D(uFumee, uv - frange).b
  );
  float couverture = base.a;

  // --- Halo ---------------------------------------------------------------

  // Quatre lectures en croix dans une cible déjà dix fois plus petite que
  // l'écran : le rayon effectif est large sans qu'on ait à payer un vrai flou
  // gaussien en plusieurs passes.
  vec2 d = uTexel * RAYON_HALO;
  vec3 halo =
      texture2D(uFumee, uv + vec2( d.x, 0.0)).rgb
    + texture2D(uFumee, uv + vec2(-d.x, 0.0)).rgb
    + texture2D(uFumee, uv + vec2(0.0,  d.y)).rgb
    + texture2D(uFumee, uv + vec2(0.0, -d.y)).rgb;
  halo *= 0.25;

  lumiere += halo * CHAUD * INTENSITE_HALO;

  #if TRAINEE_ANAMORPHIQUE
    // Traînée horizontale : l'objectif anamorphique étire les sources
    // ponctuelles sur l'axe large. C'est le cliché du cinéma, et il fonctionne
    // parce qu'aucun autre média ne produit cette forme-là.
    vec2 e = vec2(uTexel.x * ETIREMENT_TRAINEE, 0.0);
    vec3 trainee =
        texture2D(uFumee, uv + e).rgb * 0.55
      + texture2D(uFumee, uv - e).rgb * 0.55
      + texture2D(uFumee, uv + e * 2.4).rgb * 0.25
      + texture2D(uFumee, uv - e * 2.4).rgb * 0.25;
    lumiere += trainee * mix(FROID, CHAUD, 0.35) * INTENSITE_TRAINEE;
  #endif

  // --- Étalonnage ---------------------------------------------------------

  // Séparation des tons : hautes lumières vers l'ambre, basses vers le bleu
  // d'acier. Appliquée avant la courbe, comme dans une vraie chaîne.
  float niveau = clamp(dot(lumiere, vec3(0.2126, 0.7152, 0.0722)) * 6.0, 0.0, 1.0);
  lumiere *= mix(mix(FROID, vec3(1.0), 0.72), mix(CHAUD, vec3(1.0), 0.45), niveau);

  lumiere = filmique(lumiere * EXPOSITION);

  // Vignettage : l'œil est conduit au centre sans qu'il s'en aperçoive.
  float vignette = 1.0 - VIGNETTE * r2 * r2;
  lumiere *= vignette;
  couverture *= vignette;

  // --- Grain --------------------------------------------------------------

  if (uGrain > 0.5) {
    // Douze images par seconde, exactement comme le calque 2D qu'il remplace :
    // le grain doit *sauter* comme une pellicule. Le plancher de temps est pris
    // ici plutôt qu'en JavaScript pour que la cadence du grain reste
    // indépendante de celle du rendu.
    float image = floor(uTemps * 12.0);
    float bruit = hash12(gl_FragCoord.xy + image * 71.7) - 0.5;

    // Modulation plutôt qu'addition : un grain qui multiplie la lumière suit la
    // matière — fort dans la fumée, discret dans le noir — ce que fait une
    // émulsion. Un grain additif, lui, pose un voile uniforme sur toute l'image.
    lumiere *= 1.0 + bruit * 0.16;
    // La part additive, minuscule, existe pour que le noir absolu ne soit
    // jamais parfaitement lisse : c'est ce qui l'empêche de paraître numérique.
    lumiere += bruit * 0.006;
    couverture = max(couverture, abs(bruit) * 0.05);
  }

  // Sortie prémultipliée, et l'alpha n'est pas seulement la couverture.
  //
  // **Le piège coûte une soirée à qui ne le connaît pas.** Dans un canvas
  // prémultiplié — ce que sont tous les canvas WebGL par défaut — le
  // compositeur du navigateur tient pour acquis que chaque composante est
  // inférieure ou égale à l'alpha, et il écrête celles qui ne le sont pas. Une
  // fumée qui émet 0,35 de lumière derrière une couverture de 0,05 sortait donc
  // à 0,05 : l'écran restait noir alors que le shader calculait parfaitement, et
  // aucune console n'avait rien à signaler. On monte le réglage, rien ne bouge,
  // et on conclut que le shader est faux.
  //
  // L'alpha porte donc les deux à la fois : ce qui est occulté, et ce qui est
  // émis. C'est cohérent physiquement — une nappe qui brille cache aussi ce
  // qu'il y a derrière — et c'est la seule forme que le compositeur respecte.
  lumiere = max(lumiere, 0.0);
  float alpha = max(couverture, max(max(lumiere.r, lumiere.g), lumiere.b));
  gl_FragColor = vec4(lumiere, clamp(alpha, 0.0, 1.0));
}
`
