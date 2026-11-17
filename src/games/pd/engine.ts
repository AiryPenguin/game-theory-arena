import { randomFor } from '../../core/rng';
import type { GameDefinition, Player } from '../../core/types';
import { MAX_ROUNDS_DISCOUNTED, stagePayoffs, type PDMove, type PDParams } from './params';

export interface PDRound {
  moves: [PDMove, PDMove];
  payoffs: [number, number];
}

export type PDEndReason = 'oneShot' | 'roundsCompleted' | 'randomStop' | 'cap';

export interface PDState {
  params: PDParams;
  seed: number;
  history: PDRound[];
  /** Hidden simultaneous moves of the current round. */
  pending: [PDMove | null, PDMove | null];
  status: 'playing' | 'finished';
  endReason: PDEndReason | null;
}

/**
 * `round` = number of completed rounds when the move was made. Commits for another round are
 * ignored, which makes actions idempotent (double effects, duplicated network messages).
 */
export type PDAction = { type: 'commit'; player: Player; move: PDMove; round: number };

export function createPDState(params: PDParams, seed: number): PDState {
  return { params, seed, history: [], pending: [null, null], status: 'playing', endReason: null };
}

/** Does the game end after `completed` rounds? Pure: random stop is derived from the seed. */
export function endAfter(params: PDParams, seed: number, completed: number): PDEndReason | null {
  switch (params.mode) {
    case 'oneShot':
      return 'oneShot';
    case 'finite':
      return completed >= params.rounds ? 'roundsCompleted' : null;
    case 'discounted':
      if (randomFor(seed, 'pd-continue', completed) >= params.delta) return 'randomStop';
      return completed >= MAX_ROUNDS_DISCOUNTED ? 'cap' : null;
  }
}

export function pdReducer(state: PDState, action: PDAction): PDState {
  if (state.status !== 'playing') return state;
  if (action.type !== 'commit') return state;
  if (action.move !== 'C' && action.move !== 'D') return state;
  if (action.round !== state.history.length) return state;
  if (state.pending[action.player] !== null) return state;

  const pending: [PDMove | null, PDMove | null] = [...state.pending];
  pending[action.player] = action.move;
  if (pending[0] === null || pending[1] === null) return { ...state, pending };

  const moves: [PDMove, PDMove] = [pending[0], pending[1]];
  const history = [...state.history, { moves, payoffs: stagePayoffs(state.params, moves[0], moves[1]) }];
  const endReason = endAfter(state.params, state.seed, history.length);
  return {
    ...state,
    history,
    pending: [null, null],
    status: endReason ? 'finished' : 'playing',
    endReason,
  };
}

export const prisonersDilemma: GameDefinition<PDParams, PDState, PDAction> = {
  id: 'pd',
  init: createPDState,
  reduce: pdReducer,
  isFinished: (s) => s.status === 'finished',
};

/** What `player` may see (for V2 online play): the opponent's pending move is hidden. */
export interface PDView extends Omit<PDState, 'pending' | 'seed'> {
  ownPending: PDMove | null;
  opponentCommitted: boolean;
}

export function viewFor(state: PDState, player: Player): PDView {
  const { pending, seed: _seed, ...rest } = state;
  void _seed; // the seed would reveal the random end
  return { ...rest, ownPending: pending[player], opponentCommitted: pending[player === 0 ? 1 : 0] !== null };
}

export function totals(history: PDRound[]): [number, number] {
  return history.reduce<[number, number]>((t, r) => [t[0] + r.payoffs[0], t[1] + r.payoffs[1]], [0, 0]);
}

/** Σ δ^t u_t (t = 0, 1, …) – present value of the realised payoff stream. */
export function discountedTotals(history: PDRound[], delta: number): [number, number] {
  return history.reduce<[number, number]>(
    (t, r, i) => [t[0] + delta ** i * r.payoffs[0], t[1] + delta ** i * r.payoffs[1]],
    [0, 0],
  );
}
