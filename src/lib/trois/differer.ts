/**
 * Attendre un temps mort du navigateur avant de monter la 3D.
 *
 * Même réduit, le démarrage de la scène coûte environ une seconde de travail
 * processeur : analyse de three.js, compilation du shader de raymarching,
 * génération de la carte de reflets. Ce coût est incompressible — mais il est
 * *déplaçable*.
 *
 * Le faire pendant le chargement, c'est retarder le moment où la page devient
 * lisible et cliquable. Le faire après, c'est une seconde pendant laquelle le
 * visiteur lit déjà le titre et peut déjà cliquer. Le temps total est le même ;
 * l'expérience n'a rien à voir.
 *
 * `requestIdleCallback` n'existe pas sur Safari, d'où le repli. Le délai
 * maximal garantit que la 3D finit par arriver même sur une page qui ne
 * devient jamais complètement inactive.
 */

const DELAI_MAX_MS = 2500
const DELAI_REPLI_MS = 1200

export function auTempsMort(action: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const idle = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
  ).requestIdleCallback

  if (typeof idle === 'function') {
    const id = idle(action, { timeout: DELAI_MAX_MS })
    return () => {
      ;(window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id)
    }
  }

  const id = window.setTimeout(action, DELAI_REPLI_MS)
  return () => window.clearTimeout(id)
}
