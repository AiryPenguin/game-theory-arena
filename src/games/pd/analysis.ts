/**
 * Equilibrium analysis of the (repeated) prisoner's dilemma.
 * Stage-game facts come from the generic bimatrix functions; repeated-game
 * thresholds are derived in closed form from T, R, P, S and δ.
 */
import {
  deviationGain,
  dominance,
  paretoDominators,
  paretoEfficientProfiles,
  pureNashEquilibria,
  socialOptimum,
  totalPayoff,
  type Bimatrix,
  type Deviation,
  type DominanceKind,
  type Profile,
  profileKey,
} from '../../core/normalForm';
import { fraction, geq, type Fraction } from '../../core/numbers';
import type { PDRound } from './engine';
import { moveIndex, pdBimatrix, type PDMove, type PDParams, type PDPayoffs } from './params';

export interface StageAnalysis {
  game: Bimatrix;
  played: Profile;
  nash: Profile[];
  isNash: boolean;
  deviations: [Deviation, Deviation];
  dominance: [DominanceKind[], DominanceKind[]];
  paretoEfficient: Profile[];
  playedParetoEfficient: boolean;
  paretoDominatedBy: Profile[];
  social: { profiles: Profile[]; total: number };
  playedTotal: number;
  welfareGap: number;
}

export function analyzeStage(p: PDPayoffs, moves: [PDMove, PDMove]): StageAnalysis {
  const game = pdBimatrix(p);
  const played: Profile = [moveIndex(moves[0]), moveIndex(moves[1])];
  const nash = pureNashEquilibria(game);
  const paretoEfficient = paretoEfficientProfiles(game);
  const social = socialOptimum(game);
  const playedTotal = totalPayoff(game, played);
  return {
    game,
    played,
    nash,
    isNash: nash.some((q) => profileKey(q) === profileKey(played)),
    deviations: [deviationGain(game, played, 0), deviationGain(game, played, 1)],
    dominance: [dominance(game, 0), dominance(game, 1)],
    paretoEfficient,
    playedParetoEfficient: paretoEfficient.some((q) => profileKey(q) === profileKey(played)),
    paretoDominatedBy: paretoDominators(game, played),
    social,
    playedTotal,
    welfareGap: social.total - playedTotal,
  };
}

// ---------- Repeated game ----------

/** δ* = (T−R)/(T−P): minimal discount factor for which Grim Trigger sustains (C,C). */
export function grimThreshold({ T, R, P }: PDPayoffs): Fraction {
  return fraction(T - R, T - P);
}

/** Present value of cooperating forever: R/(1−δ). */
export const cooperationValue = ({ R }: PDPayoffs, delta: number): number => R / (1 - delta);

/** Present value of the best deviation against Grim Trigger: T + δP/(1−δ). */
export const deviationValue = ({ T, P }: PDPayoffs, delta: number): number => T + (delta * P) / (1 - delta);

/**
 * Grim Trigger is an SPE iff R/(1−δ) ≥ T + δP/(1−δ) ⇔ R ≥ (1−δ)T + δP ⇔ δ ≥ (T−R)/(T−P).
 * Evaluated in the multiplied-out form to avoid division noise at the boundary.
 */
export function grimStable(p: PDPayoffs, delta: number): boolean {
  return geq(p.R, (1 - delta) * p.T + delta * p.P);
}

/**
 * Tit-for-Tat against Tit-for-Tat is a Nash equilibrium iff neither
 * "always D" (δ ≥ (T−R)/(T−P)) nor "alternate D,C" (δ ≥ (T−R)/(R−S)) is profitable.
 * (TFT faces a two-state MDP, so these stationary deviations are exhaustive.)
 */
export function tftThreshold(p: PDPayoffs): { value: Fraction; alwaysD: Fraction; alternate: Fraction } {
  const alwaysD = fraction(p.T - p.R, p.T - p.P);
  const alternate = fraction(p.T - p.R, p.R - p.S);
  return { value: alwaysD.value >= alternate.value ? alwaysD : alternate, alwaysD, alternate };
}

