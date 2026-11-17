/** Index of a player in a two-player game: 0 = Spieler A (Zeile), 1 = Spieler B (Spalte). */
export type Player = 0 | 1;

export const PLAYERS: readonly Player[] = [0, 1];

export const other = (p: Player): Player => (p === 0 ? 1 : 0);

/**
 * Contract every game module implements. All functions are pure:
 * the same params, seed and action sequence always produce the same state.
 * This is what allows a later network layer to sync only the action log.
 */
export interface GameDefinition<P, S, A> {
  id: string;
  init(params: P, seed: number): S;
  /** Returns the same state object for illegal actions. */
  reduce(state: S, action: A): S;
  isFinished(state: S): boolean;
}
