import { bestResponses, profileKey, pureNashEquilibria, type Bimatrix, type Profile } from '../core/normalForm';
import { fmt } from '../core/numbers';

interface Props {
  game: Bimatrix;
  names: [string, string];
  /** underline best responses (Unterstreichungsmethode) and mark NE */
  analysis?: boolean;
  played?: Profile | null;
  rowTitles?: string[];
  colTitles?: string[];
}

/** Bimatrix table. First payoff = row player A (indigo), second = column player B (amber). */
export function PayoffMatrix({ game, names, analysis = false, played, rowTitles, colTitles }: Props) {
  const ne = new Set(pureNashEquilibria(game).map(profileKey));
  const brA = new Set(game.colLabels.flatMap((_, c) => bestResponses(game, 0, c).map((r) => `${r},${c}`)));
  const brB = new Set(game.rowLabels.flatMap((_, r) => bestResponses(game, 1, r).map((c) => `${r},${c}`)));

  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            <th className="p-1 text-xs font-medium text-slate-500">
              <span className="text-indigo-600 dark:text-indigo-300">{names[0]}</span> ↓ ·{' '}
              <span className="text-amber-600 dark:text-amber-300">{names[1]}</span> →
            </th>
            {game.colLabels.map((c, j) => (
              <th key={c} className="px-2 py-1 font-semibold text-amber-700 dark:text-amber-300">
                {colTitles?.[j] ?? c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {game.rowLabels.map((r, i) => (
            <tr key={r}>
              <th className="px-2 py-1 font-semibold text-indigo-700 dark:text-indigo-300">{rowTitles?.[i] ?? r}</th>
              {game.colLabels.map((_, j) => {
                const key = `${i},${j}`;
                const isNE = analysis && ne.has(key);
                const isPlayed = played && profileKey(played) === key;
                const [a, b] = game.payoffs[i][j];
                return (
                  <td
                    key={key}
                    className={`relative min-w-24 rounded-xl px-3 py-3 text-lg tabular-nums ring-1 ${
                      isNE
                        ? 'bg-emerald-50 ring-emerald-400 dark:bg-emerald-950/60 dark:ring-emerald-600'
                        : 'bg-slate-50 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
                    } ${isPlayed ? 'outline-3 outline-offset-1 outline-indigo-500' : ''}`}
                  >
                    (
                    <span
                      className={`text-indigo-700 dark:text-indigo-300 ${analysis && brA.has(key) ? 'font-bold underline decoration-2 underline-offset-4' : ''}`}
                    >
                      {fmt(a)}
                    </span>
                    ,{' '}
                    <span
                      className={`text-amber-700 dark:text-amber-300 ${analysis && brB.has(key) ? 'font-bold underline decoration-2 underline-offset-4' : ''}`}
                    >
                      {fmt(b)}
                    </span>
                    )
                    {(isNE || isPlayed) && (
                      <span className="absolute -top-2 right-1 flex gap-1 text-[10px] font-bold">
                        {isPlayed && <span className="rounded bg-indigo-600 px-1 text-white">gespielt</span>}
                        {isNE && <span className="rounded bg-emerald-600 px-1 text-white">NE</span>}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {analysis && (
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Unterstrichen = beste Antwort (best response). Grün = beide Zahlen unterstrichen ⇒ Nash-Gleichgewicht.
        </p>
      )}
    </div>
  );
}
