import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../core/rng';
import { checkAnswer } from '../../learning/tasks';
import {
  analyzeRepeated,
  analyzeStage,
  cooperationValue,
  deviationValue,
  grimStable,
  grimThreshold,
  matchStats,
  tftThreshold,
} from './analysis';
import { consistentBots, PD_BOTS, PD_BOT_IDS, type PDBotId } from './bots';
import { createPDState, endAfter, pdReducer, totals, viewFor, type PDRound, type PDState } from './engine';
import { explainMatch, explainRound } from './explain';
import { generatePDTask, PD_EXAM_CONCEPTS, pdPredictionTasks, stageNETask } from './exercises';
import { PD_DEFAULTS, validatePDParams, type PDMove, type PDParams } from './params';

const textbook: PDParams = { ...PD_DEFAULTS, T: 5, R: 3, P: 1, S: 0 };

describe('validation', () => {
  it('accepts T > R > P > S', () => {
    expect(validatePDParams(textbook).errors).toEqual([]);
  });
  it.each([
    [{ T: 3, R: 3, P: 1, S: 0 }, 'T > R'],
    [{ T: 5, R: 1, P: 1, S: 0 }, 'R > P'],
    [{ T: 5, R: 3, P: 0, S: 0 }, 'P > S'],
  ])('rejects %o', (pay, msg) => {
    const v = validatePDParams({ ...textbook, ...pay });
    expect(v.errors.join(' ')).toContain(msg);
  });
  it('warns when 2R ≤ T + S in repeated games', () => {
    expect(validatePDParams({ ...textbook, T: 7 }).warnings[0]).toContain('2R > T + S');
    expect(validatePDParams({ ...textbook, T: 7, mode: 'oneShot' }).warnings).toEqual([]);
  });
  it('rejects δ outside (0,1) and invalid round counts', () => {
    expect(validatePDParams({ ...textbook, mode: 'discounted', delta: 1 }).errors).toHaveLength(1);
    expect(validatePDParams({ ...textbook, mode: 'finite', rounds: 2.5 }).errors).toHaveLength(1);
  });
});

describe('stage game analysis', () => {
  it('(D,D) is the unique NE and Pareto-dominated by (C,C)', () => {
    const a = analyzeStage(textbook, ['D', 'D']);
    expect(a.nash).toEqual([[1, 1]]);
    expect(a.isNash).toBe(true);
    expect(a.playedParetoEfficient).toBe(false);
    expect(a.paretoDominatedBy).toEqual([[0, 0]]);
    expect(a.welfareGap).toBe(4);
  });
  it('(C,D): A could gain P − S by deviating, B already best-responds', () => {
    const a = analyzeStage(textbook, ['C', 'D']);
    expect(a.isNash).toBe(false);
    expect(a.deviations[0]).toEqual({ gain: 1, bestDeviation: 1 });
    expect(a.deviations[1].gain).toBe(0);
  });
  it('(C,C): both could gain T − R', () => {
    const a = analyzeStage(textbook, ['C', 'C']);
    expect(a.deviations.map((d) => d.gain)).toEqual([2, 2]);
    expect(a.welfareGap).toBe(0);
  });
  it('explanations mention the deviation gain and the dilemma', () => {
    expect(explainRound(textbook, ['C', 'D'], ['Anna', 'Ben']).summary[0]).toContain('**1 mehr**');
    expect(explainRound(textbook, ['D', 'D'], ['Anna', 'Ben']).summary.join(' ')).toContain('Dilemma');
  });
  it('social optimum may be asymmetric when 2R < T + S', () => {
    const a = analyzeStage({ T: 10, R: 3, P: 1, S: 0 }, ['C', 'C']);
    expect(a.social.total).toBe(10);
    expect(a.playedParetoEfficient).toBe(true);
    expect(a.welfareGap).toBe(4);
  });
});

describe('repeated game thresholds (textbook values)', () => {
  it('δ* = (T−R)/(T−P) = 1/2 for 5/3/1/0', () => {
    const th = grimThreshold(textbook);
    expect(th.value).toBe(0.5);
    expect(th.text).toBe('1/2');
  });
  it('δ* = 1/3 for 4/3/1/0 and 7/9 for 10/3/1/0', () => {
    expect(grimThreshold({ T: 4, R: 3, P: 1, S: 0 }).text).toBe('1/3');
    expect(grimThreshold({ T: 10, R: 3, P: 1, S: 0 }).text).toBe('7/9');
  });
  it('boundary δ = δ* counts as stable (weak inequality)', () => {
    expect(grimStable(textbook, 0.5)).toBe(true);
    expect(grimStable(textbook, 0.49)).toBe(false);
    expect(grimStable({ T: 4, R: 3, P: 1, S: 0 }, 1 / 3)).toBe(true);
  });
  it('present values', () => {
    expect(cooperationValue(textbook, 0.9)).toBeCloseTo(30);
    expect(deviationValue(textbook, 0.9)).toBeCloseTo(14);
  });
  it('TFT NE threshold = max{(T−R)/(T−P), (T−R)/(R−S)} = 2/3', () => {
    const t = tftThreshold(textbook);
    expect(t.alternate.text).toBe('2/3');
    expect(t.value.text).toBe('2/3');
  });
  it('finite horizon: SPE payoff N·P', () => {
    const r = analyzeRepeated({ ...textbook, mode: 'finite', rounds: 10 });
    expect(r).toMatchObject({ kind: 'finite', spePayoff: 10, cooperationPayoff: 30, uniqueStageNE: true });
  });
});

