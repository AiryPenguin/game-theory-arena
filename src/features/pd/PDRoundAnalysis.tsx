import { moveIndex, pdBimatrix, type PDParams } from '../../games/pd/params';
import type { PDRound } from '../../games/pd/engine';
import { explainRound, repeatedDerivation, repeatedHint } from '../../games/pd/explain';
import { Card, H2 } from '../../ui/basics';
import { Derivation, Verdict } from '../../ui/feedback';
import { PayoffMatrix } from '../../ui/PayoffMatrix';
import { RichText } from '../../ui/RichText';
import { Term } from '../../ui/Term';

export function PDRoundAnalysis({ params, record, round, names }: { params: PDParams; record: PDRound; round: number; names: [string, string] }) {
  const e = explainRound(params, record.moves, names);
  const hint = repeatedHint(params, round);
  return (
    <Card className="space-y-4">
      <H2>
        Analyse Runde {round} – <Term id="ne">Nash-Gleichgewicht</Term>?
      </H2>
      <Verdict kind={e.verdict} headline={e.headline}>
        {e.summary.map((s, i) => (
          <p key={i}>
            <RichText text={s} />
          </p>
        ))}
      </Verdict>
      <PayoffMatrix game={pdBimatrix(params)} names={names} analysis played={[moveIndex(record.moves[0]), moveIndex(record.moves[1])]} />
      {hint && (
        <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100">
          🔁 <strong>Wiederholtes Spiel:</strong> <RichText text={hint} />
        </p>
      )}
      <Derivation steps={e.derivation} title="Formale Herleitung: Stufenspiel (Rechenweg)" />
      {params.mode !== 'oneShot' && (
        <Derivation
          steps={repeatedDerivation(params)}
          title={params.mode === 'finite' ? 'Formale Herleitung: Rückwärtsinduktion (SPE)' : 'Formale Herleitung: Folk-Theorem / Grim Trigger'}
        />
      )}
    </Card>
  );
}
