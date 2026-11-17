import { useEffect, useMemo, useState } from 'react';
import { fmt } from '../../core/numbers';
import type { Player } from '../../core/types';
import { PD_BOTS } from '../../games/pd/bots';
import { prisonersDilemma, totals, type PDRound } from '../../games/pd/engine';
import { pdPredictionTasks } from '../../games/pd/exercises';
import { pdBimatrix, type PDMove } from '../../games/pd/params';
import { useArena } from '../../state/ArenaContext';
import { useMatch } from '../../state/useMatch';
import { Button, Card, H2 } from '../../ui/basics';
import { Curtain } from '../../ui/feedback';
import { PayoffMatrix } from '../../ui/PayoffMatrix';
import { Term } from '../../ui/Term';
import { humanSeats, PREDICTION_BONUS, seatName, type PDMatchConfig } from './config';
import { PDRoundAnalysis } from './PDRoundAnalysis';
import { PDSummary } from './PDSummary';
import { PredictionRound, type PredictionResults } from './PredictionRound';

export function PDMatch({ config, onRestart, onSetup }: { config: PDMatchConfig; onRestart: () => void; onSetup: () => void }) {
  const { params, seats, seed } = config;
  const [state, send] = useMatch(prisonersDilemma, params, seed);
  const { emit } = useArena();
  const humans = humanSeats(config);
  const names: [string, string] = [seatName(seats[0]), seatName(seats[1])];

  /** rounds whose report the players have acknowledged */
  const [ack, setAck] = useState(0);
  const [bonus, setBonus] = useState<[number, number]>([0, 0]);
  const [predicted, setPredicted] = useState(!config.learning || humans.length === 0);
  const [curtainKey, setCurtainKey] = useState<string | null>(null);
  const tasks = useMemo(() => pdPredictionTasks(params), [params]);

  const round = state.history.length;
  const phase: 'move' | 'report' | 'summary' = round > ack ? 'report' : state.status === 'finished' ? 'summary' : 'move';

  // Bots commit at the start of the move phase. They only see the public history.
  useEffect(() => {
    if (phase !== 'move') return;
    ([0, 1] as Player[]).forEach((p) => {
      const seat = seats[p];
      if (seat.kind === 'bot' && state.pending[p] === null) {
        const move = PD_BOTS[seat.botId].decide({ params, history: state.history, me: p, seed });
        send({ type: 'commit', player: p, move, round: state.history.length });
      }
    });
  }, [phase, state, seats, params, seed, send]);

  const t = totals(state.history);
  const scoreboard = (
    <div className="grid grid-cols-2 gap-2 text-center">
      {([0, 1] as Player[]).map((p) => (
        <div key={p} className={`rounded-xl p-2 ring-1 ${p === 0 ? 'ring-indigo-300 dark:ring-indigo-700' : 'ring-amber-300 dark:ring-amber-700'}`}>
          <p className={`truncate text-sm font-semibold ${p === 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-amber-700 dark:text-amber-300'}`}>{names[p]}</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(t[p] + bonus[p])}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Auszahlung {fmt(t[p])}
            {bonus[p] > 0 && ` + Bonus ${bonus[p]}`}
          </p>
        </div>
      ))}
    </div>
  );

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
      <span className="font-semibold">
        {params.mode === 'oneShot' && 'Einmaliges Spiel'}
        {params.mode === 'finite' && `Runde ${Math.min(round + (phase === 'move' ? 1 : 0), params.rounds)} von ${params.rounds}`}
        {params.mode === 'discounted' && `Runde ${round + (phase === 'move' ? 1 : 0)} · Ende ungewiss (δ = ${fmt(params.delta)})`}
      </span>
      <span>
        T={fmt(params.T)} · R={fmt(params.R)} · P={fmt(params.P)} · S={fmt(params.S)}
      </span>
    </div>
  );

  if (phase === 'summary') {
    return (
      <PDSummary
        config={config}
        history={state.history}
        bonus={bonus}
        addBonus={(p, x) => setBonus((b) => (p === 0 ? [b[0] + x, b[1]] : [b[0], b[1] + x]))}
        onRestart={onRestart}
        onSetup={onSetup}
      />
    );
  }

  if (phase === 'report') {
    const record = state.history[round - 1];
    const handlePredictions = (r: PredictionResults) => {
      const add: [number, number] = [0, 0];
      for (const p of humans) {
        const res = r.byPlayer[p] ?? [];
        res.forEach((x, i) => {
          if (x.correct) add[p] += PREDICTION_BONUS;
          // the device profile (statistics, achievements) belongs to seat A
          if (p === 0) emit({ type: 'answer', concept: tasks[i].concept, correct: x.correct, source: 'predict' });
        });
      }
      setBonus((b) => [b[0] + add[0], b[1] + add[1]]);
      setPredicted(true);
    };
    return (
      <div className="space-y-4">
        {header}
        <RoundResult record={record} names={names} round={round} />
        {!predicted ? (
          <PredictionRound tasks={tasks} humans={humans} names={names} bonus={PREDICTION_BONUS} onDone={handlePredictions} />
        ) : (
          <>
            <PDRoundAnalysis params={params} record={record} round={round} names={names} />
            <Button className="w-full text-lg" onClick={() => setAck(round)}>
              {state.status === 'finished' ? 'Zur Gesamtauswertung' : 'Nächste Runde'}
            </Button>
          </>
        )}
        {scoreboard}
      </div>
    );
  }

  // move phase
  const actor = humans.find((p) => state.pending[p] === null);
  const key = `${round}:${actor}`;
  if (actor !== undefined && humans.length > 1 && curtainKey !== key) {
    return <Curtain name={names[actor]} onReady={() => setCurtainKey(key)} />;
  }
  const choose = (m: PDMove) => actor !== undefined && send({ type: 'commit', player: actor, move: m, round });

  return (
    <div className="space-y-4">
      {header}
      {scoreboard}
      <Card>
        {actor !== undefined ? (
          <>
            <H2>{humans.length > 1 ? `${names[actor]}, du bist dran` : 'Dein Zug'}</H2>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              Du spielst als <strong>{actor === 0 ? 'Zeilenspieler A' : 'Spaltenspieler B'}</strong>. Beide ziehen gleichzeitig und verdeckt.
              {humans.length > 1 && state.pending[actor === 0 ? 1 : 0] !== null && ` ${names[actor === 0 ? 1 : 0]} hat bereits gewählt ✓`}
            </p>
            <PayoffMatrix game={pdBimatrix(params)} names={names} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button className="min-h-16 bg-emerald-600 text-lg hover:bg-emerald-500" onClick={() => choose('C')}>
                🤝 Kooperieren (C)
              </Button>
              <Button className="min-h-16 bg-rose-600 text-lg hover:bg-rose-500" onClick={() => choose('D')}>
                🗡️ Defektieren (D)
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-slate-500">Die Computer ziehen …</p>
        )}
      </Card>
      {state.history.length > 0 && <HistoryTable history={state.history} names={names} />}
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Tipp: Begriffe wie <Term id="ne">Nash-Gleichgewicht</Term> oder <Term id="spe">SPE</Term> kannst du antippen.
      </p>
    </div>
  );
}

