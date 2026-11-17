import { useMemo, useState } from 'react';
import { fmt, fractionWithDecimal, parseNumberInput } from '../../core/numbers';
import { freshSeed } from '../../core/rng';
import { grimThreshold } from '../../games/pd/analysis';
import { PD_BOT_IDS, PD_BOTS, type PDBotId } from '../../games/pd/bots';
import {
  MAX_ROUNDS_FINITE,
  PD_DEFAULTS,
  PD_PRESETS,
  pdBimatrix,
  validatePDParams,
  type PDMode,
  type PDParams,
} from '../../games/pd/params';
import { Button, Card, Choice, H2, inputClass } from '../../ui/basics';
import { PayoffMatrix } from '../../ui/PayoffMatrix';
import { Term } from '../../ui/Term';
import type { PDMatchConfig, SeatConfig } from './config';

type Opponents = 'bot' | 'hotseat' | 'botbot';
type BotChoice = PDBotId | 'secret';

const PAYOFF_FIELDS = [
  { key: 'T', label: 'T', hint: 'Versuchung (temptation): D gegen C' },
  { key: 'R', label: 'R', hint: 'Belohnung (reward): beide C' },
  { key: 'P', label: 'P', hint: 'Strafe (punishment): beide D' },
  { key: 'S', label: 'S', hint: 'Gutgläubige (sucker): C gegen D' },
] as const;

const MODES: { id: PDMode; title: string; text: string }[] = [
  { id: 'oneShot', title: 'Einmalig', text: 'One-shot: eine einzige Runde.' },
  { id: 'finite', title: 'Endlich wiederholt', text: 'N Runden, Ende allen bekannt.' },
  { id: 'discounted', title: 'Unbekanntes Ende', text: 'Nach jeder Runde geht es mit Wahrscheinlichkeit δ weiter.' },
];

