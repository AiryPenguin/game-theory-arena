/** Computer opponents for the prisoner's dilemma. They only see the public history. */
import { bestResponsesToMixed } from '../../core/normalForm';
import { randomFor } from '../../core/rng';
import type { Player } from '../../core/types';
import { grimStable } from './analysis';
import type { PDRound } from './engine';
import { moveFromIndex, pdBimatrix, type PDMove, type PDParams } from './params';

export type PDBotId = 'economist' | 'tft' | 'grim' | 'pavlov' | 'fair' | 'learner' | 'chaos' | 'naive';

export interface PDBotContext {
  params: PDParams;
  history: PDRound[];
  me: Player;
  seed: number;
}

export interface PDBot {
  id: PDBotId;
  name: string;
  emoji: string;
  /** personality line shown when picking the bot */
  tagline: string;
  /** precise rule, revealed at the end of the match */
  rule: string;
  decide(ctx: PDBotContext): PDMove;
}

const mine = (r: PDRound, me: Player) => r.moves[me];
const theirs = (r: PDRound, me: Player) => r.moves[me === 0 ? 1 : 0];
const opponentEverDefected = (ctx: PDBotContext) => ctx.history.some((r) => theirs(r, ctx.me) === 'D');

export const PD_BOTS: Record<PDBotId, PDBot> = {
  economist: {
    id: 'economist',
    name: 'Der Ökonom',
    emoji: '🎓',
    tagline: 'Rational bis in die Fingerspitzen. Spielt immer ein teilspielperfektes Gleichgewicht.',
    rule:
      'One-shot und endlich wiederholt: immer D (einziges SPE). Bei unbekanntem Ende: Grim Trigger, falls δ ≥ (T−R)/(T−P) – das Pareto-beste SPE –, sonst immer D.',
    decide: (ctx) => {
      if (ctx.params.mode === 'discounted' && grimStable(ctx.params, ctx.params.delta)) {
        return opponentEverDefected(ctx) || ctx.history.some((r) => mine(r, ctx.me) === 'D') ? 'D' : 'C';
      }
      return 'D';
    },
  },
  tft: {
    id: 'tft',
    name: 'Tit-for-Tat',
    emoji: '🪞',
    tagline: 'Wie du mir, so ich dir.',
    rule: 'Beginnt mit C und kopiert danach immer deinen letzten Zug.',
    decide: (ctx) => (ctx.history.length === 0 ? 'C' : theirs(ctx.history[ctx.history.length - 1], ctx.me)),
  },
  grim: {
    id: 'grim',
    name: 'Grim Trigger',
    emoji: '🧊',
    tagline: 'Ich vergesse nie.',
    rule: 'Kooperiert, bis du ein einziges Mal D spielst – danach für immer D.',
    decide: (ctx) => (opponentEverDefected(ctx) ? 'D' : 'C'),
  },
  pavlov: {
    id: 'pavlov',
    name: 'Pavlov',
    emoji: '🐕',
    tagline: 'Never change a winning move.',
    rule:
      'Win-Stay, Lose-Shift: Beginnt mit C. Bekam er zuletzt T oder R (du hast kooperiert), bleibt er bei seinem Zug, sonst wechselt er. Äquivalent: C genau dann, wenn ihr letzte Runde dasselbe gespielt habt.',
    decide: (ctx) => {
      const last = ctx.history[ctx.history.length - 1];
      if (!last) return 'C';
      const won = theirs(last, ctx.me) === 'C';
      const prev = mine(last, ctx.me);
      return won ? prev : prev === 'C' ? 'D' : 'C';
    },
  },
  fair: {
    id: 'fair',
    name: 'Der Faire',
    emoji: '⚖️',
    tagline: 'Ich kooperiere, solange du fair bist.',
    rule: 'Bedingter Kooperierer: Beginnt mit C und kooperiert, solange du in mindestens 50 % aller bisherigen Runden kooperiert hast.',
    decide: (ctx) => {
      if (ctx.history.length === 0) return 'C';
      const coop = ctx.history.filter((r) => theirs(r, ctx.me) === 'C').length;
      return coop / ctx.history.length >= 0.5 ? 'C' : 'D';
    },
  },
  learner: {
    id: 'learner',
    name: 'Der Lernende',
    emoji: '📈',
    tagline: 'Ich beobachte dich genau …',
    rule:
      'Fictitious Play: schätzt deine Strategie als empirische Häufigkeit deiner Züge (mit Laplace-Prior) und spielt eine beste Antwort darauf. Im PD ist D strikt dominant – deshalb ist die Antwort unabhängig von der Schätzung immer D.',
    decide: (ctx) => {
      const n = ctx.history.length;
      const c = ctx.history.filter((r) => theirs(r, ctx.me) === 'C').length;
      const belief = [(c + 1) / (n + 2), (n - c + 1) / (n + 2)];
      const br = bestResponsesToMixed(pdBimatrix(ctx.params), ctx.me, belief);
      return moveFromIndex(br[0]);
    },
  },
  chaos: {
    id: 'chaos',
    name: 'Chaos',
    emoji: '🎲',
    tagline: 'Münzwurf. Jedes Mal.',
    rule: 'Spielt in jeder Runde unabhängig mit Wahrscheinlichkeit 1/2 C oder D.',
    decide: (ctx) => (randomFor(ctx.seed, 'pd-chaos', ctx.me, ctx.history.length) < 0.5 ? 'C' : 'D'),
  },
  naive: {
    id: 'naive',
    name: 'Der Gutmütige',
    emoji: '😇',
    tagline: 'Ich glaube an das Gute im Menschen.',
    rule: 'Kooperiert immer, egal was du tust.',
    decide: () => 'C',
  },
};

export const PD_BOT_IDS = Object.keys(PD_BOTS) as PDBotId[];

/**
 * Which bots would have produced exactly the bot's observed moves, given the same history?
 * If several do, they are observationally equivalent and cannot be told apart.
 */
export function consistentBots(ctx: Omit<PDBotContext, 'history'> & { history: PDRound[] }): PDBotId[] {
  return PD_BOT_IDS.filter((id) =>
    ctx.history.every((round, t) => PD_BOTS[id].decide({ ...ctx, history: ctx.history.slice(0, t) }) === mine(round, ctx.me)),
  );
}
