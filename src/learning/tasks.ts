/** Generic exercise format shared by "Erst tippen, dann sehen" and the exam mode. */
import { approxEq, fmt, parseNumberInput } from '../core/numbers';
import type { ConceptId } from './concepts';

export interface Option {
  id: string;
  label: string;
}

export type AnswerSpec =
  | { kind: 'number'; correct: number; absTol: number; relTol?: number; /** shown with the solution */ correctText?: string }
  | { kind: 'choice'; options: Option[]; correct: string }
  /** Multiple selection. An empty selection is a valid answer (e.g. "no pure NE"). */
  | { kind: 'multi'; options: Option[]; correct: string[]; emptyMeaning?: string };

export type AnswerResponse =
  | { kind: 'number'; raw: string }
  | { kind: 'choice'; id: string | null }
  | { kind: 'multi'; ids: string[] }
  | { kind: 'timeout' };

export interface Task {
  id: string;
  concept: ConceptId;
  /** RichText: $tex$, $$display$$, **bold** */
  prompt: string;
  answer: AnswerSpec;
  /** exam-style solution steps (RichText) */
  solution: string[];
}

export interface CheckResult {
  correct: boolean;
  given: string;
  expected: string;
}

const labelOf = (opts: Option[], id: string) => opts.find((o) => o.id === id)?.label ?? id;

export function expectedText(spec: AnswerSpec): string {
  switch (spec.kind) {
    case 'number':
      return spec.correctText ?? fmt(spec.correct, 4);
    case 'choice':
      return labelOf(spec.options, spec.correct);
    case 'multi':
      return spec.correct.length ? spec.correct.map((id) => labelOf(spec.options, id)).join(', ') : (spec.emptyMeaning ?? 'keine');
  }
}

export function checkAnswer(spec: AnswerSpec, res: AnswerResponse): CheckResult {
  const expected = expectedText(spec);
  if (res.kind === 'timeout') return { correct: false, given: '⏰ Zeit abgelaufen', expected };
  if (spec.kind === 'number' && res.kind === 'number') {
    const v = parseNumberInput(res.raw);
    if (v === null) return { correct: false, given: res.raw.trim() || '(leer)', expected };
    const tol = Math.max(spec.absTol, (spec.relTol ?? 0) * Math.abs(spec.correct));
    return { correct: Math.abs(v - spec.correct) <= tol || approxEq(v, spec.correct), given: res.raw.trim(), expected };
  }
  if (spec.kind === 'choice' && res.kind === 'choice') {
    return { correct: res.id === spec.correct, given: res.id ? labelOf(spec.options, res.id) : '(keine Auswahl)', expected };
  }
  if (spec.kind === 'multi' && res.kind === 'multi') {
    const a = [...new Set(res.ids)].sort();
    const b = [...spec.correct].sort();
    return {
      correct: a.length === b.length && a.every((x, i) => x === b[i]),
      given: a.length ? a.map((id) => labelOf(spec.options, id)).join(', ') : (spec.emptyMeaning ?? 'keine'),
      expected,
    };
  }
  return { correct: false, given: '(ungültig)', expected };
}

export const YES_NO: Option[] = [
  { id: 'yes', label: 'Ja' },
  { id: 'no', label: 'Nein' },
];
