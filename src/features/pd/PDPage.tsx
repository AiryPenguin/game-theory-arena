import { useState } from 'react';
import { freshSeed } from '../../core/rng';
import { PD_BOT_IDS } from '../../games/pd/bots';
import { Term } from '../../ui/Term';
import type { PDMatchConfig } from './config';
import { PDMatch } from './PDMatch';
import { PDSetup } from './PDSetup';

export function PDPage() {
  const [config, setConfig] = useState<PDMatchConfig | null>(null);
  const [last, setLast] = useState<PDMatchConfig | undefined>(undefined);
  const [matchKey, setMatchKey] = useState(0);

  const restart = () => {
    if (!config) return;
    const seed = freshSeed();
    // a secret opponent gets a new random personality
    const seats = config.seats.map((s) =>
      s.kind === 'bot' && s.secret ? { ...s, botId: PD_BOT_IDS[seed % PD_BOT_IDS.length] } : s,
    ) as PDMatchConfig['seats'];
    setConfig({ ...config, seats, seed });
    setMatchKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">🔒 Gefangenendilemma</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Prisoner&apos;s Dilemma – einmalig, endlich wiederholt (<Term id="bi">Rückwärtsinduktion</Term>) oder mit unbekanntem Ende (
          <Term id="folk">Folk-Theorem</Term>).
        </p>
      </header>
      {config ? (
        <PDMatch
          key={matchKey}
          config={config}
          onRestart={restart}
          onSetup={() => {
            setLast(config);
            setConfig(null);
          }}
        />
      ) : (
        <PDSetup
          initial={last}
          onStart={(c) => {
            setConfig(c);
            setMatchKey((k) => k + 1);
            window.scrollTo(0, 0);
          }}
        />
      )}
    </div>
  );
}