export interface FiniteAnalysis {
  kind: 'finite';
  rounds: number;
  /** backward induction only pins down (D,D) everywhere if the stage NE is unique */
  uniqueStageNE: boolean;
  spePayoff: number;
  cooperationPayoff: number;
}

export interface DiscountedAnalysis {
  kind: 'discounted';
  delta: number;
  expectedLength: number;
  threshold: Fraction;
  stable: boolean;
  coopValue: number;
  devValue: number;
  tft: ReturnType<typeof tftThreshold>;
  tftIsNash: boolean;
}

export type RepeatedAnalysis = FiniteAnalysis | DiscountedAnalysis | { kind: 'oneShot' };

export function analyzeRepeated(params: PDParams): RepeatedAnalysis {
  if (params.mode === 'oneShot') return { kind: 'oneShot' };
  if (params.mode === 'finite') {
    const nash = pureNashEquilibria(pdBimatrix(params));
    return {
      kind: 'finite',
      rounds: params.rounds,
      uniqueStageNE: nash.length === 1,
      spePayoff: params.rounds * params.P,
      cooperationPayoff: params.rounds * params.R,
    };
  }
  const tft = tftThreshold(params);
  return {
    kind: 'discounted',
    delta: params.delta,
    expectedLength: 1 / (1 - params.delta),
    threshold: grimThreshold(params),
    stable: grimStable(params, params.delta),
    coopValue: cooperationValue(params, params.delta),
    devValue: deviationValue(params, params.delta),
    tft,
    tftIsNash: geq(params.delta, tft.value.value),
  };
}

// ---------- Whole match ----------

export interface MatchStats {
  rounds: number;
  coopRate: [number, number];
  mutualCoop: number;
  mutualDefect: number;
  maxMutualCoopStreak: number;
  /** last round in which both cooperated (1-based), or 0 */
  lastMutualCoop: number;
  /** did someone defect in the final round after mostly mutual cooperation? (endgame effect) */
  endgameDefection: boolean;
  /** rounds whose stage outcome was a stage-game NE */
  stageNashRounds: number;
}

export function matchStats(history: PDRound[]): MatchStats {
  const n = history.length;
  let streak = 0;
  let maxStreak = 0;
  let mutualCoop = 0;
  let mutualDefect = 0;
  let lastMutualCoop = 0;
  const coop: [number, number] = [0, 0];
  history.forEach((r, i) => {
    if (r.moves[0] === 'C') coop[0]++;
    if (r.moves[1] === 'C') coop[1]++;
    if (r.moves[0] === 'C' && r.moves[1] === 'C') {
      mutualCoop++;
      streak++;
      lastMutualCoop = i + 1;
      maxStreak = Math.max(maxStreak, streak);
    } else streak = 0;
    if (r.moves[0] === 'D' && r.moves[1] === 'D') mutualDefect++;
  });
  const last = history[n - 1];
  const endgameDefection =
    n >= 3 && !!last && (last.moves[0] === 'D' || last.moves[1] === 'D') && mutualCoop >= (n - 1) / 2;
  return {
    rounds: n,
    coopRate: [n ? coop[0] / n : 0, n ? coop[1] / n : 0],
    mutualCoop,
    mutualDefect,
    maxMutualCoopStreak: maxStreak,
    lastMutualCoop,
    endgameDefection,
    stageNashRounds: mutualDefect, // in a PD (D,D) is the unique stage NE
  };
}

/** Is the stage profile consistent with the Grim-Trigger SPE path? Only (C,C) when δ ≥ δ*. */
export function onGrimPath(params: PDParams, moves: [PDMove, PDMove]): boolean {
  return params.mode === 'discounted' && moves[0] === 'C' && moves[1] === 'C' && grimStable(params, params.delta);
}

