/** Fine-grained learning concepts. Every answer is attributed to exactly one concept. */
export type GameId = 'pd';

export interface Concept {
  id: string;
  game: GameId;
  label: string;
  /** English term for English-language exams */
  en: string;
}

export const GAME_NAMES: Record<GameId, { de: string; en: string }> = {
  pd: { de: 'Gefangenendilemma', en: "Prisoner's Dilemma" },
};

export const CONCEPTS = {
  'pd.validity': { id: 'pd.validity', game: 'pd', label: 'PD-Bedingung T > R > P > S', en: 'PD payoff ordering' },
  'pd.dominance': { id: 'pd.dominance', game: 'pd', label: 'Dominante Strategien', en: 'Dominant strategies' },
  'pd.stageNE': { id: 'pd.stageNE', game: 'pd', label: 'Reine NE im 2×2-Spiel', en: 'Pure-strategy Nash equilibria' },
  'pd.pareto': { id: 'pd.pareto', game: 'pd', label: 'Pareto-Effizienz', en: 'Pareto efficiency' },
  'pd.backwardInduction': { id: 'pd.backwardInduction', game: 'pd', label: 'Rückwärtsinduktion (endlich wiederholt)', en: 'Backward induction' },
  'pd.discountedValue': { id: 'pd.discountedValue', game: 'pd', label: 'Barwerte im unendlich wiederholten Spiel', en: 'Present values' },
  'pd.grimThreshold': { id: 'pd.grimThreshold', game: 'pd', label: 'Folk-Theorem: kritisches δ (Grim Trigger)', en: 'Critical discount factor' },
  'pd.grimStable': { id: 'pd.grimStable', game: 'pd', label: 'Ist Kooperation stabil?', en: 'Sustainability of cooperation' },
  'pd.tftThreshold': { id: 'pd.tftThreshold', game: 'pd', label: 'Tit-for-Tat als NE', en: 'Tit-for-Tat equilibrium' },
} as const satisfies Record<string, Concept>;

export type ConceptId = keyof typeof CONCEPTS;

export const CONCEPT_IDS = Object.keys(CONCEPTS) as ConceptId[];

export const conceptsOfGame = (g: GameId): ConceptId[] => CONCEPT_IDS.filter((id) => CONCEPTS[id].game === g);
