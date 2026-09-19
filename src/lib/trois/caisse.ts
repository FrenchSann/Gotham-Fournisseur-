import * as THREE from 'three'

/**
 * Caisse de transport métallique — l'objet 3D qui représente un pack.
 *
 * Construite par le code plutôt qu'importée d'un fichier modèle : une caisse
 * est une boîte avec des renforts d'angle et deux loquets, soit une quinzaine
 * de primitives. Un `.glb` pèserait des centaines de kilooctets, demanderait un
 * chargeur, un état de chargement et une gestion d'échec, pour une forme qui
 * s'écrit en cinquante lignes. Et la teinte d'accent change par pack, ce qu'un
 * modèle figé ne permettrait pas sans retouche.
 *
 * Les proportions comptent plus que le détail : c'est la silhouette — large,
 * basse, aux angles renforcés — qui dit « caisse militaire », pas le nombre
 * de vis.
 */

const CORPS = { l: 1.75, h: 1.05, p: 1.15 }
const EPAISSEUR_RENFORT = 0.075

export interface Caisse {
  groupe: THREE.Group
  detruire: () => void
}

export function creerCaisse(teinte: string): Caisse {
  const groupe = new THREE.Group()
  const aJeter: (THREE.BufferGeometry | THREE.Material)[] = []

  function suivre<T extends THREE.BufferGeometry | THREE.Material>(x: T): T {
    aJeter.push(x)
    return x
  }

  // Métal sombre et mat du corps : il ne doit pas voler la vedette au texte
  // de la carte, seulement accrocher la lumière sur ses arêtes.
  //
  // `metalness` volontairement modéré : sans carte d'environnement, un
  // matériau très métallique n'a rien à réfléchir et rend un noir plat.
  const metalSombre = suivre(
    new THREE.MeshStandardMaterial({
      color: 0x1c2027,
      metalness: 0.45,
      roughness: 0.58,
    })
  )

  // Renforts à la teinte du pack : c'est le seul endroit coloré de l'objet,
  // et c'est ce qui distingue les six caisses les unes des autres.
  const metalAccent = suivre(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(teinte),
      metalness: 0.5,
      roughness: 0.38,
    })
  )

  const metalClair = suivre(
    new THREE.MeshStandardMaterial({
      color: 0x3a4149,
      metalness: 0.45,
      roughness: 0.45,
    })
  )

  // --- Corps ---------------------------------------------------------------

  const geoCorps = suivre(new THREE.BoxGeometry(CORPS.l, CORPS.h, CORPS.p))
  groupe.add(new THREE.Mesh(geoCorps, metalSombre))

  // Panneau en creux sur les deux grandes faces : une simple plaque
  // légèrement en retrait suffit à casser l'aspect « cube ».
  const geoPanneau = suivre(new THREE.BoxGeometry(CORPS.l * 0.72, CORPS.h * 0.62, 0.02))
  for (const signe of [1, -1]) {
    const panneau = new THREE.Mesh(geoPanneau, metalClair)
    panneau.position.z = (signe * CORPS.p) / 2
    groupe.add(panneau)
  }

  // --- Renforts d'angle ----------------------------------------------------

  // Trois barres par coin, une par axe : c'est ce qui donne la lecture
  // « angles blindés » sans modéliser une vraie ferrure.
  const geoRenfortX = suivre(
    new THREE.BoxGeometry(CORPS.l * 0.22, EPAISSEUR_RENFORT, EPAISSEUR_RENFORT)
  )
  const geoRenfortY = suivre(
    new THREE.BoxGeometry(EPAISSEUR_RENFORT, CORPS.h * 0.3, EPAISSEUR_RENFORT)
  )
  const geoRenfortZ = suivre(
    new THREE.BoxGeometry(EPAISSEUR_RENFORT, EPAISSEUR_RENFORT, CORPS.p * 0.28)
  )

  const dx = CORPS.l / 2
  const dy = CORPS.h / 2
  const dz = CORPS.p / 2

  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      for (const sz of [1, -1]) {
        const bx = new THREE.Mesh(geoRenfortX, metalAccent)
        bx.position.set(sx * (dx - CORPS.l * 0.11), sy * dy, sz * dz)
        groupe.add(bx)

        const by = new THREE.Mesh(geoRenfortY, metalAccent)
        by.position.set(sx * dx, sy * (dy - CORPS.h * 0.15), sz * dz)
        groupe.add(by)

        const bz = new THREE.Mesh(geoRenfortZ, metalAccent)
        bz.position.set(sx * dx, sy * dy, sz * (dz - CORPS.p * 0.14))
        groupe.add(bz)
      }
    }
  }

  // --- Loquets -------------------------------------------------------------

  const geoLoquet = suivre(new THREE.BoxGeometry(0.2, 0.13, 0.05))
  for (const sx of [-1, 1]) {
    const loquet = new THREE.Mesh(geoLoquet, metalAccent)
    loquet.position.set(sx * CORPS.l * 0.27, -CORPS.h * 0.04, dz + 0.02)
    groupe.add(loquet)
  }

  // --- Poignées latérales --------------------------------------------------

  const geoPoignee = suivre(new THREE.TorusGeometry(0.13, 0.022, 6, 14, Math.PI))
  for (const sx of [-1, 1]) {
    const poignee = new THREE.Mesh(geoPoignee, metalClair)
    poignee.position.set(sx * dx, 0, 0)
    poignee.rotation.y = Math.PI / 2
    poignee.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2
    groupe.add(poignee)
  }

  // --- Ligne de séparation du couvercle ------------------------------------

  const geoJoint = suivre(new THREE.BoxGeometry(CORPS.l * 1.005, 0.018, CORPS.p * 1.005))
  const joint = new THREE.Mesh(geoJoint, metalAccent)
  joint.position.y = CORPS.h * 0.17
  groupe.add(joint)

  function detruire() {
    for (const ressource of aJeter) ressource.dispose()
  }

  return { groupe, detruire }
}
