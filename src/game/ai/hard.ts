import { BOARD_SIZE } from '../types';
import { cellKey, pickRandom, remainingLengths, sunkCellsSet, triedSet } from './common';
import { finishingShot, huntCheckerboard } from './medium';
import type { AIKnowledge } from './types';
import type { Coord } from '../types';

/**
 * Подсчитать, сколько размещений оставшихся кораблей проходит
 * через каждую клетку, с учётом промахов (пересечение запрещено)
 * и запрета касания (включая диагонали) с потопленными.
 * Экспортирована для переиспользования тренером (без дублирования).
 */
export function densityScores(knowledge: AIKnowledge): number[][] {
  const scores: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0),
  );
  const remaining = remainingLengths(knowledge);
  if (remaining.length === 0) return scores;

  const tried = triedSet(knowledge);
  const sunk = sunkCellsSet(knowledge);

  const placementValid = (cells: Coord[]): boolean => {
    const own = new Set(cells.map((c) => cellKey(c.x, c.y)));
    for (const c of cells) {
      if (tried.has(cellKey(c.x, c.y))) return false;
    }
    for (const c of cells) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const k = cellKey(c.x + dx, c.y + dy);
          if (own.has(k)) continue;
          if (sunk.has(k)) return false;
        }
      }
    }
    return true;
  };

  for (const len of remaining) {
    // Горизонтальные
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x + len <= BOARD_SIZE; x++) {
        const cells: Coord[] = [];
        for (let i = 0; i < len; i++) cells.push({ x: x + i, y });
        if (!placementValid(cells)) continue;
        for (const c of cells) scores[c.y]![c.x]! += 1;
      }
    }
    if (len === 1) continue; // вертикаль = тот же одиночный
    // Вертикальные
    for (let y = 0; y + len <= BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cells: Coord[] = [];
        for (let i = 0; i < len; i++) cells.push({ x, y: y + i });
        if (!placementValid(cells)) continue;
        for (const c of cells) scores[c.y]![c.x]! += 1;
      }
    }
  }
  return scores;
}

/** Режим охоты для сложной: клетка с максимальной плотностью. */
export function huntDensity(knowledge: AIKnowledge, rng: () => number): Coord {
  const scores = densityScores(knowledge);
  let best = -1;
  let pool: Coord[] = [];
  const tried = triedSet(knowledge);
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (tried.has(cellKey(x, y))) continue;
      const s = scores[y]![x]!;
      if (s > best) {
        best = s;
        pool = [{ x, y }];
      } else if (s === best) {
        pool.push({ x, y });
      }
    }
  }
  if (pool.length === 0 || best <= 0) {
    return huntCheckerboard(knowledge, rng);
  }
  return pickRandom(pool, rng);
}

/** Сложная: добивание как у средней, охота — по карте плотностей. */
export function hardShot(knowledge: AIKnowledge, rng: () => number): Coord {
  return finishingShot(knowledge, rng) ?? huntDensity(knowledge, rng);
}
