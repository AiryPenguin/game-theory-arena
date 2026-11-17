import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { ACHIEVEMENTS, applyCounters, emptyCounters, newlyUnlocked, type ArenaEvent, type Counters } from '../learning/achievements';
import { isLeaderboard, recordMatch, type Leaderboard, type MatchResult } from '../learning/leaderboard';
import { emptyProgress, isProgress, recordAnswer, type Progress } from '../learning/srs';
import { loadJSON, saveJSON } from '../learning/storage';

interface Toast {
  id: number;
  icon: string;
  title: string;
  text: string;
}

interface Profile {
  progress: Progress;
  counters: Counters;
  unlocked: Record<string, number>;
  leaderboard: Leaderboard;
}

interface State extends Profile {
  toasts: Toast[];
  nextToast: number;
}

type Action =
  | { type: 'event'; event: ArenaEvent; at: number }
  | { type: 'leaderboard'; results: MatchResult[] }
  | { type: 'resetProgress' }
  | { type: 'resetLeaderboard' }
  | { type: 'dismiss'; id: number };

const isCounters = (x: unknown): x is Counters => !!x && typeof x === 'object' && typeof (x as Counters).answersTotal === 'number';
const isUnlocked = (x: unknown): x is Record<string, number> => !!x && typeof x === 'object' && !Array.isArray(x);

function init(): State {
  return {
    progress: loadJSON('progress', emptyProgress(), isProgress),
    counters: { ...emptyCounters(), ...loadJSON('counters', emptyCounters(), isCounters) },
    unlocked: loadJSON('achievements', {}, isUnlocked),
    leaderboard: loadJSON('leaderboard', [], isLeaderboard),
    toasts: [],
    nextToast: 1,
  };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'event': {
      const e = a.event;
      const counters = applyCounters(s.counters, e);
      const progress = e.type === 'answer' ? recordAnswer(s.progress, e.concept, e.correct, a.at) : s.progress;
      const ids = newlyUnlocked(e, counters, s.unlocked);
      if (!ids.length) return { ...s, counters, progress };
      const unlocked = { ...s.unlocked };
      let next = s.nextToast;
      const toasts = [...s.toasts];
      for (const id of ids) {
        unlocked[id] = a.at;
        const def = ACHIEVEMENTS.find((x) => x.id === id)!;
        toasts.push({ id: next++, icon: def.icon, title: `Erfolg: ${def.title}`, text: def.description });
      }
      return { ...s, counters, progress, unlocked, toasts, nextToast: next };
    }
    case 'leaderboard':
      return { ...s, leaderboard: recordMatch(s.leaderboard, a.results) };
    case 'resetProgress':
      return { ...s, progress: emptyProgress(), counters: emptyCounters(), unlocked: {} };
    case 'resetLeaderboard':
      return { ...s, leaderboard: [] };
    case 'dismiss':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
  }
}

interface Ctx extends State {
  emit(e: ArenaEvent): void;
  recordLeaderboard(results: MatchResult[]): void;
  resetProgress(): void;
  resetLeaderboard(): void;
  dismissToast(id: number): void;
}

const ArenaContext = createContext<Ctx | null>(null);

export function ArenaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, init);

  useEffect(() => void saveJSON('progress', state.progress), [state.progress]);
  useEffect(() => void saveJSON('counters', state.counters), [state.counters]);
  useEffect(() => void saveJSON('achievements', state.unlocked), [state.unlocked]);
  useEffect(() => void saveJSON('leaderboard', state.leaderboard), [state.leaderboard]);

  const emit = useCallback((event: ArenaEvent) => dispatch({ type: 'event', event, at: Date.now() }), []);
  const recordLeaderboard = useCallback((results: MatchResult[]) => dispatch({ type: 'leaderboard', results }), []);
  const resetProgress = useCallback(() => dispatch({ type: 'resetProgress' }), []);
  const resetLeaderboard = useCallback(() => dispatch({ type: 'resetLeaderboard' }), []);
  const dismissToast = useCallback((id: number) => dispatch({ type: 'dismiss', id }), []);

  const value = useMemo(
    () => ({ ...state, emit, recordLeaderboard, resetProgress, resetLeaderboard, dismissToast }),
    [state, emit, recordLeaderboard, resetProgress, resetLeaderboard, dismissToast],
  );
  return <ArenaContext.Provider value={value}>{children}</ArenaContext.Provider>;
}

export function useArena(): Ctx {
  const c = useContext(ArenaContext);
  if (!c) throw new Error('useArena outside ArenaProvider');
  return c;
}
