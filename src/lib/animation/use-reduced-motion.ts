'use client'

import { creerSourceMedia, useSourceMedia } from './media'

/**
 * Détection de `prefers-reduced-motion`, source de vérité unique du site.
 *
 * Tout ce qui bouge passe par ce hook. Une seule règle à un seul endroit :
 * si dix composants interrogeaient `matchMedia` chacun de leur côté, il s'en
 * trouverait forcément un pour oublier, et c'est celui-là qui donnerait la
 * nausée à quelqu'un.
 *
 * La valeur par défaut est `true` — « mouvement réduit » — côté serveur comme
 * quand `matchMedia` est indisponible. On n'anime pas tant qu'on ne sait pas.
 */
export const MOUVEMENT_REDUIT = creerSourceMedia('(prefers-reduced-motion: reduce)', true)

/**
 * `true` quand l'utilisateur a demandé moins de mouvement.
 *
 * Réagit en direct au changement de préférence système, sans rechargement :
 * quelqu'un qui active le réglage parce que le site le gêne doit être soulagé
 * immédiatement, pas au prochain chargement de page.
 */
export function useMouvementReduit(): boolean {
  return useSourceMedia(MOUVEMENT_REDUIT)
}