describe('engine', () => {
  const play = (params: PDParams, moves: [PDMove, PDMove][], seed = 1): PDState =>
    moves.reduce(
      (s, [a, b]) =>
        pdReducer(pdReducer(s, { type: 'commit', player: 0, move: a, round: s.history.length }), {
          type: 'commit',
          player: 1,
          move: b,
          round: s.history.length,
        }),
      createPDState(params, seed),
    );

  it('resolves a round only after both commits and keeps the first commit', () => {
    let s = createPDState({ ...textbook, mode: 'finite', rounds: 3 }, 1);
    s = pdReducer(s, { type: 'commit', player: 1, move: 'D', round: 0 });
    expect(s.history).toHaveLength(0);
    const again = pdReducer(s, { type: 'commit', player: 1, move: 'C', round: 0 });
    expect(again).toBe(s);
    expect(pdReducer(s, { type: 'commit', player: 0, move: 'C', round: 1 })).toBe(s);
    s = pdReducer(s, { type: 'commit', player: 0, move: 'C', round: 0 });
    expect(s.history[0]).toEqual({ moves: ['C', 'D'], payoffs: [0, 5] });
    expect(s.pending).toEqual([null, null]);
  });
  it('hides the opponent’s pending move in viewFor', () => {
    const s = pdReducer(createPDState(textbook, 1), { type: 'commit', player: 0, move: 'D', round: 0 });
    const v = viewFor(s, 1);
    expect(v.opponentCommitted).toBe(true);
    expect(v.ownPending).toBeNull();
    expect(JSON.stringify(v)).not.toContain('"D"');
  });
  it('finite game ends after N rounds; one-shot after 1', () => {
    const s = play({ ...textbook, mode: 'finite', rounds: 3 }, [['C', 'C'], ['C', 'D'], ['D', 'D']]);
    expect(s.status).toBe('finished');
    expect(totals(s.history)).toEqual([4, 9]);
    expect(pdReducer(s, { type: 'commit', player: 0, move: 'C', round: 3 })).toBe(s);
    expect(play({ ...textbook, mode: 'oneShot' }, [['D', 'D']]).endReason).toBe('oneShot');
  });
  it('discounted game stops at random, deterministically per seed, mean length ≈ 1/(1−δ)', () => {
    const params: PDParams = { ...textbook, mode: 'discounted', delta: 0.8 };
    let total = 0;
    const seeds = 4000;
    for (let seed = 0; seed < seeds; seed++) {
      let k = 1;
      while (!endAfter(params, seed, k)) k++;
      total += k;
    }
    expect(total / seeds).toBeGreaterThan(4.7);
    expect(total / seeds).toBeLessThan(5.3);
    expect(endAfter(params, 42, 3)).toBe(endAfter(params, 42, 3));
  });
});

