/**
 * Turns the computed analysis into explanations: a 2–3 sentence summary and an
 * exam-style derivation. Strings use the RichText mini-format:
 * $inline TeX$, $$display TeX$$, **bold**.
 */
import { profileLabel, type Profile } from '../../core/normalForm';
import { fmt, fractionWithDecimal, tex } from '../../core/numbers';
import {
  analyzeRepeated,
  analyzeStage,
  matchStats,
  onGrimPath,
  type DiscountedAnalysis,
  type FiniteAnalysis,
  type StageAnalysis,
} from './analysis';
import type { PDRound } from './engine';
import { moveFromIndex, type PDMove, type PDParams, type PDPayoffs } from './params';

export type Names = [string, string];

export interface Explanation {
  verdict: 'ok' | 'warn' | 'info';
  headline: string;
  summary: string[];
  derivation: string[];
}

const moveName = (m: PDMove) => (m === 'C' ? 'C (kooperieren)' : 'D (defektieren)');
const prof = (a: StageAnalysis, p: Profile) => profileLabel(a.game, p);
const pay = (a: StageAnalysis, p: Profile) => {
  const [x, y] = a.game.payoffs[p[0]][p[1]];
  return `(${fmt(x)}, ${fmt(y)})`;
};

/** Steps 1–3 of every PD derivation: underlining best responses ⇒ dominance ⇒ unique NE. */
export function stageDerivation(p: PDPayoffs, names: Names): string[] {
  const { T, R, P, S } = p;
  const [A, B] = names.map((n, i) => {
    const role = `Spieler ${i === 0 ? 'A' : 'B'}`;
    return n === role ? role : `${role} (${n})`;
  });
  return [
    `**Schritt 1 – Beste Antworten von ${A}** (Unterstreichungsmethode / best responses): ` +
      `Gegen C: $u_A(D,C) = T = ${tex(T)} > u_A(C,C) = R = ${tex(R)}$ ⇒ $BR_A(C) = D$. ` +
      `Gegen D: $u_A(D,D) = P = ${tex(P)} > u_A(C,D) = S = ${tex(S)}$ ⇒ $BR_A(D) = D$.`,
    `**Schritt 2 – Beste Antworten von ${B}**: Das Spiel ist symmetrisch, also ebenso $BR_B(C) = D$ und $BR_B(D) = D$.`,
    `**Schritt 3 – Dominanz und NE**: Wegen $T > R$ und $P > S$ ist D für beide **strikt dominant** (strictly dominant strategy). ` +
      `Einziges Nash-Gleichgewicht: $(D,D)$ mit Auszahlungen $(P,P) = (${tex(P)}, ${tex(P)})$. ` +
      `Da C strikt dominiert ist, wird C in keinem NE mit positiver Wahrscheinlichkeit gespielt – es gibt also auch kein gemischtes NE.`,
  ];
}

function paretoSentence(a: StageAnalysis): string {
  const opt = a.social.profiles.map((q) => prof(a, q)).join(' bzw. ');
  if (!a.playedParetoEfficient) {
    const dom = a.paretoDominatedBy.map((q) => `${prof(a, q)} mit ${pay(a, q)}`).join(' oder ');
    return `Das Ergebnis ist **Pareto-ineffizient**: ${dom} würde beide mindestens gleich und einen echt besser stellen. Zum sozialen Optimum ${opt} fehlen euch zusammen ${fmt(a.welfareGap)} Punkte.`;
  }
  if (a.welfareGap > 0) {
    return `Das Ergebnis ist Pareto-effizient (niemand kann besser gestellt werden, ohne den anderen schlechter zu stellen), aber die Gesamtauszahlung ${fmt(a.playedTotal)} liegt ${fmt(a.welfareGap)} unter dem sozialen Optimum ${opt}.`;
  }
  return `Das Ergebnis ist Pareto-effizient und maximiert die Gesamtauszahlung (soziales Optimum).`;
}

