export interface GlossaryEntry {
  id: string;
  term: string;
  en: string;
  /** one or two sentences, RichText */
  text: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'br',
    term: 'Beste Antwort',
    en: 'best response',
    text: 'Eine Strategie, die gegeben die Strategien der anderen die eigene Auszahlung maximiert. In der Matrix: pro Spalte (bzw. Zeile) die höchste eigene Auszahlung unterstreichen.',
  },
  {
    id: 'dominant',
    term: 'Dominante Strategie',
    en: 'dominant strategy',
    text: 'Strikt dominant: liefert gegen **jede** Strategie des Gegners eine echt höhere Auszahlung als jede andere eigene Strategie. Schwach dominant: nie schlechter, mindestens einmal echt besser.',
  },
  {
    id: 'dominated',
    term: 'Dominierte Strategie',
    en: 'dominated strategy',
    text: 'Eine Strategie, zu der es eine Alternative gibt, die immer (schwach: nie schlechter und manchmal) besser ist. Strikt dominierte Strategien werden in keinem NE gespielt.',
  },
  {
    id: 'ne',
    term: 'Nash-Gleichgewicht (NE)',
    en: 'Nash equilibrium',
    text: 'Strategieprofil, in dem jede Strategie eine beste Antwort auf die anderen ist: Kein Spieler kann sich durch **einseitiges** Abweichen verbessern.',
  },
  {
    id: 'mixed',
    term: 'Gemischte Strategie',
    en: 'mixed strategy',
    text: 'Wahrscheinlichkeitsverteilung über reine Strategien. Im gemischten NE macht jeder Spieler den anderen **indifferent** zwischen den Strategien, die dieser mischt.',
  },
  {
    id: 'spe',
    term: 'Teilspielperfektes GG (SPE)',
    en: 'subgame perfect equilibrium',
    text: 'Ein NE, das in **jedem** Teilspiel ein NE induziert – auch abseits des Gleichgewichtspfads. Schließt leere Drohungen aus; in endlichen Spielen per Rückwärtsinduktion bestimmbar.',
  },
  {
    id: 'bi',
    term: 'Rückwärtsinduktion',
    en: 'backward induction',
    text: 'Lösungsverfahren für Spiele mit endlichem Horizont: Optimales Verhalten am Ende bestimmen, dann schrittweise nach vorn rechnen.',
  },
  {
    id: 'threat',
    term: 'Leere Drohung',
    en: 'non-credible threat',
    text: 'Eine angekündigte Reaktion, die der Spieler im Ernstfall nicht ausführen würde, weil sie ihm selbst schadet. NE können darauf beruhen, SPE nicht.',
  },
  {
    id: 'bne',
    term: 'Bayes-Nash-GG (BNE)',
    en: 'Bayesian Nash equilibrium',
    text: 'NE in Spielen mit unvollständiger Information: Jeder Typ jedes Spielers maximiert seinen **erwarteten** Nutzen gegeben seine Beliefs über die Typen der anderen (z. B. Auktionen mit privaten Werten).',
  },
  {
    id: 'pareto',
    term: 'Pareto-Effizienz',
    en: 'Pareto efficiency',
    text: 'Ein Ergebnis ist Pareto-effizient, wenn niemand besser gestellt werden kann, ohne einen anderen schlechter zu stellen.',
  },
  {
    id: 'delta',
    term: 'Diskontfaktor δ',
    en: 'discount factor',
    text: 'Gewicht zukünftiger Auszahlungen: 1 € in t Perioden ist heute $\\delta^t$ wert. Alternativ: Wahrscheinlichkeit, dass das Spiel nach einer Runde weitergeht.',
  },
  {
    id: 'folk',
    term: 'Folk-Theorem',
    en: 'folk theorem',
    text: 'In unendlich wiederholten Spielen kann bei hinreichend großem δ jedes zulässige Auszahlungsprofil, das allen mehr als ihr Minmax gibt, als (teilspielperfektes) GG erreicht werden – z. B. Kooperation im PD.',
  },
  {
    id: 'grim',
    term: 'Grim Trigger',
    en: 'grim trigger',
    text: 'Kooperiere, bis jemand abweicht – danach für immer die Strafe (im PD: D). Im PD stabil genau dann, wenn $\\delta \\ge \\frac{T-R}{T-P}$.',
  },
  {
    id: 'tft',
    term: 'Tit-for-Tat',
    en: 'tit for tat',
    text: 'Beginne mit Kooperation, spiele danach den letzten Zug des Gegners. Erfolgreich in Axelrods Turnieren; NE für großes δ, aber i. A. nicht teilspielperfekt.',
  },
  {
    id: 'osdp',
    term: 'One-Shot-Deviation-Prinzip',
    en: 'one-shot deviation principle',
    text: 'In diskontierten Spielen ist ein Strategieprofil genau dann ein SPE, wenn sich in keinem Teilspiel eine **einmalige** Abweichung (danach Rückkehr zur Strategie) lohnt.',
  },
  {
    id: 'fp',
    term: 'Fictitious Play',
    en: 'fictitious play',
    text: 'Lernregel: Spiele eine beste Antwort auf die empirische Häufigkeitsverteilung der bisherigen Züge des Gegners.',
  },
];

export const glossaryById = (id: string): GlossaryEntry | undefined => GLOSSARY.find((g) => g.id === id);
