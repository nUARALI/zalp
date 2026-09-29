import { BOARD_SIZE, FLEET_SPEC, type Coord } from '../types';
import type { AIKnowledge } from './types';

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/** Множество уже обстрелянных клеток. */
export function triedSet(knowledge: AIKnowledge): Set<string> {
  const s = new Set<string>();
  for (const sh of knowledge.shots) s.add(cellKey(sh.at.x, sh.at.y));
  return s;
}

/** Все ещё не обстрелянные клетки. */
export function untriedCells(knowledge: AIKnowledge): Coord[] {
  const tried = triedSet(knowledge);
  const out: Coord[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!tried.has(cellKey(x, y))) out.push({ x, y });
    }
  }
  return out;
}

/** Ортогональные соседи в границах. */
export function orthogonalNeighbors(c: Coord): Coord[] {
  const out: Coord[] = [];
  if (c.x > 0) out.push({ x: c.x - 1, y: c.y });
  if (c.x < BOARD_SIZE - 1) out.push({ x: c.x + 1, y: c.y });
  if (c.y > 0) out.push({ x: c.x, y: c.y - 1 });
  if (c.y < BOARD_SIZE - 1) out.push({ x: c.x, y: c.y + 1 });
  return out;
}

/**
 * Найти потопленные корабли как связные (ортогонально) компоненты
 * hit/sunk-клеток, содержащие хотя бы один выстрел с result 'sunk'.
 * Возвращает список компонентов (каждый — массив клеток).
 */
export function sunkComponents(knowledge: AIKnowledge): Coord[][] {
  const hitMap = new Map<string, Coord>();
  const sunkKeys = new Set<string>();
  for (const sh of knowledge.shots) {
    if (sh.result === 'hit' || sh.result === 'sunk') {
      const k = cellKey(sh.at.x, sh.at.y);
      if (inBounds(sh.at.x, sh.at.y) && !hitMap.has(k)) {
        hitMap.set(k, { x: sh.at.x, y: sh.at.y });
      }
      if (sh.result === 'sunk') sunkKeys.add(k);
    }
  }
  const visited = new Set<string>();
  const components: Coord[][] = [];
  for (const sk of sunkKeys) {
    if (visited.has(sk)) continue;
    const comp: Coord[] = [];
    const stack: string[] = [sk];
    visited.add(sk);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const [cx, yc] = cur.split(',').map(Number) as [number, number];
      const coord = hitMap.get(cur);
      if (coord) comp.push(coord);
      const neighbours = [
        [cx - 1, yc],
        [cx + 1, yc],
        [cx, yc - 1],
        [cx, yc + 1],
      ] as const;
      for (const [nx, ny] of neighbours) {
        const nk = cellKey(nx, ny);
        if (!inBounds(nx, ny) || visited.has(nk) || !hitMap.has(nk)) continue;
        visited.add(nk);
        stack.push(nk);
      }
    }
    if (comp.length > 0) components.push(comp);
  }
  return components;
}

/** Клетки потопленных кораблей (множество ключей). */
export function sunkCellsSet(knowledge: AIKnowledge): Set<string> {
  const s = new Set<string>();
  for (const comp of sunkComponents(knowledge)) {
    for (const c of comp) s.add(cellKey(c.x, c.y));
  }
  return s;
}

/**
 * Попадания по ещё не потопленным кораблям:
 * все hit/sunk-клетки, не входящие в потопленные компоненты,
 * плюс 'hit' (не 'sunk' без компоненты — на случай несогласованности).
 */
export function unsunkHits(knowledge: AIKnowledge): Coord[] {
  const sunk = sunkCellsSet(knowledge);
  const out: Coord[] = [];
  const seen = new Set<string>();
  for (const sh of knowledge.shots) {
    if (sh.result !== 'hit') continue;
    const k = cellKey(sh.at.x, sh.at.y);
    if (sunk.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push({ x: sh.at.x, y: sh.at.y });
  }
  return out;
}

/**
 * Оставшиеся длины кораблей: FLEET_SPEC минус размеры потопленных.
 * Размер потопленного выводится из связной компоненты.
 */
export function remainingLengths(knowledge: AIKnowledge): number[] {
  const remaining = [...FLEET_SPEC];
  for (const comp of sunkComponents(knowledge)) {
    const idx = remaining.indexOf(comp.length);
    if (idx !== -1) remaining.splice(idx, 1);
  }
  return remaining;
}

/** Случайный выбор из массива через rng. */
export function pickRandom<T>(items: T[], rng: () => number): T {
  const idx = Math.floor(rng() * items.length);
  return items[idx]!;
}

/** Клетка касается (8 соседей, включая диагонали) множества sunk. */
export function touchesSunk(
  x: number,
  y: number,
  sunk: Set<string>,
  excludeOwn: Set<string>,
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const k = cellKey(x + dx, y + dy);
      if (excludeOwn.has(k)) continue;
      if (sunk.has(k)) return true;
    }
  }
  return false;
}
