/**
 * Exercise generators for the prisoner's dilemma family.
 * - `*Task(params)` builders use given parameters (predictions during play).
 * - `generatePDTask(concept, rng)` draws random parameters (exam mode).
 * All solutions are computed from the parameters.
 */
import {
  bestResponses,
  paretoDominators,
  paretoEfficientProfiles,
  profileLabel,
  pureNashEquilibria,
  strictlyDominantStrategy,
  type Bimatrix,
  type Profile,
} from '../../core/normalForm';
import { fractionWithDecimal, tex } from '../../core/numbers';
import { pick, randInt, shuffle, type Rng } from '../../core/rng';
import type { ConceptId } from '../../learning/concepts';
import { YES_NO, type Option, type Task } from '../../learning/tasks';
import { cooperationValue, deviationValue, grimStable, grimThreshold, tftThreshold } from './analysis';
import { discountedDerivation, finiteDerivation, stageDerivation } from './explain';
import { isPrisonersDilemma, pdBimatrix, type PDParams, type PDPayoffs } from './params';

const NAMES: [string, string] = ['Spieler A', 'Spieler B'];
const PROFILE_IDS = ['CC', 'CD', 'DC', 'DD'] as const;
const PROFILE_OPTIONS: Option[] = PROFILE_IDS.map((id) => ({ id, label: `(${id[0]}, ${id[1]})` }));
const profileId = (g: Bimatrix, p: Profile) => `${g.rowLabels[p[0]]}${g.colLabels[p[1]]}`;

let counter = 0;
const nextId = (concept: string) => `${concept}#${++counter}`;

/** TeX bimatrix for prompts. */
export function matrixTex(g: Bimatrix): string {
  const rows = g.rowLabels
    .map((r, i) => `${r} & ${g.payoffs[i].map(([a, b]) => `(${tex(a)},\\ ${tex(b)})`).join(' & ')}`)
    .join(' \\\\ ');
  return `$$\\begin{array}{c|${'c'.repeat(g.colLabels.length)}} A \\backslash B & ${g.colLabels.join(' & ')} \\\\ \\hline ${rows} \\end{array}$$`;
}

/** Generic underlining derivation for any 2-player bimatrix. */
export function underlineDerivation(g: Bimatrix): string[] {
  const linesA = g.colLabels.map((c, j) => {
    const vals = g.rowLabels.map((r, i) => `u_A(${r},${c}) = ${tex(g.payoffs[i][j][0])}`).join(',\\ ');
    const br = bestResponses(g, 0, j).map((i) => g.rowLabels[i]).join(', ');
    return `gegen ${c}: $${vals}$ ⇒ $BR_A(${c}) = \\{${br}\\}$`;
  });
  const linesB = g.rowLabels.map((r, i) => {
    const vals = g.colLabels.map((c, j) => `u_B(${r},${c}) = ${tex(g.payoffs[i][j][1])}`).join(',\\ ');
    const br = bestResponses(g, 1, i).map((j) => g.colLabels[j]).join(', ');
    return `gegen ${r}: $${vals}$ ⇒ $BR_B(${r}) = \\{${br}\\}$`;
  });
  const ne = pureNashEquilibria(g);
  return [
    `**Beste Antworten von A** (pro Spalte die höchste erste Zahl unterstreichen): ${linesA.join('; ')}.`,
    `**Beste Antworten von B** (pro Zeile die höchste zweite Zahl unterstreichen): ${linesB.join('; ')}.`,
    ne.length
      ? `**NE = Felder, in denen beide Zahlen unterstrichen sind**: ${ne.map((p) => profileLabel(g, p)).join(', ')}.`
      : `**Kein Feld hat zwei unterstrichene Zahlen** ⇒ kein NE in reinen Strategien (es existiert aber ein NE in gemischten Strategien).`,
  ];
}

// ---------- builders with given parameters ----------

export function stageNETask(p: PDPayoffs, withMatrix = true): Task {
  const g = pdBimatrix(p);
  const correct = pureNashEquilibria(g).map((q) => profileId(g, q));
  return {
    id: nextId('pd.stageNE'),
    concept: 'pd.stageNE',
    prompt:
      `Welche Strategieprofile sind **Nash-Gleichgewichte in reinen Strategien** des Stufenspiels? ` +
      `Mehrfachauswahl – wähle nichts, wenn es keines gibt.` +
      (withMatrix ? `\n${matrixTex(g)}` : ''),
    answer: { kind: 'multi', options: PROFILE_OPTIONS, correct, emptyMeaning: 'kein NE in reinen Strategien' },
    solution: underlineDerivation(g),
  };
}

