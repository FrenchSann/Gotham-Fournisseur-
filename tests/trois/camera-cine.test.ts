import { describe, expect, it } from 'vitest'
import { poserCamera, type EntreeCamera } from '@/lib/trois/camera-cine'

const REPOS: EntreeCamera = { temps: 0, pointeurX: 0, pointeurY: 0, defilement: 0 }

/** Balaie une minute de mouvement, pointeur immobile. */
function balayer(defilement = 0, pas = 0.13, n = 460) {
  return Array.from({ length: n }, (_, i) => poserCamera({ ...REPOS, temps: i * pas, defilement }))
}

describe('déterminisme', () => {
  it('rend la même pose pour la même entrée', () => {
    // La caméra est rejouée par le profileur et par les captures d'écran : une
    // pose qui dépendrait d'un état caché rendrait toute comparaison inutile.
    const entree = { temps: 12.5, pointeurX: 0.4, pointeurY: -0.2, defilement: 0.3 }
    expect(poserCamera(entree)).toEqual(poserCamera(entree))
  })
})

describe('travelling', () => {
  it('avance et descend quand on descend dans la page', () => {
    const haut = poserCamera(REPOS)
    const bas = poserCamera({ ...REPOS, defilement: 1 })

    expect(bas.z).toBeLessThan(haut.z)
    expect(bas.y).toBeLessThan(haut.y)
  })

  it('resserre la focale vers le bas de page', () => {
    // Focale plus longue = plans écrasés les uns sur les autres. C'est ce qui
    // donne l'impression que le décor du fond se rapproche.
    expect(poserCamera({ ...REPOS, defilement: 1 }).fov).toBeLessThan(poserCamera(REPOS).fov)
  })

  it('n’entre jamais dans la boîte de fumée', () => {
    // La boîte s'arrête à z = 7 (voir le shader de volume). Une caméra à
    // l'intérieur remplit l'écran de matière dense et le texte du site passe
    // devant une soupe grise.
    for (const pose of [...balayer(0), ...balayer(0.5), ...balayer(1)]) {
      expect(pose.z).toBeGreaterThan(7)
    }
  })

  it('ignore un défilement hors bornes', () => {
    // iOS renvoie des valeurs négatives en sur-défilement élastique.
    expect(poserCamera({ ...REPOS, defilement: -3 })).toEqual(poserCamera(REPOS))
    expect(poserCamera({ ...REPOS, defilement: 9 })).toEqual(
      poserCamera({ ...REPOS, defilement: 1 })
    )
  })
})

describe('flottement à l’épaule', () => {
  it('reste imperceptible', () => {
    // Au-delà de quelques centièmes d'unité, la caméra ne flotte plus : elle
    // tremble, et le site donne le mal de mer.
    const poses = balayer()
    const ecartX = Math.max(...poses.map((p) => Math.abs(p.x - poses[0].x)))
    expect(ecartX).toBeLessThan(1.2)

    for (const pose of poses) {
      expect(Math.abs(pose.roulis)).toBeLessThan(0.01)
    }
  })

  it('ne se répète pas sur une minute', () => {
    // Trois sinusoïdes de rapports irrationnels : si quelqu'un les remplace un
    // jour par une seule, le motif redevient périodique et ce test tombe.
    const poses = balayer()
    const uniques = new Set(poses.map((p) => p.x.toFixed(6)))
    expect(uniques.size).toBe(poses.length)
  })

  it('bouge en permanence, même page immobile', () => {
    // La promesse du spec : « rien n'est totalement immobile à l'écran ».
    const a = poserCamera({ ...REPOS, temps: 3 })
    const b = poserCamera({ ...REPOS, temps: 3.2 })
    expect(a.x).not.toBe(b.x)
    expect(a.y).not.toBe(b.y)
  })
})

describe('parallaxe', () => {
  it('suit le pointeur en x et le contrarie en y', () => {
    // Inversion volontaire sur l'axe vertical : c'est ce que fait une tête de
    // trépied qu'on pousse, et ça donne le sentiment de regarder *autour* de
    // l'objet plutôt que de le déplacer.
    const gauche = poserCamera({ ...REPOS, pointeurX: -1 })
    const droite = poserCamera({ ...REPOS, pointeurX: 1 })
    expect(droite.x).toBeGreaterThan(gauche.x)

    const haut = poserCamera({ ...REPOS, pointeurY: -1 })
    const bas = poserCamera({ ...REPOS, pointeurY: 1 })
    expect(bas.y).toBeLessThan(haut.y)
  })
})