export function explainRound(params: PDParams, moves: [PDMove, PDMove], names: Names): Explanation {
  const a = analyzeStage(params, moves);
  const played = prof(a, a.played);
  const summary: string[] = [];

  if (a.isNash) {
    summary.push(
      `Keiner von euch hätte sich durch einseitiges Abweichen verbessern können – D ist für beide eine strikt dominante Strategie.`,
    );
  } else {
    a.deviations.forEach((d, i) => {
      if (d.gain > 0 && d.bestDeviation !== null) {
        summary.push(
          `**${names[i]}** hätte mit ${moveFromIndex(d.bestDeviation)} statt ${moves[i]} **${fmt(d.gain)} mehr** bekommen (Abweichungsgewinn).`,
        );
      }
    });
  }
  summary.push(paretoSentence(a));
  if (a.isNash && !a.playedParetoEfficient) summary.push(`Genau das ist das Dilemma: individuell rational, kollektiv schlecht.`);

  // Repeated-game context (does not change the stage verdict, but its interpretation)
  if (params.mode === 'discounted' && !a.isNash) {
    if (onGrimPath(params, moves)) {
      summary.push(
        `Im wiederholten Spiel ist $(C,C)$ trotzdem rational: Mit δ = ${fmt(params.delta)} ≥ δ* ist es der Pfad des Grim-Trigger-SPE.`,
      );
    } else if (moves[0] !== moves[1]) {
      summary.push(`Unter Grim Trigger würde jetzt die Bestrafungsphase beginnen: ab sofort für immer $(D,D)$.`);
    }
  }
  if (params.mode === 'finite' && !a.isNash) {
    summary.push(`Im endlich wiederholten Spiel gibt es dafür keine Rechtfertigung: Das einzige SPE spielt in jeder Runde $(D,D)$.`);
  }

  const derivation = [...stageDerivation(params, names)];
  const devLines = a.deviations.map((d, i) => {
    const who = names[i];
    if (d.gain === 0) return `${who}: spielt bereits eine beste Antwort, Abweichungsgewinn $0$.`;
    const alt = moveFromIndex(d.bestDeviation!);
    const altProfile: Profile = i === 0 ? [d.bestDeviation!, a.played[1]] : [a.played[0], d.bestDeviation!];
    const uAlt = a.game.payoffs[altProfile[0]][altProfile[1]][i];
    const uNow = a.game.payoffs[a.played[0]][a.played[1]][i];
    return `${who}: Wechsel ${moves[i]} → ${alt} bringt $${tex(uAlt)} - ${tex(uNow)} = ${tex(d.gain)}$.`;
  });
  derivation.push(
    `**Schritt 4 – Gespieltes Profil ${played}** mit Auszahlungen ${pay(a, a.played)}: ${a.isNash ? 'ist' : 'ist **kein**'} NE. ${devLines.join(' ')}`,
  );
  derivation.push(
    `**Schritt 5 – Pareto-Vergleich**: Pareto-effizient sind ${a.paretoEfficient.map((q) => prof(a, q)).join(', ')}. ` +
      `$(C,C)$ Pareto-dominiert $(D,D)$, weil $R = ${tex(params.R)} > P = ${tex(params.P)}$. ` +
      `Soziales Optimum (max. Summe): ${a.social.profiles.map((q) => prof(a, q)).join(', ')} mit ${fmt(a.social.total)}.`,
  );

  return {
    verdict: a.isNash ? 'ok' : 'warn',
    headline: a.isNash ? `Nash-Gleichgewicht gespielt: ${played}` : `Kein Nash-Gleichgewicht des Stufenspiels: ${played}`,
    summary,
    derivation,
  };
}

