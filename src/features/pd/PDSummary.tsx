import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../core/numbers';
import type { Player } from '../../core/types';
import { matchStats } from '../../games/pd/analysis';
import { consistentBots, PD_BOT_IDS, PD_BOTS, type PDBotId } from '../../games/pd/bots';
import { discountedTotals, totals, type PDRound } from '../../games/pd/engine';
import { explainMatch } from '../../games/pd/explain';
import { navigate } from '../../router';
import { useArena } from '../../state/ArenaContext';
import { Button, Card, Choice, H2 } from '../../ui/basics';
import { Derivation, Verdict } from '../../ui/feedback';
import { RichText } from '../../ui/RichText';
import { DETECTIVE_BONUS, humanSeats, seatName, type PDMatchConfig } from './config';
import { HistoryTable } from './PDMatch';

export function PDSummary({
  config,
  history,
  bonus,
  addBonus,
  onRestart,
  onSetup,
}: {
  config: PDMatchConfig;
  history: PDRound[];
  bonus: [number, number];
  addBonus: (p: Player, x: number) => void;
  onRestart: () => void;
  onSetup: () => void;
}) {
  const { emit, recordLeaderboard } = useArena();
  const { params, seats } = config;
  const humans = humanSeats(config);
  const secretSeat = ([0, 1] as Player[]).find((p) => seats[p].kind === 'bot' && (seats[p] as { secret: boolean }).secret);
  const needsGuess = secretSeat !== undefined && humans.length === 1;
  const [guess, setGuess] = useState<PDBotId | null>(null);
  const [guessDone, setGuessDone] = useState(!needsGuess);
  const recorded = useRef(false);

  const namesHidden: [string, string] = [seatName(seats[0]), seatName(seats[1])];
  const names: [string, string] = [seatName(seats[0], guessDone), seatName(seats[1], guessDone)];
  const t = totals(history);
  const stats = matchStats(history);
  const e = explainMatch(params, history, names);

  const botSeat = secretSeat ?? (([0, 1] as Player[]).find((p) => seats[p].kind === 'bot'));
  const equivalent =
    botSeat !== undefined ? consistentBots({ params, history, me: botSeat, seed: config.seed }) : [];

  useEffect(() => {
    if (!guessDone || recorded.current) return;
    recorded.current = true;
    emit({ type: 'pdMatchFinished', mode: params.mode, rounds: history.length, maxMutualCoopStreak: stats.maxMutualCoopStreak, humans: humans.length });
    const pts: [number, number] = [t[0] + bonus[0], t[1] + bonus[1]];
    recordLeaderboard(
      humans.map((p) => ({ name: seatName(seats[p]), points: pts[p], won: pts[p] > pts[p === 0 ? 1 : 0] })),
    );
  }, [guessDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitGuess = () => {
    if (!guess || secretSeat === undefined) return;
    const correct = equivalent.includes(guess);
    if (correct) addBonus(humans[0], DETECTIVE_BONUS);
    emit({ type: 'botGuess', correct });
    setGuessDone(true);
  };

  if (!guessDone) {
    return (
      <div className="space-y-4">
        <Card>
          <H2>🕵️ Hättest du sie erkannt?</H2>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Welche Strategie steckte hinter dem geheimen Gegner? Richtig geraten: +{DETECTIVE_BONUS} Bonus.
          </p>
          <HistoryTable history={history} names={namesHidden} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PD_BOT_IDS.map((id) => (
              <Choice key={id} selected={guess === id} onClick={() => setGuess(id)}>
                <span className="block font-semibold">
                  {PD_BOTS[id].emoji} {PD_BOTS[id].name}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{PD_BOTS[id].tagline}</span>
              </Choice>
            ))}
          </div>
          <Button className="mt-4 w-full" disabled={!guess} onClick={submitGuess}>
            Aufdecken
          </Button>
        </Card>
      </div>
    );
  }

  const pts: [number, number] = [t[0] + bonus[0], t[1] + bonus[1]];
  const winner = pts[0] === pts[1] ? null : pts[0] > pts[1] ? 0 : 1;
  const bot = humans.length === 1 && botSeat !== undefined && seats[botSeat].kind === 'bot' ? PD_BOTS[(seats[botSeat] as { botId: PDBotId }).botId] : null;

  return (
    <div className="space-y-4">
      <Card>
        <H2>🏁 Endstand</H2>
        <div className="grid grid-cols-2 gap-3 text-center">
          {([0, 1] as Player[]).map((p) => (
            <div key={p} className={`rounded-xl p-3 ring-1 ${winner === p ? 'bg-amber-50 ring-amber-400 dark:bg-amber-950/40' : 'ring-slate-200 dark:ring-slate-700'}`}>
              <p className="truncate font-semibold">
                {winner === p && '🏆 '}
                {names[p]}
              </p>
              <p className="text-3xl font-bold tabular-nums">{fmt(pts[p])}</p>
              <p className="text-xs text-slate-500">
                Auszahlung {fmt(t[p])} + Bonus {bonus[p]}
              </p>
              {params.mode === 'discounted' && (
                <p className="text-xs text-slate-500">Barwert Σδᵗuₜ: {fmt(discountedTotals(history, params.delta)[p], 2)}</p>
              )}
            </div>
          ))}
        </div>
        {winner === null && <p className="mt-2 text-center text-sm">Unentschieden.</p>}
      </Card>

      {bot && (
        <Card>
          <H2>
            {bot.emoji} Dein Gegner war: {bot.name}
          </H2>
          <p className="text-sm italic text-slate-600 dark:text-slate-300">„{bot.tagline}“</p>
          <p className="mt-2 text-sm">
            <strong>Regel:</strong> {bot.rule}
          </p>
          {needsGuess && guess && (
            <p className="mt-3 text-sm">
              {guess === bot.id
                ? `✅ Richtig erkannt! +${DETECTIVE_BONUS} Bonus.`
                : equivalent.includes(guess)
                  ? `✅ Zählt als richtig: ${PD_BOTS[guess].name} hätte in dieser Partie exakt dieselben Züge gespielt – aus deinen Beobachtungen nicht unterscheidbar. +${DETECTIVE_BONUS} Bonus.`
                  : `❌ Du hast auf ${PD_BOTS[guess].name} getippt.`}
            </p>
          )}
          {equivalent.length > 1 && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Beobachtungsäquivalent in dieser Partie: {equivalent.map((id) => `${PD_BOTS[id].emoji} ${PD_BOTS[id].name}`).join(', ')}. Um sie zu unterscheiden,
              hättest du sie gezielt testen müssen (z. B. einmal defektieren und schauen, ob sie verzeihen).
            </p>
          )}
        </Card>
      )}

      <Card className="space-y-3">
        <H2>Gleichgewichtsanalyse der Partie</H2>
        <Verdict kind={e.verdict} headline={e.headline}>
          {e.summary.map((s, i) => (
            <p key={i}>
              <RichText text={s} />
            </p>
          ))}
        </Verdict>
        {e.derivation.length > 0 && <Derivation steps={e.derivation} />}
        <HistoryTable history={history} names={names} />
        {stats.maxMutualCoopStreak > 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-300">Längste Serie beidseitiger Kooperation: {stats.maxMutualCoopStreak} Runden.</p>
        )}
      </Card>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button onClick={onRestart}>🔁 Nochmal (gleiche Einstellungen)</Button>
        <Button variant="secondary" onClick={onSetup}>
          ⚙️ Einstellungen ändern
        </Button>
        <Button variant="secondary" onClick={() => navigate('/leaderboard')}>
          🏆 Bestenliste
        </Button>
      </div>
    </div>
  );
}