export function backwardInductionPredictTask(params: PDParams): Task {
  const opts: Option[] = [
    { id: 'allD', label: 'In jeder Runde (D, D)' },
    { id: 'coopThenD', label: 'Kooperation bis zur letzten Runde, dort (D, D)' },
    { id: 'tft', label: 'Beide spielen Tit-for-Tat ⇒ immer (C, C)' },
    { id: 'depends', label: 'Hängt davon ab, wie der Gegner sich verhält' },
  ];
  return {
    id: nextId('pd.backwardInduction'),
    concept: 'pd.backwardInduction',
    prompt: `Das Spiel wird **${params.rounds}-mal** wiederholt und das Ende ist bekannt. Was wird im **teilspielperfekten Gleichgewicht** (SPE) gespielt?`,
    answer: { kind: 'choice', options: opts, correct: 'allD' },
    solution: finiteDerivation(params, {
      kind: 'finite',
      rounds: params.rounds,
      uniqueStageNE: true,
      spePayoff: params.rounds * params.P,
      cooperationPayoff: params.rounds * params.R,
    }),
  };
}

export function grimThresholdTask(params: PDParams): Task {
  const th = grimThreshold(params);
  const tft = tftThreshold(params);
  return {
    id: nextId('pd.grimThreshold'),
    concept: 'pd.grimThreshold',
    prompt:
      `Unendlich wiederholtes PD mit $T = ${tex(params.T)},\\ R = ${tex(params.R)},\\ P = ${tex(params.P)},\\ S = ${tex(params.S)}$. ` +
      `Ab welchem Diskontfaktor $\\delta^*$ ist Kooperation mit **Grim Trigger** ein SPE? (Bruch oder Dezimalzahl, z. B. 1/2 oder 0,5)`,
    answer: { kind: 'number', correct: th.value, absTol: 0.006, correctText: fractionWithDecimal(th).text },
    solution: discountedDerivation(params, {
      kind: 'discounted',
      delta: params.delta,
      expectedLength: 1 / (1 - params.delta),
      threshold: th,
      stable: grimStable(params, params.delta),
      coopValue: cooperationValue(params, params.delta),
      devValue: deviationValue(params, params.delta),
      tft,
      tftIsNash: params.delta >= tft.value.value,
    }).slice(1, 5),
  };
}

/** The prediction(s) asked before the first analysis in learning mode. */
export function pdPredictionTasks(params: PDParams): Task[] {
  const tasks = [stageNETask(params, false)];
  if (params.mode === 'finite') tasks.push(backwardInductionPredictTask(params));
  if (params.mode === 'discounted') tasks.push(grimThresholdTask(params));
  return tasks;
}

// ---------- random generators (exam mode) ----------

const DELTAS = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 0.95];

export function randomPDPayoffs(rng: Rng): PDPayoffs {
  const S = randInt(rng, -2, 2);
  const P = S + randInt(rng, 1, 3);
  const R = P + randInt(rng, 1, 4);
  const T = R + randInt(rng, 1, 5);
  return { T, R, P, S };
}

/** Four distinct integers, descending. */
const fourDistinct = (rng: Rng): [number, number, number, number] => {
  const v4 = randInt(rng, -2, 2);
  const v3 = v4 + randInt(rng, 1, 3);
  const v2 = v3 + randInt(rng, 1, 3);
  const v1 = v2 + randInt(rng, 1, 4);
  return [v1, v2, v3, v4];
};

type Family = 'pd' | 'stag' | 'chicken' | 'harmony' | 'deadlock';

/** Symmetric 2×2 games of the PD family, labelled with T,R,P,S positions. */
function familyPayoffs(rng: Rng, family: Family): PDPayoffs {
  const [a, b, c, d] = fourDistinct(rng);
  switch (family) {
    case 'pd':
      return { T: a, R: b, P: c, S: d };
    case 'stag':
      return { R: a, T: b, P: c, S: d };
    case 'chicken':
      return { T: a, R: b, S: c, P: d };
    case 'harmony':
      return { R: a, T: b, S: c, P: d };
    case 'deadlock':
      return { T: a, P: b, R: c, S: d };
  }
}

