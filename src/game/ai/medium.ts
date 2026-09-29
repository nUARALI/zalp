import { cellKey, inBounds, orthogonalNeighbors, pickRandom, sunkCellsSet, triedSet, unsunkHits, untriedCells } from './common';
import type { AIKnowledge } from './types';
import type { Coord } from '../types';

/** Группировать unsunk-попадания в ортогонально-связные компоненты. */
function groupUnsunk(hits: Coord[]): Coord[][] {
  const map = new Map(hits.map((c) => [cellKey(c.x, c.y), c]));
  const visited = new Set<string>();
  const groups: Coord[][] = [];
  for (const h of hits) {
    const k = cellKey(h.x, h.y);
    if (visited.has(k)) continue;
    const group: Coord[] = [];
    const stack = [k];
    visited.add(k);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const coord = map.get(cur);
      if (coord) group.push(coord);
      const [cx, cy] = cur.split(',').map(Number) as [number, number];
      for (const nb of [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ] as const) {
        const nk = cellKey(nb[0], nb[1]);
        if (visited.has(nk) || !map.has(nk)) continue;
        visited.add(nk);
        stack.push(nk);
      }
    }
    groups.push(group);
  }
  return groups;
}

/**
 * Режим «добивание»: возвращает клетку рядом с недобитым кораблём
 * или null, если недобитых попаданий нет.
 * - одно попадание → случайный ортогональный сосед;
 * - два+ попадания → ориентация по линии, продолжение вдоль неё.
 */
export function finishingShot(knowledge: AIKnowledge, rng: () => number): Coord | null {
  const hits = unsunkHits(knowledge);
  if (hits.length === 0) return null;

  const groups = groupUnsunk(hits);
  // Выбираем группу с самым свежим попаданием
  let best: Coord[] = groups[0]!;
  let bestRecency = -1;
  const groupKeys = groups.map((g) => new Set(g.map((c) => cellKey(c.x, c.y))));
  for (let gi = 0; gi < groups.length; gi++) {
    const keys = groupKeys[gi]!;
    let recency = -1;
    for (let i = knowledge.shots.length - 1; i >= 0; i--) {
      const sh = knowledge.shots[i]!;
      if (sh.result !== 'hit') continue;
      if (keys.has(cellKey(sh.at.x, sh.at.y))) {
        recency = i;
        break;
      }
    }
    if (recency > bestRecency) {
      bestRecency = recency;
      best = groups[gi]!;
    }
  }

  const tried = triedSet(knowledge);
  const sunk = sunkCellsSet(knowledge);
  const isUntried = (x: number, y: number): boolean =>
    inBounds(x, y) && !tried.has(cellKey(x, y));

  // Не стреляем в клетку, которая касается потопленного (там корабля нет)
  const touchesSunkShip = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (sunk.has(cellKey(x + dx, y + dy))) return true;
      }
    }
    return false;
  };

  if (best.length === 1) {
    const c = best[0]!;
    const nbs = orthogonalNeighbors(c).filter((n) => isUntried(n.x, n.y));
    const smart = nbs.filter((n) => !touchesSunkShip(n.x, n.y));
    const pool = smart.length > 0 ? smart : nbs;
    if (pool.length === 0) return null;
    return pickRandom(pool, rng);
  }

  const xs = new Set(best.map((c) => c.x));
  const ys = new Set(best.map((c) => c.y));
  const horizontal = ys.size === 1 && xs.size > 1;
  const vertical = xs.size === 1 && ys.size > 1;

  if (horizontal || vertical) {
    const sorted = [...best].sort((a, b) =>
      horizontal ? a.x - b.x : a.y - b.y,
    );
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const ends: Coord[] = horizontal
      ? [
          { x: first.x - 1, y: first.y },
          { x: last.x + 1, y: last.y },
        ]
      : [
          { x: first.x, y: first.y - 1 },
          { x: first.x, y: last.y + 1 },
        ];
    const free = ends.filter((e) => isUntried(e.x, e.y) && !touchesSunkShip(e.x, e.y));
    if (free.length > 0) return pickRandom(free, rng);
    const freeAny = ends.filter((e) => isUntried(e.x, e.y));
    if (freeAny.length > 0) return pickRandom(freeAny, rng);
    return null;
  }

  // Несогласованная группа (не по линии) — окружаем её
  const seen = new Set<string>();
  const pool: Coord[] = [];
  for (const c of best) {
    for (const n of orthogonalNeighbors(c)) {
      const k = cellKey(n.x, n.y);
      if (seen.has(k) || !isUntried(n.x, n.y)) continue;
      seen.add(k);
      pool.push(n);
    }
  }
  if (pool.length === 0) return null;
  return pickRandom(pool, rng);
}

/** Режим «охота» для средней: случайно по шахматной сетке. */
export function huntCheckerboard(knowledge: AIKnowledge, rng: () => number): Coord {
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

  const parity = all.filter(
    (c) => (c.x + c.y) % 2 === 0 && !touchesSunkShip(c.x, c.y),
  );
  if (parity.length > 0) return pickRandom(parity, rng);

  const noTouch = all.filter((c) => !touchesSunkShip(c.x, c.y));
  if (noTouch.length > 0) return pickRandom(noTouch, rng);

  return pickRandom(all, rng);
}

/** Средняя: добивание при наличии попаданий, иначе шахматная охота. */
export function mediumShot(knowledge: AIKnowledge, rng: () => number): Coord {
  return finishingShot(knowledge, rng) ?? huntCheckerboard(knowledge, rng);
}
