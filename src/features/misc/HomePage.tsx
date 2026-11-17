import { ALL_EXAM_CONCEPTS } from '../../games/registry';
import { dueCount } from '../../learning/srs';
import { navigate } from '../../router';
import { useArena } from '../../state/ArenaContext';
import { Button, Card, Pill } from '../../ui/basics';
import { Term } from '../../ui/Term';

const GAMES = [
  { id: 'pd', emoji: '🔒', title: 'Gefangenendilemma', en: "Prisoner's Dilemma", text: 'One-shot, endlich wiederholt, unbekanntes Ende. Rückwärtsinduktion & Folk-Theorem.', ready: true },
  { id: 'ultimatum', emoji: '🍰', title: 'Ultimatumspiel', en: 'Ultimatum game', text: 'NE vs. SPE, leere Drohungen.', ready: false },
  { id: 'coordination', emoji: '🦌', title: 'Stag Hunt · Chicken · BoS', en: 'Coordination games', text: 'Mehrere NE, gemischtes Gleichgewicht.', ready: false },
  { id: 'cournot', emoji: '🏭', title: 'Cournot-Duopol', en: 'Cournot competition', text: 'Reaktionsfunktionen, Stackelberg.', ready: false },
  { id: 'bertrand', emoji: '🏷️', title: 'Bertrand-Duopol', en: 'Bertrand competition', text: 'Bertrand-Paradoxon, differenzierte Güter.', ready: false },
  { id: 'auctions', emoji: '🔨', title: 'Auktionen', en: 'Auctions', text: 'Erstpreis, Vickrey, Revenue Equivalence.', ready: false },
  { id: 'beauty', emoji: '🔢', title: 'Beauty Contest', en: 'Keynesian beauty contest', text: '2/3 des Durchschnitts, Level-k.', ready: false },
];

export function HomePage() {
  const { progress, counters, unlocked } = useArena();
  const due = dueCount(progress, ALL_EXAM_CONCEPTS, Date.now());
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-extrabold">Game Theory Arena</h1>
        <p className="mt-2 max-w-prose text-indigo-100">
          Spiel klassische Spiele gegen Computer-Persönlichkeiten oder Freunde – und erfahre nach jeder Runde, ob ihr im Nash-Gleichgewicht gelandet
          seid und warum (nicht). Mit Rechenweg wie in der Klausur.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="bg-white !text-indigo-800 hover:bg-indigo-50" onClick={() => navigate('/pd')}>
            ▶ Gefangenendilemma spielen
          </Button>
          <Button className="bg-indigo-500/40 ring-1 ring-white/40 hover:bg-indigo-500/60" onClick={() => navigate('/exam')}>
            📝 Klausurmodus
          </Button>
        </div>
      </section>

      {(due > 0 || counters.answersTotal > 0) && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">🧠 Wiederholung</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {due > 0 ? `${due} Konzept${due === 1 ? ' ist' : 'e sind'} zur Wiederholung fällig.` : 'Nichts fällig – stark!'} · {counters.answersTotal} Antworten ·{' '}
              {Object.keys(unlocked).length} Erfolge
            </p>
          </div>
          <Button variant={due > 0 ? 'primary' : 'secondary'} onClick={() => navigate('/exam?review=1')}>
            Gezielt üben
          </Button>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            disabled={!g.ready}
            onClick={() => navigate(`/${g.id}`)}
            className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition enabled:hover:ring-indigo-400 disabled:opacity-60 dark:bg-slate-900 dark:ring-slate-700"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl">{g.emoji}</span>
              {!g.ready && <Pill>bald</Pill>}
            </div>
            <p className="mt-2 font-bold">{g.title}</p>
            <p className="text-xs italic text-slate-500">{g.en}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{g.text}</p>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">
        Begriffe wie <Term id="spe">teilspielperfektes Gleichgewicht</Term> lassen sich überall antippen.
      </p>
    </div>
  );
}