const randomFamily = (rng: Rng): Family =>
  rng() < 0.4 ? 'pd' : pick(rng, ['stag', 'chicken', 'harmony', 'deadlock'] as const);

function validityTask(rng: Rng): Task {
  const p = rng() < 0.5 ? familyPayoffs(rng, 'pd') : familyPayoffs(rng, pick(rng, ['stag', 'chicken', 'harmony', 'deadlock'] as const));
  const ok = isPrisonersDilemma(p);
  const check = (name: string, x: number, y: number, n2: string) =>
    `$${name} = ${tex(x)} ${x > y ? '>' : '\\le'} ${n2} = ${tex(y)}$ ${x > y ? '✓' : '✗'}`;
  return {
    id: nextId('pd.validity'),
    concept: 'pd.validity',
    prompt:
      `Ein symmetrisches 2×2-Spiel hat die Auszahlungen $T = ${tex(p.T)}$ (D gegen C), $R = ${tex(p.R)}$ (beide C), $P = ${tex(p.P)}$ (beide D), $S = ${tex(p.S)}$ (C gegen D). ` +
      `Ist es ein **Gefangenendilemma**?`,
    answer: { kind: 'choice', options: YES_NO, correct: ok ? 'yes' : 'no' },
    solution: [
      `Ein PD verlangt $T > R > P > S$ (Versuchung > Belohnung > Strafe > Gutgläubigen-Auszahlung).`,
      `Prüfen: ${check('T', p.T, p.R, 'R')}, ${check('R', p.R, p.P, 'P')}, ${check('P', p.P, p.S, 'S')}.`,
      ok
        ? `Alle Bedingungen erfüllt ⇒ **ja**, D ist strikt dominant und $(D,D)$ ist Pareto-ineffizient.`
        : `Mindestens eine Bedingung verletzt ⇒ **nein**, kein Gefangenendilemma (z. B. Stag Hunt, Chicken oder ein Spiel ohne Dilemma).`,
    ],
  };
}

function stageNEExam(rng: Rng): Task {
  return stageNETask(familyPayoffs(rng, randomFamily(rng)));
}

function dominanceTask(rng: Rng): Task {
  const g = pdBimatrix(familyPayoffs(rng, randomFamily(rng)));
  const d = strictlyDominantStrategy(g, 0);
  const opts: Option[] = [
    { id: 'C', label: 'Ja, C' },
    { id: 'D', label: 'Ja, D' },
    { id: 'none', label: 'Nein, keine' },
  ];
  const a = (r: number, c: number) => tex(g.payoffs[r][c][0]);
  const cmp = (x: number, y: number) => (x > y ? '>' : x < y ? '<' : '=');
  return {
    id: nextId('pd.dominance'),
    concept: 'pd.dominance',
    prompt: `Hat **Spieler A** (Zeile) eine **strikt dominante** Strategie?\n${matrixTex(g)}`,
    answer: { kind: 'choice', options: opts, correct: d === null ? 'none' : g.rowLabels[d] },
    solution: [
      `Vergleiche A's Auszahlungen von D und C spaltenweise:`,
      `Gegen C: $u_A(D,C) = ${a(1, 0)} ${cmp(g.payoffs[1][0][0], g.payoffs[0][0][0])} u_A(C,C) = ${a(0, 0)}$. Gegen D: $u_A(D,D) = ${a(1, 1)} ${cmp(g.payoffs[1][1][0], g.payoffs[0][1][0])} u_A(C,D) = ${a(0, 1)}$.`,
      d === null
        ? `Die Vergleiche gehen in verschiedene Richtungen ⇒ **keine** strikt dominante Strategie; die beste Antwort hängt vom Gegner ab.`
        : `${g.rowLabels[d]} ist in beiden Spalten echt besser ⇒ **${g.rowLabels[d]} ist strikt dominant**.`,
    ],
  };
}

