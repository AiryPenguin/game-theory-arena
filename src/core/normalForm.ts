/**
 * Two-player games in normal form (bimatrix games).
 * Row player = Player 0 (A), column player = Player 1 (B).
 * Everything is computed from the payoffs; no equilibrium is hard-coded.
 */
import { approxEq, EPS } from './numbers';
import type { Player } from './types';

export interface Bimatrix {
  rowLabels: string[];
  colLabels: string[];
  /** payoffs[r][c] = [u_A, u_B] */
  payoffs: [number, number][][];
}

/** [rowIndex, colIndex] */
export type Profile = [number, number];

export const profileKey = (p: Profile): string => `${p[0]},${p[1]}`;

export function profileLabel(g: Bimatrix, p: Profile): string {
  return `(${g.rowLabels[p[0]]}, ${g.colLabels[p[1]]})`;
}

export function payoff(g: Bimatrix, p: Profile, player: Player): number {
  return g.payoffs[p[0]][p[1]][player];
}

export function numStrategies(g: Bimatrix, player: Player): number {
  return player === 0 ? g.rowLabels.length : g.colLabels.length;
}

/** Profile where `player` plays s and the opponent keeps their part of `p`. */
export function withStrategy(p: Profile, player: Player, s: number): Profile {
  return player === 0 ? [s, p[1]] : [p[0], s];
}

const argmaxAll = (values: number[]): number[] => {
  const max = Math.max(...values);
  return values.map((v, i) => (approxEq(v, max) ? i : -1)).filter((i) => i >= 0);
};

/**
 * Best responses of `player` against the opponent's pure strategy `opp`
 * (column index if player = 0, row index if player = 1). Ties ⇒ several.
 */
export function bestResponses(g: Bimatrix, player: Player, opp: number): number[] {
  const n = numStrategies(g, player);
  const values = Array.from({ length: n }, (_, s) =>
    payoff(g, player === 0 ? [s, opp] : [opp, s], player),
  );
  return argmaxAll(values);
}

/** Best responses against a mixed strategy of the opponent (probability vector). */
export function bestResponsesToMixed(g: Bimatrix, player: Player, oppMix: number[]): number[] {
  const n = numStrategies(g, player);
  const values = Array.from({ length: n }, (_, s) =>
    oppMix.reduce((sum, q, o) => sum + q * payoff(g, player === 0 ? [s, o] : [o, s], player), 0),
  );
  return argmaxAll(values);
}

export function isBestResponse(g: Bimatrix, p: Profile, player: Player): boolean {
  const opp = player === 0 ? p[1] : p[0];
  return bestResponses(g, player, opp).includes(player === 0 ? p[0] : p[1]);
}

export function pureNashEquilibria(g: Bimatrix): Profile[] {
  const result: Profile[] = [];
  g.rowLabels.forEach((_, r) =>
    g.colLabels.forEach((_, c) => {
      const p: Profile = [r, c];
      if (isBestResponse(g, p, 0) && isBestResponse(g, p, 1)) result.push(p);
    }),
  );
  return result;
}

export interface Deviation {
  /** max_{s'} u_i(s', s_-i) − u_i(s) ≥ 0 */
  gain: number;
  /** best deviation strategy (own index), or null if no profitable deviation */
  bestDeviation: number | null;
}

export function deviationGain(g: Bimatrix, p: Profile, player: Player): Deviation {
  const current = payoff(g, p, player);
  let best: number | null = null;
  let bestValue = current;
  for (let s = 0; s < numStrategies(g, player); s++) {
    const v = payoff(g, withStrategy(p, player, s), player);
    if (v > bestValue + EPS * Math.max(1, Math.abs(bestValue))) {
      bestValue = v;
      best = s;
    }
  }
  return { gain: best === null ? 0 : bestValue - current, bestDeviation: best };
}

export type DominanceKind = 'strictlyDominant' | 'weaklyDominant' | 'strictlyDominated' | 'weaklyDominated' | null;

/**
 * Compares strategy s against t for `player` over all opponent strategies.
 * Returns 'strict' if s gives strictly more everywhere, 'weak' if ≥ everywhere and > somewhere,
 * 'equal' if identical, otherwise null.
 */
export function compareStrategies(g: Bimatrix, player: Player, s: number, t: number): 'strict' | 'weak' | 'equal' | null {
  const m = numStrategies(g, player === 0 ? 1 : 0);
  let allGreater = true;
  let allGeq = true;
  let someGreater = false;
  for (let o = 0; o < m; o++) {
    const us = payoff(g, player === 0 ? [s, o] : [o, s], player);
    const ut = payoff(g, player === 0 ? [t, o] : [o, t], player);
    if (approxEq(us, ut)) {
      allGreater = false;
    } else if (us > ut) {
      someGreater = true;
    } else {
      allGreater = false;
      allGeq = false;
    }
  }
  if (allGreater) return 'strict';
  if (allGeq && someGreater) return 'weak';
  if (allGeq) return 'equal';
  return null;
}

