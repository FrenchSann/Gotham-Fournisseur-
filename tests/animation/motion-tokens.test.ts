import { describe, expect, it } from 'vitest'
import {
  ATMOSPHERE,
  BUDGET_IMAGE_MS,
  CYCLES,
  FPS,
  LENIS_LERP,
  MACHINE,
  SEUIL_MOBILE,
} from '@/lib/animation/motion-tokens'

/**
 * Ces tests ne vérifient pas que du code fonctionne — ils verrouillent une
 * décision de design. La règle des deux registres (SPEC.md § 2 bis) est ce qui
 * empêche le site de virer au sapin de Noël, et elle se perd facilement au fil
 * des retouches. Si quelqu'un allonge une transition d'interface à 600 ms ou
 * accélère la brume à 2 s, la suite échoue et la discussion a lieu.
 */
describe('registres de vitesse', () => {
  it("garde l'interface sous 200 ms", () => {
    // Au-delà, une interface paraît cassée plutôt que fluide.
    expect(MACHINE.court).toBeLessThanOrEqual(0.2)
    expect(MACHINE.normal).toBeLessThanOrEqual(0.2)
    expect(MACHINE.long).toBeLessThanOrEqual(0.2)
  })

  it("garde l'ambiance au-dessus de 800 ms", () => {
    // En dessous, une ambiance paraît cheap.
    expect(ATMOSPHERE.court).toBeGreaterThanOrEqual(0.8)
    expect(ATMOSPHERE.normal).toBeGreaterThanOrEqual(0.8)
  })

  it('ne laisse pas les deux registres se chevaucher', () => {
    // C'est le contraste entre les deux qui fait l'effet. S'ils se rejoignent,
    // il n'y a plus de contraste, juste un site qui bouge mollement.
    expect(ATMOSPHERE.court).toBeGreaterThan(MACHINE.long * 2)
  })
})

describe('cycles de fond', () => {
  it('reste sur des boucles lentes', () => {
    // Une boucle courte se remarque, et une boucle qu'on remarque casse
    // l'illusion d'une atmosphère continue.
    for (const [nom, secondes] of Object.entries(CYCLES)) {
      expect(secondes, `cycle ${nom}`).toBeGreaterThanOrEqual(8)
    }
  })
})

describe('budget de performance', () => {
  it('cible 30 fps pour le fond, pas 60', () => {
    // La brume et le projecteur dérivent trop lentement pour que l'œil voie la
    // différence. On rend la moitié des images pour rien si on monte à 60.
    expect(FPS.fond).toBe(30)
  })

  it('garde le grain à 12 fps', () => {
    // Le grain doit sauter comme une pellicule. À 60 fps il devient un voile
    // gris uniforme et perd tout son intérêt.
    expect(FPS.grain).toBeLessThanOrEqual(15)
  })

  it('tient le budget par image sous la limite des 30 fps', () => {
    // 30 fps laisse 33 ms par image. 8 ms est notre part ; le reste appartient
    // au navigateur, à GSAP et au rendu du contenu.
    expect(BUDGET_IMAGE_MS).toBeLessThan(1000 / FPS.fond)
  })
})

describe('constantes de réglage', () => {
  it("garde l'inertie Lenis dans une plage utilisable", () => {
    // Trop bas : le défilement flotte et donne la nausée.
    // Trop haut : l'inertie disparaît et Lenis ne sert plus à rien.
    expect(LENIS_LERP).toBeGreaterThan(0.04)
    expect(LENIS_LERP).toBeLessThan(0.2)
  })

  it('aligne le seuil mobile sur le point de rupture Tailwind', () => {
    expect(SEUIL_MOBILE).toBe(768)
  })
})
