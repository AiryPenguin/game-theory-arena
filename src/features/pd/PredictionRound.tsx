import { useState } from 'react';
import type { Player } from '../../core/types';
import { checkAnswer, type CheckResult, type Task } from '../../learning/tasks';
import { Button, Card, H2 } from '../../ui/basics';
import { Curtain, Derivation } from '../../ui/feedback';
import { RichText } from '../../ui/RichText';
import { AnswerInput } from '../../ui/TaskCard';

export interface PredictionResults {
  /** results[player][taskIndex] */
  byPlayer: Partial<Record<Player, CheckResult[]>>;
}

/**
 * "Erst tippen, dann sehen": every human answers all tasks (hot-seat: one after another
 * behind a curtain), then the solutions are shown to everybody.
 */
export function PredictionRound({
  tasks,
  humans,
  names,
  bonus,
  onDone,
}: {
  tasks: Task[];
  humans: Player[];
  names: [string, string];
  bonus: number;
  onDone: (r: PredictionResults) => void;
}) {
  const [h, setH] = useState(0);
  const [t, setT] = useState(0);
  const [results, setResults] = useState<PredictionResults['byPlayer']>({});
  const [curtainDone, setCurtainDone] = useState<number>(-1);
  const finished = h >= humans.length;
  const player = humans[h];

  if (!finished && humans.length > 1 && curtainDone !== h) {
    return (
      <Curtain
        name={names[player]}
        message="Erst tippen, dann sehen: Gib deine Vorhersage ab, ohne dass die anderen zusehen."
        onReady={() => setCurtainDone(h)}
      />
    );
  }

  if (!finished) {
    const task = tasks[t];
    return (
      <Card>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
          Erst tippen, dann sehen · {names[player]} · Frage {t + 1}/{tasks.length}
        </p>
        <H2>Deine Vorhersage</H2>
        <div className="mb-4 leading-relaxed">
          <RichText text={task.prompt} />
        </div>
        <AnswerInput
          key={`${h}-${t}`}
          task={task}
          submitLabel="Festlegen"
          onSubmit={(res) => {
            const r = checkAnswer(task.answer, res);
            setResults((prev) => ({ ...prev, [player]: [...(prev[player] ?? []), r] }));
            if (t + 1 < tasks.length) setT(t + 1);
            else {
              setT(0);
              setH(h + 1);
            }
          }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <H2>Auflösung deiner Vorhersage</H2>
      <div className="space-y-5">
        {tasks.map((task, i) => (
          <div key={task.id} className="space-y-2">
            <div className="text-sm leading-relaxed">
              <RichText text={task.prompt.split('\n')[0]} />
            </div>
            <ul className="space-y-1 text-sm">
              {humans.map((p) => {
                const r = results[p]![i];
                return (
                  <li key={p} className={r.correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                    {r.correct ? '✅' : '❌'} <strong>{names[p]}</strong>: {r.given}
                    {r.correct ? ` (+${bonus} Bonus)` : ` – richtig: ${r.expected}`}
                  </li>
                );
              })}
            </ul>
            <Derivation steps={task.solution} title="Lösung mit Rechenweg" />
          </div>
        ))}
      </div>
      <Button className="mt-5 w-full sm:w-auto" onClick={() => onDone({ byPlayer: results })}>
        Weiter zur Analyse
      </Button>
    </Card>
  );
}