describe('bots', () => {
  const ctx = (history: PDRound[], params: PDParams = textbook) => ({ params, history, me: 1 as const, seed: 7 });
  const r = (a: PDMove, b: PDMove): PDRound => ({ moves: [a, b], payoffs: [0, 0] });

  it('Tit-for-Tat copies the last move', () => {
    expect(PD_BOTS.tft.decide(ctx([]))).toBe('C');
    expect(PD_BOTS.tft.decide(ctx([r('D', 'C')]))).toBe('D');
    expect(PD_BOTS.tft.decide(ctx([r('D', 'C'), r('C', 'D')]))).toBe('C');
  });
  it('Grim Trigger never forgives', () => {
    expect(PD_BOTS.grim.decide(ctx([r('D', 'C'), r('C', 'D'), r('C', 'D')]))).toBe('D');
  });
  it('Pavlov: win-stay, lose-shift', () => {
    expect(PD_BOTS.pavlov.decide(ctx([r('C', 'C')]))).toBe('C');
    expect(PD_BOTS.pavlov.decide(ctx([r('D', 'C')]))).toBe('D'); // got S → shift
    expect(PD_BOTS.pavlov.decide(ctx([r('C', 'D')]))).toBe('D'); // got T → stay
    expect(PD_BOTS.pavlov.decide(ctx([r('D', 'D')]))).toBe('C'); // got P → shift
  });
  it('Economist: D in finite games, Grim Trigger when δ ≥ δ*', () => {
    expect(PD_BOTS.economist.decide(ctx([], { ...textbook, mode: 'finite' }))).toBe('D');
    expect(PD_BOTS.economist.decide(ctx([], { ...textbook, mode: 'discounted', delta: 0.6 }))).toBe('C');
    expect(PD_BOTS.economist.decide(ctx([], { ...textbook, mode: 'discounted', delta: 0.4 }))).toBe('D');
  });
  it('Learner (fictitious play) always plays the dominant D in a PD', () => {
    expect(PD_BOTS.learner.decide(ctx([r('C', 'D'), r('C', 'D')]))).toBe('D');
  });
  it('Fair cooperates iff opponent cooperation rate ≥ 50 %', () => {
    expect(PD_BOTS.fair.decide(ctx([r('C', 'C'), r('D', 'C')]))).toBe('C');
    expect(PD_BOTS.fair.decide(ctx([r('D', 'C'), r('D', 'C'), r('C', 'D')]))).toBe('D');
  });
  it('observationally equivalent bots are detected', () => {
    // human always cooperates ⇒ TFT, Grim, Pavlov, Fair, Naive all played C, C, C
    const hist = [r('C', 'C'), r('C', 'C'), r('C', 'C')];
    const ids = consistentBots({ params: textbook, history: hist, me: 1, seed: 7 });
    expect(ids).toEqual(expect.arrayContaining<PDBotId>(['tft', 'grim', 'pavlov', 'fair', 'naive']));
    expect(ids).not.toContain('economist');
  });
  it('each bot is consistent with its own play', () => {
    for (const id of PD_BOT_IDS) {
      const hist: PDRound[] = [];
      const human: PDMove[] = ['C', 'D', 'D', 'C', 'C', 'D'];
      for (const h of human) hist.push(r(h, PD_BOTS[id].decide({ params: textbook, history: hist, me: 1, seed: 3 })));
      expect(consistentBots({ params: textbook, history: hist, me: 1, seed: 3 })).toContain(id);
    }
  });
});

describe('match statistics and explanations', () => {
  const r = (a: PDMove, b: PDMove): PDRound => ({ moves: [a, b], payoffs: [0, 0] });
  it('detects coop streaks and endgame defection', () => {
    const s = matchStats([r('C', 'C'), r('C', 'C'), r('C', 'C'), r('D', 'C')]);
    expect(s.maxMutualCoopStreak).toBe(3);
    expect(s.endgameDefection).toBe(true);
    expect(s.coopRate).toEqual([0.75, 1]);
  });
  it('finite all-D is the SPE path', () => {
    const e = explainMatch({ ...textbook, mode: 'finite', rounds: 2 }, [r('D', 'D'), r('D', 'D')], ['A', 'B']);
    expect(e.verdict).toBe('ok');
  });
});

describe('exercises', () => {
  it('every exam generator produces a task whose own solution is accepted', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 40; i++) {
      for (const c of PD_EXAM_CONCEPTS) {
        const t = generatePDTask(c, rng);
        expect(t.concept).toBe(c);
        expect(t.solution.length).toBeGreaterThan(0);
        const res =
          t.answer.kind === 'number'
            ? { kind: 'number' as const, raw: String(t.answer.correct) }
            : t.answer.kind === 'choice'
              ? { kind: 'choice' as const, id: t.answer.correct }
              : { kind: 'multi' as const, ids: t.answer.correct };
        expect(checkAnswer(t.answer, res).correct).toBe(true);
      }
    }
  });
  it('stage NE prediction for the textbook PD is exactly {(D,D)}', () => {
    const t = stageNETask(textbook);
    expect(checkAnswer(t.answer, { kind: 'multi', ids: ['DD'] }).correct).toBe(true);
    expect(checkAnswer(t.answer, { kind: 'multi', ids: ['DD', 'CC'] }).correct).toBe(false);
    expect(checkAnswer(t.answer, { kind: 'multi', ids: [] }).correct).toBe(false);
  });
  it('δ* accepts 1/2, 0,5 and 0.5 but not 0.6', () => {
    const t = pdPredictionTasks({ ...textbook, mode: 'discounted', delta: 0.9 })[1];
    for (const raw of ['1/2', '0,5', '0.5', '0,50']) expect(checkAnswer(t.answer, { kind: 'number', raw }).correct).toBe(true);
    expect(checkAnswer(t.answer, { kind: 'number', raw: '0,6' }).correct).toBe(false);
  });
  it('2/3 accepts 0,67 but not 0,6', () => {
    const t = pdPredictionTasks({ T: 7, R: 5, P: 4, S: 0, mode: 'discounted', rounds: 1, delta: 0.9 })[1];
    expect(t.answer).toMatchObject({ kind: 'number', correctText: '2/3 ≈ 0,667' });
    expect(checkAnswer(t.answer, { kind: 'number', raw: '0,67' }).correct).toBe(true);
    expect(checkAnswer(t.answer, { kind: 'number', raw: '0,6' }).correct).toBe(false);
  });
  it('stage NE in variant games are computed (stag hunt has two)', () => {
    const t = stageNETask({ R: 4, T: 3, P: 2, S: 0 });
    expect(t.answer).toMatchObject({ correct: ['CC', 'DD'] });
  });
});
