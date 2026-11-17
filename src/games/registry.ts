/** Maps learning concepts to their exercise generators (one entry per game module). */
import type { Rng } from '../core/rng';
import { CONCEPTS, type ConceptId, type GameId } from '../learning/concepts';
import type { Task } from '../learning/tasks';
import { generatePDTask, PD_EXAM_CONCEPTS, pdExamConcepts } from './pd/exercises';

interface GameExercises {
  concepts: ConceptId[];
  generate(concept: ConceptId, rng: Rng): Task;
  examSet(rng: Rng, n: number): ConceptId[];
}

export const EXERCISES: Record<GameId, GameExercises> = {
  pd: { concepts: PD_EXAM_CONCEPTS, generate: generatePDTask, examSet: pdExamConcepts },
};

export function generateTask(concept: ConceptId, rng: Rng): Task {
  return EXERCISES[CONCEPTS[concept].game].generate(concept, rng);
}

export const ALL_EXAM_CONCEPTS: ConceptId[] = Object.values(EXERCISES).flatMap((e) => e.concepts);