function paretoTask(rng: Rng): Task {
  const g = pdBimatrix(familyPayoffs(rng, randomFamily(rng)));
  const eff = paretoEfficientProfiles(g);
  const all: Profile[] = [[0, 0], [0, 1], [1, 0], [1, 1]];
  return {
    id: nextId('pd.pareto'),
    concept: 'pd.pareto',
    prompt: `Welche Strategieprofile sind **Pareto-effizient**? (Mehrfachauswahl)\n${matrixTex(g)}`,
    answer: { kind: 'multi', options: PROFILE_OPTIONS, correct: eff.map((q) => profileId(g, q)) },
    solution: [
      `Ein Profil ist Pareto-effizient, wenn kein anderes Profil alle mindestens gleich und einen echt besser stellt.`,
      ...all.map((q) => {
        const dom = paretoDominators(g, q);
        const [x, y] = g.payoffs[q[0]][q[1]];
        return dom.length
          ? `${profileLabel(g, q)} mit $(${tex(x)}, ${tex(y)})$ wird von ${dom.map((r) => profileLabel(g, r)).join(', ')} Pareto-dominiert ⇒ ineffizient.`
          : `${profileLabel(g, q)} mit $(${tex(x)}, ${tex(y)})$: kein Profil dominiert ⇒ **effizient**.`;
      }),
    ],
  };
}

function backwardInductionExam(rng: Rng): Task {
  const p = randomPDPayoffs(rng);
  const N = randInt(rng, 3, 20);
  const params: PDParams = { ...p, mode: 'finite', rounds: N, delta: 0.9 };
  return {
    id: nextId('pd.backwardInduction'),
    concept: 'pd.backwardInduction',
    prompt:
      `Das PD mit $T = ${tex(p.T)},\\ R = ${tex(p.R)},\\ P = ${tex(p.P)},\\ S = ${tex(p.S)}$ wird **${N}-mal** wiederholt (bekanntes Ende, keine Diskontierung). ` +
      `Welche **Gesamtauszahlung** erhält Spieler A im teilspielperfekten Gleichgewicht?`,
    answer: { kind: 'number', correct: N * p.P, absTol: 0.001 },
    solution: [...stageDerivation(p, NAMES).slice(2), ...finiteDerivation(params, {
      kind: 'finite',
      rounds: N,
      uniqueStageNE: true,
      spePayoff: N * p.P,
      cooperationPayoff: N * p.R,
    }).slice(1, 5)],
  };
}

function discountedValueTask(rng: Rng): Task {
  const p = randomPDPayoffs(rng);
  const delta = pick(rng, DELTAS);
  const coop = rng() < 0.5;
  const d = tex(delta);
  const value = coop ? cooperationValue(p, delta) : deviationValue(p, delta);
  return {
    id: nextId('pd.discountedValue'),
    concept: 'pd.discountedValue',
    prompt: coop
      ? `Unendlich wiederholtes PD mit $R = ${tex(p.R)}$ und $\\delta = ${d}$. Wie groß ist der **Barwert** (present value) eines Spielers, wenn beide für immer kooperieren? (Runde auf 2 Nachkommastellen)`
      : `Unendlich wiederholtes PD mit $T = ${tex(p.T)},\\ P = ${tex(p.P)}$ und $\\delta = ${d}$. Der Gegner spielt Grim Trigger. Wie groß ist der **Barwert**, wenn du sofort abweichst und danach immer D spielst? (2 Nachkommastellen)`,
    answer: { kind: 'number', correct: value, absTol: 0.011, relTol: 0.001 },
    solution: coop
      ? [
          `Geometrische Reihe: $V^C = R \\sum_{t=0}^{\\infty} \\delta^t = \\frac{R}{1-\\delta}$.`,
          `$V^C = \\frac{${tex(p.R)}}{1-${d}} = ${tex(value, 2)}$`,
        ]
      : [
          `Heute $T$, danach bestraft Grim Trigger für immer mit D, die beste Antwort darauf ist D ⇒ ab morgen $P$ pro Runde.`,
          `$V^D = T + \\delta P + \\delta^2 P + \\dots = T + \\frac{\\delta P}{1-\\delta} = ${tex(p.T)} + \\frac{${d} \\cdot ${tex(p.P)}}{1-${d}} = ${tex(value, 2)}$`,
        ],
  };
}

function grimThresholdExam(rng: Rng): Task {
  const p = randomPDPayoffs(rng);
  return grimThresholdTask({ ...p, mode: 'discounted', rounds: 10, delta: pick(rng, DELTAS) });
}