/** Strictly dominant strategy of `player` (beats every other strategy strictly), or null. */
export function strictlyDominantStrategy(g: Bimatrix, player: Player): number | null {
  const n = numStrategies(g, player);
  for (let s = 0; s < n; s++) {
    let ok = true;
    for (let t = 0; t < n; t++) if (t !== s && compareStrategies(g, player, s, t) !== 'strict') ok = false;
    if (ok && n > 1) return s;
  }
  return null;
}

/** Dominance classification for every strategy of `player`. */
export function dominance(g: Bimatrix, player: Player): DominanceKind[] {
  const n = numStrategies(g, player);
  return Array.from({ length: n }, (_, s) => {
    const others = Array.from({ length: n }, (_, t) => t).filter((t) => t !== s);
    if (others.length === 0) return null;
    const vs = others.map((t) => compareStrategies(g, player, s, t));
    if (vs.every((v) => v === 'strict')) return 'strictlyDominant';
    if (vs.every((v) => v === 'strict' || v === 'weak')) return 'weaklyDominant';
    const against = others.map((t) => compareStrategies(g, player, t, s));
    if (against.some((v) => v === 'strict')) return 'strictlyDominated';
    if (against.some((v) => v === 'weak')) return 'weaklyDominated';
    return null;
  });
}

const allProfiles = (g: Bimatrix): Profile[] =>
  g.rowLabels.flatMap((_, r) => g.colLabels.map((_, c) => [r, c] as Profile));

/** q Pareto-dominates p: nobody worse, somebody strictly better. */
export function paretoDominates(g: Bimatrix, q: Profile, p: Profile): boolean {
  const [qa, qb] = g.payoffs[q[0]][q[1]];
  const [pa, pb] = g.payoffs[p[0]][p[1]];
  const geqA = qa > pa || approxEq(qa, pa);
  const geqB = qb > pb || approxEq(qb, pb);
  const strict = (qa > pa && !approxEq(qa, pa)) || (qb > pb && !approxEq(qb, pb));
  return geqA && geqB && strict;
}

export function paretoDominators(g: Bimatrix, p: Profile): Profile[] {
  return allProfiles(g).filter((q) => paretoDominates(g, q, p));
}

export function paretoEfficientProfiles(g: Bimatrix): Profile[] {
  return allProfiles(g).filter((p) => paretoDominators(g, p).length === 0);
}

export function totalPayoff(g: Bimatrix, p: Profile): number {
  const [a, b] = g.payoffs[p[0]][p[1]];
  return a + b;
}

/** Utilitarian social optimum: profiles maximising u_A + u_B. */
export function socialOptimum(g: Bimatrix): { profiles: Profile[]; total: number } {
  const ps = allProfiles(g);
  const totals = ps.map((p) => totalPayoff(g, p));
  const idx = argmaxAll(totals);
  return { profiles: idx.map((i) => ps[i]), total: totals[idx[0]] };
}

export interface MixedNash2x2 {
  /** probability that A plays row 0 */
  p: number;
  /** probability that B plays column 0 */
  q: number;
  payoffs: [number, number];
}

/**
 * Completely mixed NE of a 2×2 game via the indifference principle.
 * p makes B indifferent between her columns, q makes A indifferent between his rows.
 * Returns null if no completely mixed NE exists (e.g. a strictly dominant strategy).
 */
export function mixedNash2x2(g: Bimatrix): MixedNash2x2 | null {
  if (g.rowLabels.length !== 2 || g.colLabels.length !== 2) return null;
  const a = (r: number, c: number) => g.payoffs[r][c][0];
  const b = (r: number, c: number) => g.payoffs[r][c][1];
  const denQ = a(0, 0) - a(0, 1) - a(1, 0) + a(1, 1);
  const denP = b(0, 0) - b(0, 1) - b(1, 0) + b(1, 1);
  if (approxEq(denQ, 0) || approxEq(denP, 0)) return null;
  const q = (a(1, 1) - a(0, 1)) / denQ;
  const p = (b(1, 1) - b(1, 0)) / denP;
  const inside = (x: number) => x > EPS && x < 1 - EPS;
  if (!inside(p) || !inside(q)) return null;
  const uA = q * a(0, 0) + (1 - q) * a(0, 1);
  const uB = p * b(0, 0) + (1 - p) * b(1, 0);
  return { p, q, payoffs: [uA, uB] };
}
