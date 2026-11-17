import { ALL_EXAM_CONCEPTS } from '../../games/registry';
import { CONCEPTS, GAME_NAMES } from '../../learning/concepts';
import { errorRate, MAX_BOX } from '../../learning/srs';
import { navigate } from '../../router';
import { useArena } from '../../state/ArenaContext';
import { Button, Card, H2, Pill } from '../../ui/basics';

export function StatsPage() {
  const { progress, counters, resetProgress } = useArena();
  const now = Date.now();
  const rows = ALL_EXAM_CONCEPTS.map((id) => ({ id, c: CONCEPTS[id], s: progress.concepts[id] })).sort(
    (a, b) => errorRate(b.s) - errorRate(a.s) || (b.s?.attempts ?? 0) - (a.s?.attempts ?? 0),
  );
  const attempted = rows.filter((r) => r.s);
  const total = attempted.reduce((n, r) => n + r.s!.attempts, 0);
  const correct = attempted.reduce((n, r) => n + r.s!.correct, 0);
  const weakest = attempted.filter((r) => errorRate(r.s) > 0).slice(0, 3);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">📊 Fehlerstatistik</h1>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-slate-500">Antworten</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{total ? Math.round((correct / total) * 100) : 0} %</p>
            <p className="text-xs text-slate-500">richtig</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{counters.matchesFinished}</p>
            <p className="text-xs text-slate-500">Partien</p>
          </div>
        </div>
        {weakest.length > 0 && (
          <p className="mt-3 text-sm">
            Deine Schwachstellen: {weakest.map((w) => w.c.label).join(', ')}.{' '}
            <button type="button" className="font-semibold text-indigo-700 underline dark:text-indigo-300" onClick={() => navigate('/exam?review=1')}>
              Gezielt üben →
            </button>
          </p>
        )}
      </Card>
      <Card>
        <H2>{GAME_NAMES.pd.de} – Konzepte</H2>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map(({ id, c, s }) => {
            const rate = s ? s.correct / s.attempts : 0;
            return (
              <li key={id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.label}</p>
                  <p className="text-xs italic text-slate-500">{c.en}</p>
                  {s ? (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-rose-200 dark:bg-rose-900">
                        <div className="h-full bg-emerald-500" style={{ width: `${rate * 100}%` }} />
                      </div>
                      <span className="text-xs tabular-nums">
                        {s.correct}/{s.attempts}
                      </span>
                      <Pill tone={s.due <= now ? 'amber' : 'green'}>{s.due <= now ? 'fällig' : `Fach ${s.box}/${MAX_BOX}`}</Pill>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">noch nicht geübt</p>
                  )}
                </div>
                <Button variant="secondary" className="!min-h-9 text-sm" onClick={() => navigate(`/exam?concept=${id}`)}>
                  Üben
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>
      <Button
        variant="ghost"
        onClick={() => {
          if (window.confirm('Statistik, Wiederholungsplan und Erfolge wirklich löschen?')) resetProgress();
        }}
      >
        Statistik zurücksetzen
      </Button>
    </div>
  );
}
