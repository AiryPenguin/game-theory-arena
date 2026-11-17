import { useState } from 'react';
import { type AnswerResponse, type CheckResult, type Task } from '../learning/tasks';
import { Button, Choice, inputClass } from './basics';
import { Derivation } from './feedback';
import { RichText } from './RichText';

/** Input for a single task. Calls onSubmit with the response; shows nothing about correctness. */
export function AnswerInput({ task, onSubmit, submitLabel = 'Antwort abgeben' }: { task: Task; onSubmit: (r: AnswerResponse) => void; submitLabel?: string }) {
  const [raw, setRaw] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [multi, setMulti] = useState<string[]>([]);
  const a = task.answer;

  const submit = () => {
    if (a.kind === 'number') onSubmit({ kind: 'number', raw });
    else if (a.kind === 'choice') onSubmit({ kind: 'choice', id: choice });
    else onSubmit({ kind: 'multi', ids: multi });
  };
  const canSubmit = a.kind === 'number' ? raw.trim() !== '' : a.kind === 'choice' ? choice !== null : true;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) submit();
      }}
    >
      {a.kind === 'number' && (
        <input
          className={inputClass}
          inputMode="text"
          autoComplete="off"
          placeholder="z. B. 0,5 oder 1/2"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-label="Antwort"
        />
      )}
      {a.kind === 'choice' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {a.options.map((o) => (
            <Choice key={o.id} selected={choice === o.id} onClick={() => setChoice(o.id)}>
              <RichText text={o.label} />
            </Choice>
          ))}
        </div>
      )}
      {a.kind === 'multi' && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {a.options.map((o) => (
              <Choice
                key={o.id}
                selected={multi.includes(o.id)}
                onClick={() => setMulti((m) => (m.includes(o.id) ? m.filter((x) => x !== o.id) : [...m, o.id]))}
                className="text-center"
              >
                <RichText text={o.label} />
              </Choice>
            ))}
          </div>
          {multi.length === 0 && a.emptyMeaning && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Keine Auswahl bedeutet: {a.emptyMeaning}.</p>
          )}
        </>
      )}
      <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
        {submitLabel}
      </Button>
    </form>
  );
}

export function ResultBox({ result, points }: { result: CheckResult; points?: number }) {
  return (
    <div
      className={`rounded-xl p-3 text-sm ring-1 ${
        result.correct
          ? 'bg-emerald-50 ring-emerald-300 dark:bg-emerald-950/50 dark:ring-emerald-700'
          : 'bg-rose-50 ring-rose-300 dark:bg-rose-950/50 dark:ring-rose-700'
      }`}
    >
      <p className="font-bold">
        {result.correct ? '✅ Richtig' : '❌ Leider falsch'}
        {points !== undefined && result.correct && <span className="ml-2 text-emerald-700 dark:text-emerald-300">+{points} Bonus</span>}
      </p>
      <p className="mt-1">
        Deine Antwort: <strong>{result.given}</strong>
      </p>
      {!result.correct && (
        <p>
          Richtig wäre: <strong>{result.expected}</strong>
        </p>
      )}
    </div>
  );
}

/** Prompt + input, or (once `result` is set) result and solution. Controlled by the parent. */
export function TaskCard({ task, result, onSubmit }: { task: Task; result: CheckResult | null; onSubmit: (r: AnswerResponse) => void }) {
  return (
    <div className="space-y-4">
      <div className="leading-relaxed">
        <RichText text={task.prompt} />
      </div>
      {!result ? (
        <AnswerInput key={task.id} task={task} onSubmit={onSubmit} />
      ) : (
        <>
          <ResultBox result={result} />
          <Derivation steps={task.solution} title="Lösung mit Rechenweg" open />
        </>
      )}
    </div>
  );
}
