import { describe, expect, it } from 'vitest';
import {
  bestResponses,
  bestResponsesToMixed,
  deviationGain,
  dominance,
  mixedNash2x2,
  paretoEfficientProfiles,
  pureNashEquilibria,
  socialOptimum,
  strictlyDominantStrategy,
  type Bimatrix,
} from './normalForm';

const m = (rows: [number, number][][], r = ['C', 'D'], c = ['C', 'D']): Bimatrix => ({
  rowLabels: r,
  colLabels: c,
  payoffs: rows,
});

// Textbook prisoner's dilemma T=5, R=3, P=1, S=0
const pd = m([
  [[3, 3], [0, 5]],
  [[5, 0], [1, 1]],
]);
// Stag hunt: (Hirsch, Hirsch) = 4, Hase sicher 3
const stag = m([
  [[4, 4], [0, 3]],
  [[3, 0], [3, 3]],
], ['Hirsch', 'Hase'], ['Hirsch', 'Hase']);
const pennies = m([
  [[1, -1], [-1, 1]],
  [[-1, 1], [1, -1]],
], ['K', 'Z'], ['K', 'Z']);
// Battle of the sexes (Oper, Fußball): A prefers Oper (2,1), B prefers Fußball (1,2)
const bos = m([
  [[2, 1], [0, 0]],
  [[0, 0], [1, 2]],
], ['Oper', 'Fußball'], ['Oper', 'Fußball']);

describe('pure Nash equilibria', () => {
  it('prisoner’s dilemma has the unique NE (D,D)', () => {
    expect(pureNashEquilibria(pd)).toEqual([[1, 1]]);
  });
  it('stag hunt has two pure NE', () => {
    expect(pureNashEquilibria(stag)).toEqual([[0, 0], [1, 1]]);
  });
  it('matching pennies has no pure NE', () => {
    expect(pureNashEquilibria(pennies)).toEqual([]);
  });
  it('ties count as best responses (weak NE)', () => {
    const g = m([
      [[1, 1], [1, 1]],
      [[1, 1], [1, 1]],
    ]);
    expect(pureNashEquilibria(g)).toHaveLength(4);
  });
});

describe('best responses and deviations', () => {
  it('PD: D is the best response to everything', () => {
    expect(bestResponses(pd, 0, 0)).toEqual([1]);
    expect(bestResponses(pd, 0, 1)).toEqual([1]);
    expect(bestResponses(pd, 1, 0)).toEqual([1]);
  });
  it('PD: deviation gain from (C,C) is T−R = 2', () => {
    expect(deviationGain(pd, [0, 0], 0)).toEqual({ gain: 2, bestDeviation: 1 });
    expect(deviationGain(pd, [1, 1], 1)).toEqual({ gain: 0, bestDeviation: null });
  });
  it('best response to mixed strategy (stag hunt)', () => {
    // Hirsch pays 4q, Hase pays 3 ⇒ Hirsch iff q > 3/4
    expect(bestResponsesToMixed(stag, 0, [0.8, 0.2])).toEqual([0]);
    expect(bestResponsesToMixed(stag, 0, [0.5, 0.5])).toEqual([1]);
    expect(bestResponsesToMixed(stag, 0, [0.75, 0.25])).toEqual([0, 1]);
  });
});

describe('dominance', () => {
  it('PD: D strictly dominant, C strictly dominated', () => {
    expect(strictlyDominantStrategy(pd, 0)).toBe(1);
    expect(dominance(pd, 1)).toEqual(['strictlyDominated', 'strictlyDominant']);
  });
  it('stag hunt: no dominant strategy', () => {
    expect(strictlyDominantStrategy(stag, 0)).toBeNull();
    expect(dominance(stag, 0)).toEqual([null, null]);
  });
  it('weak dominance', () => {
    const g = m([
      [[1, 0], [1, 0]],
      [[1, 0], [0, 0]],
    ]);
    expect(dominance(g, 0)).toEqual(['weaklyDominant', 'weaklyDominated']);
  });
});

describe('Pareto and welfare', () => {
  it('PD: (D,D) is the only Pareto-inefficient profile', () => {
    expect(paretoEfficientProfiles(pd)).toEqual([[0, 0], [0, 1], [1, 0]]);
    expect(socialOptimum(pd)).toEqual({ profiles: [[0, 0]], total: 6 });
  });
});

describe('mixed NE (2×2)', () => {
  it('matching pennies: 1/2, 1/2', () => {
    const mne = mixedNash2x2(pennies)!;
    expect(mne.p).toBeCloseTo(0.5);
    expect(mne.q).toBeCloseTo(0.5);
    expect(mne.payoffs[0]).toBeCloseTo(0);
  });
  it('battle of the sexes: A plays Oper with 2/3, B with 1/3', () => {
    const mne = mixedNash2x2(bos)!;
    expect(mne.p).toBeCloseTo(2 / 3);
    expect(mne.q).toBeCloseTo(1 / 3);
    expect(mne.payoffs[0]).toBeCloseTo(2 / 3);
    expect(mne.payoffs[1]).toBeCloseTo(2 / 3);
  });
  it('stag hunt: q* = 3/4', () => {
    const mne = mixedNash2x2(stag)!;
    expect(mne.q).toBeCloseTo(0.75);
    expect(mne.p).toBeCloseTo(0.75);
  });
  it('PD: no completely mixed NE', () => {
    expect(mixedNash2x2(pd)).toBeNull();
  });
});