export function finiteDerivation(params: PDParams, r: FiniteAnalysis): string[] {
  const N = r.rounds;
  return [
    `Das Stufenspiel wird $N = ${N}$-mal wiederholt, das Ende ist **allen bekannt** (finitely repeated game).`,
    `**Runde N**: Danach kommt nichts mehr – Drohungen und Versprechen für die Zukunft sind wertlos. Es wird das Stufenspiel gespielt, dessen eindeutiges NE $(D,D)$ ist.`,
    `**Runde N−1**: Das Verhalten in Runde N hängt nicht davon ab, was jetzt passiert (dort wird ohnehin $(D,D)$ gespielt). Kooperation lohnt sich also auch hier nicht als „Investition“ ⇒ wieder $(D,D)$.`,
    `**Induktion (Rückwärtsinduktion / backward induction)**: Für jede Runde $t = N, N-1, \\dots, 1$ gilt dasselbe. Einziges teilspielperfektes GG (SPE): **in jeder Runde und nach jeder Vorgeschichte D**.`,
    `SPE-Auszahlung je Spieler: $N \\cdot P = ${N} \\cdot ${tex(params.P)} = ${tex(r.spePayoff)}$ – statt $N \\cdot R = ${tex(r.cooperationPayoff)}$ bei durchgehender Kooperation.`,
    `**Warum gilt das?** Weil das Stufenspiel ein *eindeutiges* NE hat. „Wenn du defektierst, bestrafe ich dich später“ ist eine **leere Drohung** (non-credible threat): In der letzten Runde würde niemand sie ausführen.`,
    `Hinweis: Im Experiment kooperieren Menschen oft trotzdem lange und defektieren erst kurz vor Schluss (Endspieleffekt). Das widerspricht der SPE-Vorhersage, nicht der Logik.`,
  ];
}

export function discountedDerivation(params: PDParams, r: DiscountedAnalysis): string[] {
  const { T, R, P, S } = params;
  const d = tex(r.delta);
  const th = fractionWithDecimal(r.threshold);
  const tftA = fractionWithDecimal(r.tft.alwaysD);
  const tftB = fractionWithDecimal(r.tft.alternate);
  return [
    `Nach jeder Runde geht es mit Wahrscheinlichkeit $\\delta = ${d}$ weiter. Für risikoneutrale Spieler ist das äquivalent zu einem **unendlich wiederholten Spiel mit Diskontfaktor δ**. Erwartete Länge: $\\frac{1}{1-\\delta} = ${tex(r.expectedLength, 2)}$ Runden.`,
    `**Grim Trigger**: Spiele C, solange beide immer C gespielt haben; nach der ersten Abweichung für immer D.`,
    `**Barwert der Kooperation**: $V^C = R + \\delta R + \\delta^2 R + \\dots = \\frac{R}{1-\\delta} = \\frac{${tex(R)}}{1-${d}} = ${tex(r.coopValue, 2)}$`,
    `**Beste Abweichung** (einmal D, danach Bestrafung mit $(D,D)$): $V^D = T + \\frac{\\delta P}{1-\\delta} = ${tex(T)} + \\frac{${d} \\cdot ${tex(P)}}{1-${d}} = ${tex(r.devValue, 2)}$`,
    `**Bedingung** $V^C \\ge V^D$: $$\\frac{R}{1-\\delta} \\ge T + \\frac{\\delta P}{1-\\delta} \\iff R \\ge (1-\\delta)T + \\delta P \\iff \\delta \\ge \\frac{T-R}{T-P} = \\frac{${tex(T)}-${tex(R)}}{${tex(T)}-${tex(P)}} = ${th.tex}$$`,
    r.stable
      ? `**Einsetzen**: $\\delta = ${d} \\ge \\delta^* = ${th.tex}$ ⇒ ✅ Kooperation ist mit Grim Trigger stabil. Die Strafphase $(D,D)$ ist ein NE des Stufenspiels und damit glaubwürdig ⇒ nach dem One-Shot-Deviation-Prinzip ist Grim Trigger ein **SPE** (Folk-Theorem).`
      : `**Einsetzen**: $\\delta = ${d} < \\delta^* = ${th.tex}$ ⇒ ❌ Kooperation ist **nicht** stabil. Da Grim Trigger bereits die härteste mögliche Strafe nutzt (Minmax-Auszahlung $P$ für immer), kann dann *kein* SPE dauerhafte Kooperation stützen. Es bleibt „immer D“.`,
    `**Zusatz – Tit-for-Tat**: TFT gegen TFT ist ein NE (i. A. aber kein SPE), wenn weder „immer D“ ($\\delta \\ge \\frac{T-R}{T-P} = ${tftA.tex}$) noch „abwechselnd D, C“ ($\\delta \\ge \\frac{T-R}{R-S} = \\frac{${tex(T)}-${tex(R)}}{${tex(R)}-${tex(S)}} = ${tftB.tex}$) lohnt. Hier: ${r.tftIsNash ? '✅ erfüllt' : '❌ nicht erfüllt'}.`,
  ];
}

