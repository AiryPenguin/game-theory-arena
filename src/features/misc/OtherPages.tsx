import { GLOSSARY } from '../../learning/glossary';
import { ACHIEVEMENTS } from '../../learning/achievements';
import { useArena } from '../../state/ArenaContext';
import { Card, ConfirmButton } from '../../ui/basics';
import { RichText } from '../../ui/RichText';

export function GlossaryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">📖 Glossar</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">Deutsche Begriffe mit englischen Fachbegriffen für englischsprachige Klausuren.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {GLOSSARY.map((g) => (
          <Card key={g.id}>
            <p className="font-bold" id={g.id}>
              {g.term}
            </p>
            <p className="text-sm italic text-indigo-700 dark:text-indigo-300">{g.en}</p>
            <p className="mt-2 text-sm leading-relaxed">
              <RichText text={g.text} />
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AchievementsPage() {
  const { unlocked } = useArena();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">🏅 Erfolge</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {Object.keys(unlocked).length} von {ACHIEVEMENTS.length} freigeschaltet.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const at = unlocked[a.id];
          return (
            <Card key={a.id} className={at ? '' : 'opacity-60 grayscale'}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{at ? a.icon : '🔒'}</span>
                <div>
                  <p className="font-bold">{a.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{a.description}</p>
                  {at && <p className="text-xs text-slate-500">seit {new Date(at).toLocaleDateString('de-DE')}</p>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const { leaderboard, resetLeaderboard } = useArena();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">🏆 Bestenliste</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">Punkte = Spielauszahlungen + Bonus für richtige Vorhersagen und erkannte Gegner. Gilt für dieses Gerät.</p>
      <Card>
        {leaderboard.length === 0 ? (
          <p className="text-center text-slate-500">Noch keine Partien. Spielt eine Runde Hot-Seat!</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500">
                <th className="py-2">#</th>
                <th>Name</th>
                <th className="text-right">Punkte</th>
                <th className="text-right">Partien</th>
                <th className="text-right">Siege</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={e.name} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2">{['🥇', '🥈', '🥉'][i] ?? i + 1}</td>
                  <td className="font-semibold">{e.name}</td>
                  <td className="text-right tabular-nums">{Math.round(e.points * 100) / 100}</td>
                  <td className="text-right tabular-nums">{e.matches}</td>
                  <td className="text-right tabular-nums">{e.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {leaderboard.length > 0 && (
        <ConfirmButton label="Neue Session (Bestenliste leeren)" question="Bestenliste wirklich leeren?" confirmLabel="Ja, leeren" onConfirm={resetLeaderboard} />
      )}
    </div>
  );
}