export function PDSetup({ initial, onStart }: { initial?: PDMatchConfig; onStart: (c: PDMatchConfig) => void }) {
  const p0 = initial?.params ?? PD_DEFAULTS;
  const [pay, setPay] = useState<Record<'T' | 'R' | 'P' | 'S', string>>({
    T: String(p0.T),
    R: String(p0.R),
    P: String(p0.P),
    S: String(p0.S),
  });
  const [mode, setMode] = useState<PDMode>(p0.mode);
  const [rounds, setRounds] = useState(String(p0.rounds));
  const [delta, setDelta] = useState(String(p0.delta));
  const [opponents, setOpponents] = useState<Opponents>(() => {
    const k = initial?.seats.map((s) => s.kind).join();
    return k === 'human,human' ? 'hotseat' : k === 'bot,bot' ? 'botbot' : 'bot';
  });
  const [names, setNames] = useState<[string, string]>(() => [
    initial?.seats[0].kind === 'human' ? initial.seats[0].name : 'Du',
    initial?.seats[1].kind === 'human' ? initial.seats[1].name : 'Spieler B',
  ]);
  const [bot, setBot] = useState<BotChoice>(() => {
    const s = initial?.seats[1];
    return s?.kind === 'bot' ? (s.secret ? 'secret' : s.botId) : 'secret';
  });
  const [botA, setBotA] = useState<PDBotId>(() => (initial?.seats[0].kind === 'bot' ? initial.seats[0].botId : 'tft'));
  const [learning, setLearning] = useState(initial?.learning ?? true);

  const params: PDParams = useMemo(
    () => ({
      T: parseNumberInput(pay.T) ?? NaN,
      R: parseNumberInput(pay.R) ?? NaN,
      P: parseNumberInput(pay.P) ?? NaN,
      S: parseNumberInput(pay.S) ?? NaN,
      mode,
      rounds: parseNumberInput(rounds) ?? NaN,
      delta: parseNumberInput(delta) ?? NaN,
    }),
    [pay, mode, rounds, delta],
  );
  const validation = validatePDParams(params);
  const payoffsValid = [params.T, params.R, params.P, params.S].every(Number.isFinite);
  const nameError =
    opponents === 'hotseat' && (!names[0].trim() || !names[1].trim() || names[0].trim().toLowerCase() === names[1].trim().toLowerCase())
      ? 'Bitte zwei verschiedene Namen eingeben.'
      : opponents === 'bot' && !names[0].trim()
        ? 'Bitte gib deinen Namen ein.'
        : null;
  const canStart = validation.errors.length === 0 && !nameError;

  const start = () => {
    let seats: [SeatConfig, SeatConfig];
    if (opponents === 'hotseat') seats = [{ kind: 'human', name: names[0].trim() }, { kind: 'human', name: names[1].trim() }];
    else if (opponents === 'botbot')
      seats = [
        { kind: 'bot', botId: botA, secret: false },
        { kind: 'bot', botId: bot === 'secret' ? 'tft' : bot, secret: false },
      ];
    else {
      const seed = freshSeed();
      const botId = bot === 'secret' ? PD_BOT_IDS[seed % PD_BOT_IDS.length] : bot;
      seats = [{ kind: 'human', name: names[0].trim() }, { kind: 'bot', botId, secret: bot === 'secret' }];
    }
    onStart({ params, seats, learning: learning && opponents !== 'botbot', seed: freshSeed() });
  };

  const d = params.delta;
  const threshold = payoffsValid && validation.errors.length === 0 ? fractionWithDecimal(grimThreshold(params)).text : null;

  return (
    <div className="space-y-4">
      <Card>
        <H2>1 · Auszahlungen</H2>
        <div className="mb-3 flex flex-wrap gap-2">
          {PD_PRESETS.map((pr) => (
            <Button
              key={pr.name}
              variant="secondary"
              className="!min-h-9 text-sm"
              onClick={() => setPay({ T: String(pr.payoffs.T), R: String(pr.payoffs.R), P: String(pr.payoffs.P), S: String(pr.payoffs.S) })}
            >
              {pr.name}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PAYOFF_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm font-bold">{f.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{f.hint}</span>
              <input
                className={`${inputClass} mt-1`}
                type="number"
                step="any"
                value={pay[f.key]}
                onChange={(e) => setPay((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm">
          Bedingung für ein Gefangenendilemma: <strong>T &gt; R &gt; P &gt; S</strong>
          {validation.errors.length === 0 && <span className="ml-2 text-emerald-700 dark:text-emerald-300">✓ erfüllt</span>}
        </p>
        {payoffsValid && (
          <div className="mt-3">
            <PayoffMatrix game={pdBimatrix(params)} names={['A', 'B']} />
          </div>
        )}
      </Card>

      <Card>
        <H2>2 · Spielform</H2>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <Choice key={m.id} selected={mode === m.id} onClick={() => setMode(m.id)}>
              <span className="block font-semibold">{m.title}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{m.text}</span>
            </Choice>
          ))}
        </div>
        {mode === 'finite' && (
          <label className="mt-3 block max-w-xs">
            <span className="text-sm font-semibold">Anzahl Runden N (2–{MAX_ROUNDS_FINITE})</span>
            <input className={`${inputClass} mt-1`} type="number" min={2} max={MAX_ROUNDS_FINITE} step={1} value={rounds} onChange={(e) => setRounds(e.target.value)} />
          </label>
        )}
        {mode === 'discounted' && (
          <div className="mt-3 space-y-2">
            <label className="block">
              <span className="text-sm font-semibold">
                <Term id="delta">Diskontfaktor δ</Term> (Fortsetzungswahrscheinlichkeit)
              </span>
              <div className="mt-1 flex items-center gap-3">
                <input type="range" min={0.05} max={0.97} step={0.01} value={Number.isFinite(d) ? d : 0.9} onChange={(e) => setDelta(e.target.value)} className="flex-1 accent-indigo-600" />
                <input className={`${inputClass} !w-24`} type="number" step={0.01} min={0.01} max={0.99} value={delta} onChange={(e) => setDelta(e.target.value)} />
              </div>
            </label>
            {Number.isFinite(d) && d > 0 && d < 1 && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Erwartete Spieldauer: 1/(1−δ) = {fmt(1 / (1 - d), 1)} Runden.
                {threshold && !learning && <> Kritisches δ* = {threshold}.</>}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <H2>3 · Gegner</H2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Choice selected={opponents === 'bot'} onClick={() => setOpponents('bot')}>
            <span className="font-semibold">🤖 Gegen Computer</span>
          </Choice>
          <Choice selected={opponents === 'hotseat'} onClick={() => setOpponents('hotseat')}>
            <span className="font-semibold">🪑 Hot-Seat (2 Menschen)</span>
          </Choice>
          <Choice selected={opponents === 'botbot'} onClick={() => setOpponents('botbot')}>
            <span className="font-semibold">🍿 Computer vs. Computer</span>
          </Choice>
        </div>

        {opponents !== 'botbot' && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Name Spieler A</span>
              <input className={`${inputClass} mt-1`} value={names[0]} maxLength={20} onChange={(e) => setNames([e.target.value, names[1]])} />
            </label>
            {opponents === 'hotseat' && (
              <label className="block">
                <span className="text-sm font-semibold">Name Spieler B</span>
                <input className={`${inputClass} mt-1`} value={names[1]} maxLength={20} onChange={(e) => setNames([names[0], e.target.value])} />
              </label>
            )}
          </div>
        )}
        {nameError && <p className="mt-2 text-sm text-rose-600">{nameError}</p>}

        {opponents === 'botbot' && (
          <BotPicker label="Computer A" value={botA} onChange={(v) => setBotA(v as PDBotId)} allowSecret={false} />
        )}
        {opponents !== 'hotseat' && (
          <BotPicker
            label={opponents === 'botbot' ? 'Computer B' : 'Computer-Gegner'}
            value={opponents === 'botbot' && bot === 'secret' ? 'tft' : bot}
            onChange={setBot}
            allowSecret={opponents === 'bot'}
          />
        )}
      </Card>

      {opponents !== 'botbot' && (
        <Card>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-indigo-600" checked={learning} onChange={(e) => setLearning(e.target.checked)} />
            <span>
              <span className="block font-semibold">🎯 Lernmodus „Erst tippen, dann sehen“</span>
              <span className="block text-sm text-slate-600 dark:text-slate-300">
                Vor der ersten Analyse sagst du das Gleichgewicht selbst voraus. Richtige Vorhersagen geben Bonuspunkte und fließen in deine
                Fehlerstatistik ein.
              </span>
            </span>
          </label>
        </Card>
      )}

      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-1 text-sm">
          {validation.errors.map((e) => (
            <p key={e} className="text-rose-600 dark:text-rose-400">
              ⛔ {e}
            </p>
          ))}
          {validation.warnings.map((w) => (
            <p key={w} className="text-amber-700 dark:text-amber-300">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}
      <Button className="w-full text-lg" disabled={!canStart} onClick={start}>
        Spiel starten
      </Button>
    </div>
  );
}

function BotPicker({
  label,
  value,
  onChange,
  allowSecret,
}: {
  label: string;
  value: BotChoice;
  onChange: (v: BotChoice) => void;
  allowSecret: boolean;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {allowSecret && (
          <Choice selected={value === 'secret'} onClick={() => onChange('secret')} className="sm:col-span-2">
            <span className="block font-semibold">❓ Geheimer Gegner (empfohlen)</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Zufällige Persönlichkeit – am Ende musst du raten, welche Strategie es war.
            </span>
          </Choice>
        )}
        {PD_BOT_IDS.map((id) => (
          <Choice key={id} selected={value === id} onClick={() => onChange(id)}>
            <span className="block font-semibold">
              {PD_BOTS[id].emoji} {PD_BOTS[id].name}
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{PD_BOTS[id].tagline}</span>
          </Choice>
        ))}
      </div>
    </div>
  );
}
