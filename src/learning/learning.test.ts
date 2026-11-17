import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../core/rng';
import { applyCounters, emptyCounters, newlyUnlocked, type ArenaEvent } from './achievements';
import { recordMatch } from './leaderboard';
import { DAY, dueCount, emptyProgress, isProgress, pickReviewConcepts, recordAnswer } from './srs';
import { loadJSON, saveJSON } from './storage';

describe('Leitner spaced repetition', () => {
  it('correct answers move up a box and postpone the due date; wrong ones reset', () => {
    const t0 = 1_000_000;
    let p = recordAnswer(emptyProgress(), 'pd.grimThreshold', true, t0);
    expect(p.concepts['pd.grimThreshold']).toMatchObject({ box: 2, attempts: 1, correct: 1, due: t0 + DAY });
    p = recordAnswer(p, 'pd.grimThreshold', true, t0);
    expect(p.concepts['pd.grimThreshold']!.box).toBe(3);
    p = recordAnswer(p, 'pd.grimThreshold', false, t0);
    expect(p.concepts['pd.grimThreshold']).toMatchObject({ box: 1, due: t0, attempts: 3, correct: 2 });
    expect(dueCount(p, ['pd.grimThreshold'], t0)).toBe(1);
    expect(isProgress(JSON.parse(JSON.stringify(p)))).toBe(true);
  });
  it('review prefers weak, due concepts', () => {
    const now = 10 * DAY;
    let p = emptyProgress();
    p = recordAnswer(p, 'pd.stageNE', true, now);
    p = recordAnswer(p, 'pd.stageNE', true, now);
    p = recordAnswer(p, 'pd.tftThreshold', false, now);
    const picked = pickReviewConcepts(p, ['pd.stageNE', 'pd.tftThreshold', 'pd.pareto'], 2, now, mulberry32(1));
    expect(picked).toEqual(['pd.tftThreshold', 'pd.pareto']);
  });
});

describe('achievements', () => {
  it('unlocks once and tracks streaks', () => {
    let c = emptyCounters();
    let unlocked: Record<string, number> = {};
    const fire = (e: ArenaEvent) => {
      c = applyCounters(c, e);
      const ids = newlyUnlocked(e, c, unlocked);
      ids.forEach((id) => (unlocked[id] = 1));
      return ids;
    };
    for (let i = 0; i < 4; i++) expect(fire({ type: 'answer', concept: 'pd.stageNE', correct: true, source: 'exam' })).toEqual([]);
    expect(fire({ type: 'answer', concept: 'pd.grimThreshold', correct: true, source: 'exam' })).toEqual(['folk-hero', 'nash-prophet']);
    expect(fire({ type: 'answer', concept: 'pd.grimThreshold', correct: true, source: 'exam' })).toEqual([]);
    expect(fire({ type: 'pdMatchFinished', mode: 'finite', rounds: 12, maxMutualCoopStreak: 10, humans: 2 })).toEqual([
      'first-match',
      'coop-10',
      'hot-seat',
    ]);
    unlocked = {};
  });
});

describe('leaderboard', () => {
  it('accumulates per (case-insensitive) name and sorts', () => {
    let b = recordMatch([], [{ name: 'Anna', points: 10, won: true }, { name: 'Ben', points: 12, won: false }]);
    b = recordMatch(b, [{ name: 'anna ', points: 5, won: true }]);
    expect(b.map((e) => [e.name, e.points, e.wins])).toEqual([
      ['Anna', 15, 2],
      ['Ben', 12, 0],
    ]);
  });
});

describe('storage without localStorage', () => {
  it('falls back to memory and validates', () => {
    expect(saveJSON('x', { a: 1 })).toBe(false);
    expect(loadJSON('x', null)).toEqual({ a: 1 });
    expect(loadJSON('x', 'fallback', (v): v is string => typeof v === 'string')).toBe('fallback');
    expect(loadJSON('missing', 42)).toBe(42);
  });
});
