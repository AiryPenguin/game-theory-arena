/** Achievements as a pure function: event × counters × already unlocked ⇒ newly unlocked. */
import type { ConceptId } from './concepts';

export type ArenaEvent =
  | { type: 'answer'; concept: ConceptId; correct: boolean; source: 'predict' | 'exam' }
  | { type: 'pdMatchFinished'; mode: 'oneShot' | 'finite' | 'discounted'; rounds: number; maxMutualCoopStreak: number; humans: number }
  | { type: 'botGuess'; correct: boolean }
  | { type: 'examFinished'; correct: number; total: number };

export interface Counters {
  answerStreak: number;
  answersTotal: number;
  examAnswers: number;
  matchesFinished: number;
  hotSeatMatches: number;
}

export const emptyCounters = (): Counters => ({
  answerStreak: 0,
  answersTotal: 0,
  examAnswers: 0,
  matchesFinished: 0,
  hotSeatMatches: 0,
});

export function applyCounters(c: Counters, e: ArenaEvent): Counters {
  switch (e.type) {
    case 'answer':
      return {
        ...c,
        answerStreak: e.correct ? c.answerStreak + 1 : 0,
        answersTotal: c.answersTotal + 1,
        examAnswers: c.examAnswers + (e.source === 'exam' ? 1 : 0),
      };
    case 'pdMatchFinished':
      return { ...c, matchesFinished: c.matchesFinished + 1, hotSeatMatches: c.hotSeatMatches + (e.humans >= 2 ? 1 : 0) };
    default:
      return c;
  }
}

export interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** called with the event and the counters *after* applying the event */
  check(e: ArenaEvent, c: Counters): boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-match', icon: '🎬', title: 'Erste Partie', description: 'Eine Partie zu Ende gespielt.', check: (e) => e.type === 'pdMatchFinished' },
  {
    id: 'backward-induction',
    icon: '⏪',
    title: 'Rückwärtsinduktion gemeistert',
    description: 'Das SPE eines endlich wiederholten Spiels korrekt bestimmt.',
    check: (e) => e.type === 'answer' && e.concept === 'pd.backwardInduction' && e.correct,
  },
  {
    id: 'folk-hero',
    icon: '🎻',
    title: 'Folk-Held',
    description: 'Den kritischen Diskontfaktor δ* korrekt berechnet.',
    check: (e) => e.type === 'answer' && e.concept === 'pd.grimThreshold' && e.correct,
  },
  {
    id: 'coop-10',
    icon: '🤝',
    title: '10 Runden kooperiert',
    description: '10 Runden in Folge beidseitig kooperiert.',
    check: (e) => e.type === 'pdMatchFinished' && e.maxMutualCoopStreak >= 10,
  },
  {
    id: 'detective',
    icon: '🕵️',
    title: 'Gegner-Strategie erkannt',
    description: 'Die geheime Strategie des Computers richtig erraten.',
    check: (e) => e.type === 'botGuess' && e.correct,
  },
  {
    id: 'nash-prophet',
    icon: '🔮',
    title: 'Nash-Prophet',
    description: '5 Aufgaben/Vorhersagen in Folge richtig.',
    check: (_e, c) => c.answerStreak >= 5,
  },
  {
    id: 'exam-perfect',
    icon: '🏅',
    title: 'Klausurreif',
    description: 'Eine Probeklausur mit mindestens 5 Aufgaben fehlerfrei gelöst.',
    check: (e) => e.type === 'examFinished' && e.total >= 5 && e.correct === e.total,
  },
  {
    id: 'diligent',
    icon: '📚',
    title: 'Fleißig',
    description: '25 Klausuraufgaben bearbeitet.',
    check: (_e, c) => c.examAnswers >= 25,
  },
  {
    id: 'hot-seat',
    icon: '🪑',
    title: 'Heißer Stuhl',
    description: 'Eine Hot-Seat-Partie gegen einen Menschen gespielt.',
    check: (e) => e.type === 'pdMatchFinished' && e.humans >= 2,
  },
];

export function newlyUnlocked(e: ArenaEvent, countersAfter: Counters, unlocked: Record<string, number>): string[] {
  return ACHIEVEMENTS.filter((a) => !(a.id in unlocked) && a.check(e, countersAfter)).map((a) => a.id);
}
