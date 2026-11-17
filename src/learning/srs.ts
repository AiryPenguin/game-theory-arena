/**
 * Spaced repetition (Leitner system) + error statistics. Pure functions over a plain object
 * so the whole progress can be serialised to localStorage.
 */
import type { Rng } from '../core/rng';
import { CONCEPTS, type ConceptId } from './concepts';

export const DAY = 24 * 60 * 60 * 1000;
/** interval in days by box (index = box). Box 1 = due immediately. */
export const LEITNER_DAYS = [0, 0, 1, 2, 4, 8, 16] as const;
export const MAX_BOX = 6;

export interface ConceptStats {
  attempts: number;
  correct: number;
  box: number;
  due: number;
  lastSeen: number;
}

export interface Progress {
  version: 1;
  concepts: Partial<Record<ConceptId, ConceptStats>>;
}

export const emptyProgress = (): Progress => ({ version: 1, concepts: {} });

export function recordAnswer(progress: Progress, concept: ConceptId, correct: boolean, now: number): Progress {
  const prev = progress.concepts[concept] ?? { attempts: 0, correct: 0, box: 1, due: now, lastSeen: now };
  const box = correct ? Math.min(MAX_BOX, prev.box + 1) : 1;
  const next: ConceptStats = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    box,
    due: now + LEITNER_DAYS[box] * DAY,
    lastSeen: now,
  };
  return { ...progress, concepts: { ...progress.concepts, [concept]: next } };
}

export const errorRate = (s: ConceptStats | undefined): number => (s && s.attempts ? 1 - s.correct / s.attempts : 0);

/**
 * Priority for review: due concepts first (lower box first), then by error rate,
 * unseen concepts after weak ones. Higher = more urgent.
 */
export function reviewPriority(s: ConceptStats | undefined, now: number): number {
  if (!s) return 1.5;
  const due = s.due <= now;
  return (due ? 3 : 0) + (MAX_BOX - s.box) / MAX_BOX + errorRate(s) * 2;
}

/** Choose n concepts for a review session, weighted by priority (with repetition if needed). */
export function pickReviewConcepts(progress: Progress, candidates: ConceptId[], n: number, now: number, rng: Rng): ConceptId[] {
  const ranked = [...candidates].sort(
    (a, b) => reviewPriority(progress.concepts[b], now) - reviewPriority(progress.concepts[a], now) || a.localeCompare(b),
  );
  const result: ConceptId[] = [];
  // first pass: most urgent distinct concepts
  for (const c of ranked) if (result.length < n) result.push(c);
  // fill remaining slots with weighted draws
  while (result.length < n && ranked.length) {
    const weights = ranked.map((c) => reviewPriority(progress.concepts[c], now));
    const total = weights.reduce((a, b) => a + b, 0);
    let x = rng() * total;
    const idx = weights.findIndex((w) => (x -= w) < 0);
    result.push(ranked[idx < 0 ? 0 : idx]);
  }
  return result;
}

export function dueCount(progress: Progress, candidates: ConceptId[], now: number): number {
  return candidates.filter((c) => {
    const s = progress.concepts[c];
    return s !== undefined && s.due <= now;
  }).length;
}

export function isProgress(x: unknown): x is Progress {
  if (!x || typeof x !== 'object') return false;
  const p = x as Progress;
  if (p.version !== 1 || !p.concepts || typeof p.concepts !== 'object') return false;
  return Object.entries(p.concepts).every(
    ([k, v]) => k in CONCEPTS && v && typeof v.attempts === 'number' && typeof v.box === 'number' && typeof v.due === 'number',
  );
}
