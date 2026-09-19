import * as THREE from 'three'

/**
 * Éclairage des caisses du catalogue.
 *
 * **Pourquoi aucune carte d'environnement**, alors que c'est la façon normale
 * de rendre du métal.
 *
 * Deux tentatives, toutes deux mesurées :
 *
 *   1. `RoomEnvironment` passé au `PMREMGenerator`, la solution recommandée
 *      par three.js : **2 secondes** de thread principal bloqué au premier
 *      affichage.
 *   2. Une image équirectangulaire minuscule, écrite à la main, passée au même
 *      générateur : toujours **2 secondes**. Le coût ne vient pas de la
 *      source, il vient du générateur — la chaîne de flou par niveau de
 *      rugosité travaille sur des cibles de taille fixe, quelle que soit
 *      l'image d'entrée.
 *
 * On s'en passe donc entièrement, et on compense par trois sources orientées.
 * Le métal obtenu est brossé et mat plutôt que poli et réfléchissant — ce qui
 * se trouve être plus juste : une caisse de transport militaire n'est pas
 * chromée. La bonne solution technique et la bonne solution esthétique
 * coïncident, ce qui n'arrive pas si souvent.
 *
 * Sans environnement, `metalness` doit rester modéré : à 0,9 un matériau
 * n'ayant rien à réfléchir rend un noir plat.
 */

export interface Eclairage {
  lumieres: THREE.Light[]
  detruire: () => void
}

export function creerEclairage(): Eclairage {
  // Source principale, en haut à droite : c'est elle qui sculpte le volume et
  // détache les renforts d'angle du corps.
  const cle = new THREE.DirectionalLight(0xffffff, 2.6)
  cle.position.set(2.5, 3.5, 4)

  // Contre-jour ambré, derrière et à gauche : il pose un liseré chaud sur les
  // arêtes arrière et décolle l'objet du fond. Sans lui, la caisse se fond
  // dans la carte.
  const contre = new THREE.DirectionalLight(0xc6964f, 3.4)
  contre.position.set(-3, 1.2, -3.5)

  // Remplissage froid par le bas, très faible : il empêche les faces
  // inférieures de tomber dans le noir absolu, là où une carte
  // d'environnement aurait apporté un peu de ciel.
  const remplissage = new THREE.HemisphereLight(0x8fa3bd, 0x0a0c10, 1.15)

  const lumieres = [cle, contre, remplissage]

  return {
    lumieres,
    detruire() {
      for (const lumiere of lumieres) lumiere.dispose?.()
    },
  }
}
