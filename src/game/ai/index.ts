/**
 * Честный ИИ «Залпа»: src/game/ai/
 * Вход — ТОЛЬКО история выстрелов компьютера (knowledge),
 * никаких досок и флотов игрока.
 */
import { normalizeRng } from '../rng';
import type { Coord, ShotRecord } from '../types';
import { easyShot } from './easy';
import { mediumShot } from './medium';
import { hardShot } from './hard';
import type { AIKnowledge, Difficulty, RngParam } from './types';

export type { AIKnowledge, AIShot, Difficulty, RngParam } from './types';
export { DIFFICULTY_LABEL, emptyKnowledge } from './types';

/**
 * Главная сигнатура:
 * chooseShot(knowledge, difficulty, rng) -> клетка выстрела.
 */
export function chooseShot(
  knowledge: AIKnowledge,
  difficulty: Difficulty = 'easy',
  rngParam: RngParam = undefined,
): Coord {
  const rng = normalizeRng(rngParam);
  if (difficulty === 'hard') return hardShot(knowledge, rng);
  if (difficulty === 'medium') return mediumShot(knowledge, rng);
  return easyShot(knowledge, rng);
}

/**
 * Построить knowledge ИИ из полной истории GameState.
 * Берём ТОЛЬКО выстрелы компьютера — расположение кораблей
 * игрока никогда не передаётся.
 */
export function knowledgeFromShots(shots: ShotRecord[]): AIKnowledge {
  return {
    shots: shots
      .filter((s) => s.by === 'computer')
      .map((s) => ({ at: { x: s.at.x, y: s.at.y }, result: s.result })),
  };
}

/**
 * Совместимость со старым API chooseAiShot(shots, difficulty, rng).
 * @deprecated Используйте chooseShot(knowledgeFromShots(shots), difficulty, rng).
 */
export function chooseAiShot(
  shots: ShotRecord[],
  difficulty: Difficulty = 'easy',
  rngParam: RngParam = undefined,
): Coord {
  return chooseShot(knowledgeFromShots(shots), difficulty, rngParam);
}