export function repeatedDerivation(params: PDParams): string[] {
  const r = analyzeRepeated(params);
  if (r.kind === 'finite') return finiteDerivation(params, r);
  if (r.kind === 'discounted') return discountedDerivation(params, r);
  return [];
}

/** One-line context for the round screen. */
export function repeatedHint(params: PDParams, roundNumber: number): string | null {
  const r = analyzeRepeated(params);
  if (r.kind === 'finite')
    return `Runde ${roundNumber} von ${r.rounds}: Im teilspielperfekten GG wird hier – wie in jeder Runde – $(D,D)$ gespielt (Rückwärtsinduktion).`;
  if (r.kind === 'discounted') {
    const th = fractionWithDecimal(r.threshold);
    return r.stable
      ? `δ = ${fmt(r.delta)} ≥ δ* = ${th.text}: Kooperation kann mit Grim Trigger als SPE gestützt werden.`
      : `δ = ${fmt(r.delta)} < δ* = ${th.text}: Kooperation ist mit keiner Strafstrategie stabil – die Zukunft wiegt zu wenig.`;
  }
  return null;
}

export function explainMatch(params: PDParams, history: PDRound[], names: Names): Explanation {
  const s = matchStats(history);
  const r = analyzeRepeated(params);
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  const summary: string[] = [
    `${s.rounds} Runde${s.rounds === 1 ? '' : 'n'}; Kooperationsquote ${names[0]}: ${pct(s.coopRate[0])}, ${names[1]}: ${pct(s.coopRate[1])}. Beidseitige Kooperation in ${s.mutualCoop}, beidseitige Defektion in ${s.mutualDefect} Runden.`,
  ];
  let verdict: Explanation['verdict'] = 'info';
  let headline = 'Auswertung';
  if (r.kind === 'oneShot') {
    const a = analyzeStage(params, history[0].moves);
    verdict = a.isNash ? 'ok' : 'warn';
    headline = a.isNash ? 'Ihr habt das Nash-Gleichgewicht gespielt' : 'Abweichung vom Nash-Gleichgewicht';
  } else if (r.kind === 'finite') {
    const onPath = s.mutualDefect === s.rounds;
    verdict = onPath ? 'ok' : 'warn';
    headline = onPath ? 'Exakt der SPE-Pfad: immer (D,D)' : 'Abweichung vom teilspielperfekten GG';
    summary.push(
      `Die SPE-Vorhersage (Rückwärtsinduktion) war $(D,D)$ in allen ${r.rounds} Runden, also je ${fmt(r.spePayoff)} Punkte. Volle Kooperation hätte je ${fmt(r.cooperationPayoff)} gebracht.`,
    );
    if (s.endgameDefection) summary.push(`Typischer **Endspieleffekt**: lange kooperiert, am Ende defektiert – genau die Logik der letzten Runde.`);
  } else {
    const coopPath = s.mutualCoop === s.rounds;
    const defPath = s.mutualDefect === s.rounds;
    verdict = (r.stable && (coopPath || defPath)) || (!r.stable && defPath) ? 'ok' : 'warn';
    headline = r.stable
      ? coopPath
        ? 'Kooperation durchgehalten – ein SPE-Pfad (Grim Trigger)'
        : defPath
          ? '„Immer D“ – ebenfalls ein SPE, aber Pareto-schlechter'
          : 'Gemischter Verlauf'
      : defPath
        ? 'Immer (D,D) – das einzige SPE-Ergebnis bei kleinem δ'
        : 'Kooperation trotz zu kleinem δ';
    summary.push(
      `Das Spiel endete zufällig nach ${s.rounds} Runden (erwartet: ${fmt(r.expectedLength, 1)}). Kritischer Diskontfaktor δ* = ${fractionWithDecimal(r.threshold).text}, gespielt mit δ = ${fmt(r.delta)}.`,
    );
  }
  return { verdict, headline, summary, derivation: repeatedDerivation(params) };
}

export { moveName };
