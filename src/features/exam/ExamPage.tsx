import { useMemo, useState } from 'react';
import { freshSeed, mulberry32 } from '../../core/rng';
import { ALL_EXAM_CONCEPTS, EXERCISES, generateTask } from '../../games/registry';
import { CONCEPTS, type ConceptId } from '../../learning/concepts';
import { pickReviewConcepts } from '../../learning/srs';
import { checkAnswer, type AnswerResponse, type CheckResult, type Task } from '../../learning/tasks';
import type { Route } from '../../router';
import { useArena } from '../../state/ArenaContext';
import { Button, Card, Choice, H2, Pill } from '../../ui/basics';
import { Timer } from '../../ui/feedback';
import { TaskCard } from '../../ui/TaskCard';

type Source = { kind: 'exam' } | { kind: 'review' } | { kind: 'concept'; concept: ConceptId } | { kind: 'retry'; concepts: ConceptId[] };

interface Running {
  tasks: Task[];
  index: number;
  results: (CheckResult | null)[];
  seconds: number;
}

const COUNTS = [5, 10, 15];
const TIMES = [
  { s: 0, label: 'ohne Limit' },
  { s: 60, label: '1 min' },
  { s: 120, label: '2 min' },
  { s: 180, label: '3 min' },
];

export function ExamPage({ route }: { route: Route }) {
  const { progress, emit } = useArena();
  const initialSource: Source = useMemo(() => {
    const c = route.query.get('concept');
    if (c && c in CONCEPTS) return { kind: 'concept', concept: c as ConceptId };
    if (route.query.get('review')) return { kind: 'review' };
    return { kind: 'exam' };
  }, [route]);
  const [source, setSource] = useState<Source>(initialSource);
  const [count, setCount] = useState(5);
  const [seconds, setSeconds] = useState(120);
  const [run, setRun] = useState<Running | null>(null);

  const start = (src: Source = source) => {
    const rng = mulberry32(freshSeed());
    let concepts: ConceptId[];
    if (src.kind === 'review') concepts = pickReviewConcepts(progress, ALL_EXAM_CONCEPTS, count, Date.now(), rng);
    else if (src.kind === 'concept') concepts = Array(count).fill(src.concept);
    else if (src.kind === 'retry') concepts = src.concepts;
    else concepts = EXERCISES.pd.examSet(rng, count);
    const tasks = concepts.map((c) => generateTask(c, rng));
    setRun({ tasks, index: 0, results: tasks.map(() => null), seconds });
    window.scrollTo(0, 0);
  };

  const answer = (res: AnswerResponse) => {
    if (!run || run.results[run.index]) return;
    const task = run.tasks[run.index];
    const r = checkAnswer(task.answer, res);
    emit({ type: 'answer', concept: task.concept, correct: r.correct, source: 'exam' });
    const results = [...run.results];
    results[run.index] = r;
    const next = { ...run, results };
    setRun(next);
    if (results.every(Boolean)) {
      emit({ type: 'examFinished', correct: results.filter((x) => x!.correct).length, total: results.length });
    }
  };

  if (!run) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-extrabold">📝 Klausurmodus</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Zufällige Parameter, Zeitlimit, Rechenaufgaben mit vollständigem Lösungsweg. Jede Antwort fließt in deine Fehlerstatistik ein.
          </p>
        </header>
        <Card className="space-y-4">
          <div>
            <H2>Aufgaben</H2>
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice selected={source.kind === 'exam'} onClick={() => setSource({ kind: 'exam' })}>
                <span className="block font-semibold">🎲 Probeklausur Gefangenendilemma</span>
                <span className="block text-xs text-slate-500">Querschnitt über alle Konzepte.</span>
              </Choice>
              <Choice selected={source.kind === 'review'} onClick={() => setSource({ kind: 'review' })}>
                <span className="block font-semibold">🧠 Gezielt wiederholen</span>
                <span className="block text-xs text-slate-500">Spaced Repetition: fällige und schwache Konzepte zuerst.</span>
              </Choice>
            </div>
            {source.kind === 'concept' && (
              <p className="mt-2 text-sm">
                Nur Konzept: <Pill tone="indigo">{CONCEPTS[source.concept].label}</Pill>
              </p>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Anzahl</p>
            <div className="flex gap-2">
              {COUNTS.map((n) => (
                <Choice key={n} selected={count === n} onClick={() => setCount(n)} className="flex-1 text-center">
                  {n}
                </Choice>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Zeit pro Aufgabe</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIMES.map((t) => (
                <Choice key={t.s} selected={seconds === t.s} onClick={() => setSeconds(t.s)} className="text-center">
                  {t.label}
                </Choice>
              ))}
            </div>
          </div>
          <Button className="w-full text-lg" onClick={() => start()}>
            Klausur starten
          </Button>
        </Card>
      </div>
    );
  }

  const done = run.results.every(Boolean);
  const current = run.results[run.index];
  if (done && run.index === run.tasks.length) {
    const correct = run.results.filter((r) => r!.correct).length;
    const wrong = run.tasks.filter((_, i) => !run.results[i]!.correct).map((t) => t.concept);
    const pct = Math.round((correct / run.tasks.length) * 100);
    return (
      <div className="space-y-4">
        <Card className="text-center">
          <p className="text-5xl">{pct === 100 ? '🏅' : pct >= 60 ? '👍' : '📚'}</p>
          <H2>
            {correct} von {run.tasks.length} richtig ({pct} %)
          </H2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {pct === 100 ? 'Klausurreif!' : pct >= 60 ? 'Bestanden – aber da geht noch was.' : 'Noch nicht bestanden. Wiederhole die Fehler gezielt.'}
          </p>
        </Card>
        <Card>
          <ul className="space-y-1 text-sm">
            {run.tasks.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span>
                  {run.results[i]!.correct ? '✅' : '❌'} {CONCEPTS[t.concept].label}
                </span>
                <span className="text-xs italic text-slate-500">{CONCEPTS[t.concept].en}</span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="grid gap-2 sm:grid-cols-3">
          {wrong.length > 0 && <Button onClick={() => start({ kind: 'retry', concepts: wrong })}>🔁 Fehler wiederholen (neue Zahlen)</Button>}
          <Button variant={wrong.length ? 'secondary' : 'primary'} onClick={() => start()}>
            Neue Klausur
          </Button>
          <Button variant="secondary" onClick={() => setRun(null)}>
            Einstellungen
          </Button>
        </div>
      </div>
    );
  }

  const task = run.tasks[run.index];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          Aufgabe {run.index + 1} / {run.tasks.length}
        </span>
        <Pill tone="indigo">{CONCEPTS[task.concept].label}</Pill>
      </div>
      {run.seconds > 0 && (
        <Timer key={task.id} seconds={run.seconds} running={!current} onTimeout={() => answer({ kind: 'timeout' })} />
      )}
      <Card>
        <TaskCard task={task} result={current} onSubmit={answer} />
      </Card>
      {current && (
        <Button className="w-full text-lg" onClick={() => setRun({ ...run, index: run.index + 1 })}>
          {run.index + 1 < run.tasks.length ? 'Nächste Aufgabe' : 'Zur Auswertung'}
        </Button>
      )}
    </div>
  );
}
