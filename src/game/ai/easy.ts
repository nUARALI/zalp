import { cellKey, pickRandom, sunkCellsSet, untriedCells } from './common';
import type { AIKnowledge } from './types';
import type { Coord } from '../types';

/**
 * Лёгкая: случайная непристрелянная клетка.
 * «Непристрелянная» = не было выстрела + не вода вокруг потопленного
 * (её и игрок видит как miss и туда не стреляет).
 */
export function easyShot(knowledge: AIKnowledge, rng: () => number): Coord {
  const sunk = sunkCellsSet(knowledge);

  const touchesSunkShip = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (sunk.has(cellKey(x + dx, y + dy))) return true;
      }
    }
    return false;
  };

  const all = untriedCells(knowledge);
  if (all.length === 0) throw new Error('Нет доступных клеток');

  const noTouch = all.filter((c) => !touchesSunkShip(c.x, c.y));
  if (noTouch.length > 0) return pickRandom(noTouch, rng);
  return pickRandom(all, rng);
}