function grimStableTask(rng: Rng): Task {
  const p = randomPDPayoffs(rng);
  const th = grimThreshold(p);
  // occasionally hit the boundary δ = δ* exactly (≥ ⇒ stable)
  const boundary = DELTAS.find((x) => Math.abs(x - th.value) < 1e-12);
  const delta = boundary !== undefined && rng() < 0.3 ? boundary : pick(rng, DELTAS);
  const stable = grimStable(p, delta);
  const thd = fractionWithDecimal(th);
  return {
    id: nextId('pd.grimStable'),
    concept: 'pd.grimStable',
    prompt:
      `Unendlich wiederholtes PD mit $T = ${tex(p.T)},\\ R = ${tex(p.R)},\\ P = ${tex(p.P)},\\ S = ${tex(p.S)}$ und $\\delta = ${tex(delta)}$. ` +
      `Ist dauerhafte Kooperation mit **Grim Trigger** ein teilspielperfektes Gleichgewicht?`,
    answer: { kind: 'choice', options: YES_NO, correct: stable ? 'yes' : 'no' },
    solution: [
      `Bedingung: $\\frac{R}{1-\\delta} \\ge T + \\frac{\\delta P}{1-\\delta} \\iff \\delta \\ge \\delta^* = \\frac{T-R}{T-P} = \\frac{${tex(p.T)}-${tex(p.R)}}{${tex(p.T)}-${tex(p.P)}} = ${thd.tex}$`,
      stable
        ? `$\\delta = ${tex(delta)} \\ge ${thd.tex}$ ⇒ **ja**, stabil${Math.abs(delta - th.value) < 1e-12 ? ' (Grenzfall: Gleichheit genügt, der Spieler ist indifferent)' : ''}.`
        : `$\\delta = ${tex(delta)} < ${thd.tex}$ ⇒ **nein**, die Abweichung lohnt sich.`,
    ],
  };
}

function tftThresholdTask(rng: Rng): Task {
  const p = randomPDPayoffs(rng);
  const t = tftThreshold(p);
  const a = fractionWithDecimal(t.alwaysD);
  const b = fractionWithDecimal(t.alternate);
  const v = fractionWithDecimal(t.value);
  return {
    id: nextId('pd.tftThreshold'),
    concept: 'pd.tftThreshold',
    prompt:
      `Unendlich wiederholtes PD mit $T = ${tex(p.T)},\\ R = ${tex(p.R)},\\ P = ${tex(p.P)},\\ S = ${tex(p.S)}$. ` +
      `Ab welchem $\\delta$ ist (Tit-for-Tat, Tit-for-Tat) ein **Nash-Gleichgewicht**?`,
    answer: { kind: 'number', correct: t.value.value, absTol: 0.006, correctText: v.text },
    solution: [
      `Gegen TFT hängt alles nur vom eigenen letzten Zug ab. Es reicht, drei stationäre Antworten zu vergleichen: immer C, immer D, abwechselnd D/C.`,
      `Immer C vs. immer D: $\\frac{R}{1-\\delta} \\ge T + \\frac{\\delta P}{1-\\delta} \\iff \\delta \\ge \\frac{T-R}{T-P} = ${a.tex}$`,
      `Immer C vs. abwechselnd: $\\frac{R}{1-\\delta} \\ge \\frac{T + \\delta S}{1-\\delta^2} \\iff R(1+\\delta) \\ge T + \\delta S \\iff \\delta \\ge \\frac{T-R}{R-S} = ${b.tex}$`,
      `Beide müssen gelten ⇒ $\\delta \\ge \\max\\{${a.tex},\\ ${b.tex}\\} = ${v.tex}$`,
    ],
  };
}

const GENERATORS: Record<string, (rng: Rng) => Task> = {
  'pd.validity': validityTask,
  'pd.dominance': dominanceTask,
  'pd.stageNE': stageNEExam,
  'pd.pareto': paretoTask,
  'pd.backwardInduction': backwardInductionExam,
  'pd.discountedValue': discountedValueTask,
  'pd.grimThreshold': grimThresholdExam,
  'pd.grimStable': grimStableTask,
  'pd.tftThreshold': tftThresholdTask,
};

export function generatePDTask(concept: ConceptId, rng: Rng): Task {
  const gen = GENERATORS[concept];
  if (!gen) throw new Error(`Kein Generator für ${concept}`);
  return gen(rng);
}

export const PD_EXAM_CONCEPTS = Object.keys(GENERATORS) as ConceptId[];

/** Exam set: every concept once in random order (then random repeats). */
export function pdExamConcepts(rng: Rng, n: number): ConceptId[] {
  const base = shuffle(rng, PD_EXAM_CONCEPTS);
  while (base.length < n) base.push(pick(rng, PD_EXAM_CONCEPTS));
  return base.slice(0, n);
}