function RoundResult({ record, names, round }: { record: PDRound; names: [string, string]; round: number }) {
  const label = (m: PDMove) => (m === 'C' ? '🤝 C' : '🗡️ D');
  return (
    <Card>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Runde {round} · aufgedeckt</p>
      <div className="grid grid-cols-2 gap-3 text-center">
        {[0, 1].map((p) => (
          <div key={p}>
            <p className="truncate text-sm font-semibold">{names[p]}</p>
            <p className="text-2xl font-bold">{label(record.moves[p])}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">+{fmt(record.payoffs[p])}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function HistoryTable({ history, names }: { history: PDRound[]; names: [string, string] }) {
  return (
    <Card>
      <p className="mb-2 text-sm font-semibold">Verlauf</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {history.map((r, i) => (
          <div key={i} className="flex min-w-9 flex-col items-center gap-1 text-xs">
            <span className="text-slate-400">{i + 1}</span>
            {r.moves.map((m, p) => (
              <span
                key={p}
                title={`${names[p]}: ${m}`}
                className={`flex h-7 w-7 items-center justify-center rounded-md font-bold text-white ${m === 'C' ? 'bg-emerald-500' : 'bg-rose-500'}`}
              >
                {m}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Obere Reihe: {names[0]}, untere Reihe: {names[1]}
      </p>
    </Card>
  );
}
