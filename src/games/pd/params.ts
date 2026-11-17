import type { Bimatrix } from '../../core/normalForm';
import { fmt } from '../../core/numbers';

export type PDMode = 'oneShot' | 'finite' | 'discounted';
export type PDMove = 'C' | 'D';
export const PD_MOVES: readonly PDMove[] = ['C', 'D'];
export const moveIndex = (m: PDMove): number => (m === 'C' ? 0 : 1);
export const moveFromIndex = (i: number): PDMove => (i === 0 ? 'C' : 'D');

export interface PDPayoffs {
  /** Temptation: D gegen C */
  T: number;
  /** Reward: beide C */
  R: number;
  /** Punishment: beide D */
  P: number;
  /** Sucker's payoff: C gegen D */
  S: number;
}

export interface PDParams extends PDPayoffs {
  mode: PDMode;
  /** number of rounds for mode 'finite' */
  rounds: number;
  /** continuation probability / discount factor for mode 'discounted' */
  delta: number;
}

/** Safety cap for games with unknown end (expected length is 1/(1−δ)). */
export const MAX_ROUNDS_DISCOUNTED = 100;
export const MAX_ROUNDS_FINITE = 50;

export const PD_DEFAULTS: PDParams = { T: 5, R: 3, P: 1, S: 0, mode: 'finite', rounds: 10, delta: 0.9 };

export const PD_PRESETS: { name: string; payoffs: PDPayoffs }[] = [
  { name: 'Lehrbuch 5/3/1/0', payoffs: { T: 5, R: 3, P: 1, S: 0 } },
  { name: 'Geringe Versuchung 4/3/1/0', payoffs: { T: 4, R: 3, P: 1, S: 0 } },
  { name: 'Hohe Versuchung 10/6/1/0', payoffs: { T: 10, R: 6, P: 1, S: 0 } },
  { name: 'Mit Verlusten 3/2/−1/−2', payoffs: { T: 3, R: 2, P: -1, S: -2 } },
];

export interface Validation {
  errors: string[];
  warnings: string[];
}

export function isPrisonersDilemma({ T, R, P, S }: PDPayoffs): boolean {
  return T > R && R > P && P > S;
}

export function validatePDParams(p: PDParams): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { T, R, P, S } = p;
  if (![T, R, P, S].every(Number.isFinite)) {
    errors.push('Alle Auszahlungen T, R, P, S müssen Zahlen sein.');
  } else {
    if (!(T > R)) errors.push(`T > R verletzt (${fmt(T)} ≤ ${fmt(R)}): Ohne Versuchung gibt es kein Dilemma.`);
    if (!(R > P)) errors.push(`R > P verletzt (${fmt(R)} ≤ ${fmt(P)}): Kooperation muss beide besserstellen als gegenseitiges Defektieren.`);
    if (!(P > S)) errors.push(`P > S verletzt (${fmt(P)} ≤ ${fmt(S)}): Sonst ist D nicht mehr strikt dominant.`);
    if (errors.length === 0 && p.mode !== 'oneShot' && !(2 * R > T + S)) {
      warnings.push(
        `2R > T + S ist verletzt (${fmt(2 * R)} ≤ ${fmt(T + S)}): Abwechselndes Ausbeuten bringt in Summe mindestens so viel wie gemeinsame Kooperation. Für das wiederholte Spiel wird meist 2R > T + S angenommen.`,
      );
    }
  }
  if (p.mode === 'finite' && !(Number.isInteger(p.rounds) && p.rounds >= 2 && p.rounds <= MAX_ROUNDS_FINITE)) {
    errors.push(`Rundenzahl muss eine ganze Zahl zwischen 2 und ${MAX_ROUNDS_FINITE} sein.`);
  }
  if (p.mode === 'discounted') {
    if (!(p.delta > 0 && p.delta < 1)) errors.push('Der Diskontfaktor δ muss strikt zwischen 0 und 1 liegen.');
    else if (1 / (1 - p.delta) > 30)
      warnings.push(
        `Erwartete Spieldauer 1/(1−δ) = ${fmt(1 / (1 - p.delta), 1)} Runden. Nach ${MAX_ROUNDS_DISCOUNTED} Runden wird technisch abgebrochen.`,
      );
  }
  return { errors, warnings };
}

/** Stage game as bimatrix. Rows: A ∈ {C, D}, columns: B ∈ {C, D}. */
export function pdBimatrix({ T, R, P, S }: PDPayoffs): Bimatrix {
  return {
    rowLabels: ['C', 'D'],
    colLabels: ['C', 'D'],
    payoffs: [
      [[R, R], [S, T]],
      [[T, S], [P, P]],
    ],
  };
}

export function stagePayoffs(p: PDPayoffs, a: PDMove, b: PDMove): [number, number] {
  return pdBimatrix(p).payoffs[moveIndex(a)][moveIndex(b)];
}
