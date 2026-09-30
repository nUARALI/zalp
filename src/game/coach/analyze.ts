/**
 * «Тренер»: разбор завершённой партии с точки зрения игрока.
 * Чистый TypeScript, только данные партии (выстрелы + флоты).
 * Детерминирован: один вход — один выход, без rng и дат.
 */
import { BOARD_SIZE, type Coord } from '../types';
import { densityScores } from '../ai/hard';
import type { AIKnowledge } from '../ai/types';
import { coordToLabel } from '../../lib';
import type {
  CoachAnalysis,
  CoachInput,
  KeyMoment,
  MissedFinish,
  SunkInfo,
} from './types';

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function orthogonalKeys(k: string): string[] {
  const [x, y] = k.split(',').map(Number) as [number, number];
  const out: string[] = [];
  if (x > 0) out.push(key(x - 1, y));
  if (x < BOARD_SIZE - 1) out.push(key(x + 1, y));
  if (y > 0) out.push(key(x, y - 1));
  if (y < BOARD_SIZE - 1) out.push(key(x, y + 1));
  return out;
}

/** Разбить клетки на ортогонально-связные группы. */
function groupKeys(cells: Set<string>): Set<string>[] {
  const visited = new Set<string>();
  const groups: Set<string>[] = [];
  for (const start of cells) {
    if (visited.has(start)) continue;
    const group = new Set<string>();
    const stack = [start];
    visited.add(start);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      group.add(cur);
      for (const nb of orthogonalKeys(cur)) {
        if (!cells.has(nb) || visited.has(nb)) continue;
        visited.add(nb);
        stack.push(nb);
      }
    }
    groups.push(group);
  }
  return groups;
}

export function analyzeGame(input: CoachInput): CoachAnalysis {
  const playerShots = input.shots.filter((s) => s.by === 'player');
  const enemyShips = input.fleets.computer ?? [];

  // Карта клеток противника: ключ -> shipId
  const cellToShip = new Map<string, number>();
  for (const ship of enemyShips) {
    for (const c of ship.cells) cellToShip.set(key(c.x, c.y), ship.id);
  }

  // Тепловая карта: порядковый номер выстрела игрока (1-based)
  const heatmap: (number | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  const resultMap: CoachAnalysis['resultMap'] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  playerShots.forEach((s, i) => {
    if (s.at.x < 0 || s.at.x >= BOARD_SIZE || s.at.y < 0 || s.at.y >= BOARD_SIZE) return;
    if (heatmap[s.at.y]![s.at.x] === null) {
      heatmap[s.at.y]![s.at.x] = i + 1;
      resultMap[s.at.y]![s.at.x] = s.result;
    }
  });

  // Попадания по кораблям: shipId -> индексы выстрелов
  const hitsByShip = new Map<number, number[]>();
  playerShots.forEach((s, i) => {
    if (s.result === 'miss') return;
    const id = cellToShip.get(key(s.at.x, s.at.y));
    if (id === undefined) return;
    if (!hitsByShip.has(id)) hitsByShip.set(id, []);
    hitsByShip.get(id)!.push(i);
  });

  const sunk: SunkInfo[] = [];
  const sunkShipIds: number[] = [];
  let extraFinishing = 0;
  for (const ship of enemyShips) {
    const idxs = hitsByShip.get(ship.id) ?? [];
    const isSunk = ship.cells.length > 0 && idxs.length >= ship.cells.length;
    if (isSunk) {
      const first = Math.min(...idxs);
      const last = Math.max(...idxs);
      const extra = Math.max(0, last - first + 1 - ship.cells.length);
      extraFinishing += extra;
      sunk.push({ shipId: ship.id, length: ship.cells.length, sunkOnShot: last + 1, extraShots: extra });
      sunkShipIds.push(ship.id);
    } else {
      sunk.push({ shipId: ship.id, length: ship.cells.length, sunkOnShot: null, extraShots: 0 });
    }
  }
  sunk.sort((a, b) => (a.sunkOnShot ?? Infinity) - (b.sunkOnShot ?? Infinity));

  const hits = playerShots.filter((s) => s.result !== 'miss').length;
  const accuracy = playerShots.length === 0 ? 0 : hits / playerShots.length;

  let longestStreak = 0;
  let cur = 0;
  for (const s of playerShots) {
    if (s.result !== 'miss') {
      cur += 1;
      if (cur > longestStreak) longestStreak = cur;
    } else {
      cur = 0;
    }
  }

  // Пошаговый разбор: открытые попадания, охота, упущенные добивания.
  let huntShots = 0;
  let huntEven = 0;
  const missed: MissedFinish[] = [];
  const huntIndices: number[] = [];

  // Префиксные множества попаданий для переиспользования
  const prefixHitKeys: Set<string>[] = [];
  {
    const acc = new Set<string>();
    for (let i = 0; i <= playerShots.length; i++) {
      prefixHitKeys.push(new Set(acc));
      const s = playerShots[i];
      if (s && s.result !== 'miss') acc.add(key(s.at.x, s.at.y));
    }
  }

  const sunkIdsBefore = (upto: number): Set<number> => {
    // корабли, все клетки которых есть в префиксе [0, upto)
    const hit = prefixHitKeys[upto]!;
    const out = new Set<number>();
    for (const ship of enemyShips) {
      if (ship.cells.length === 0) continue;
      if (ship.cells.every((c) => hit.has(key(c.x, c.y)))) out.add(ship.id);
    }
    return out;
  };

  for (let i = 0; i < playerShots.length; i++) {
    const s = playerShots[i]!;
    const hit = prefixHitKeys[i]!;
    const sunkBefore = sunkIdsBefore(i);
    const open = new Set<string>();
    for (const k of hit) {
      const id = cellToShip.get(k);
      if (id !== undefined && !sunkBefore.has(id)) open.add(k);
      else if (id === undefined) open.add(k); // попадание мимо известного флота — считаем открытым
    }

    if (open.size === 0) {
      huntShots += 1;
      huntIndices.push(i);
      if ((s.at.x + s.at.y) % 2 === 0) huntEven += 1;
      continue;
    }

    const groups = groupKeys(open);
    if (groups.length !== 1) continue; // несколько открытых — выстрел в другое место логичен
    const openSet = groups[0]!;
    const target = key(s.at.x, s.at.y);
    let adjacent = false;
    for (const nb of orthogonalKeys(target)) {
      if (openSet.has(nb)) {
        adjacent = true;
        break;
      }
    }
    // Цель — клетка самого открытого корабля? Тогда это продолжение, не упущение.
    // Определяем через смежность (корабли не касаются, смежная = тот же корабль).
    if (!adjacent) {
      missed.push({ moveNumber: i + 1, at: { x: s.at.x, y: s.at.y }, result: s.result });
    }
  }

  // Ключевые моменты: выстрелы охоты, где плотность была значительно лучше.
  type Candidate = KeyMoment & { gap: number };
  const candidates: Candidate[] = [];
  for (const i of huntIndices) {
    const s = playerShots[i]!;
    const prev = playerShots.slice(0, i);
    const knowledge: AIKnowledge = {
      shots: prev.map((p) => ({ at: { x: p.at.x, y: p.at.y }, result: p.result })),
    };
    const tried = new Set(prev.map((p) => key(p.at.x, p.at.y)));
    let scores: number[][];
    try {
      scores = densityScores(knowledge);
    } catch {
      continue;
    }
    const chosenScore = scores[s.at.y]?.[s.at.x] ?? 0;
    let bestScore = -1;
    let better: Coord | null = null;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (tried.has(key(x, y))) continue;
        const sc = scores[y]?.[x] ?? 0;
        if (sc > bestScore) {
          bestScore = sc;
          better = { x, y };
        }
      }
    }
    if (!better || bestScore <= 0) continue;
    const gap = bestScore - chosenScore;
    if (gap >= 6 && bestScore >= chosenScore * 1.4) {
      const b = better;
      candidates.push({
        moveNumber: i + 1,
        chosen: { x: s.at.x, y: s.at.y },
        chosenScore,
        better: { x: b.x, y: b.y },
        betterScore: bestScore,
        gap,
        why:
          `Ход ${i + 1}: вы стреляли ${coordToLabel({ x: s.at.x, y: s.at.y })} ` +
          `(сила ${chosenScore}), а клетка ${coordToLabel({ x: b.x, y: b.y })} была сильнее ` +
          `(${bestScore}) — через неё проходит на ${gap} размещений больше с учётом ваших промахов.`,
      });
    }
  }
  candidates.sort((a, b) => b.gap - a.gap || a.moveNumber - b.moveNumber);
  const keyMoments: KeyMoment[] = candidates.slice(0, 3).map(({ gap: _gap, ...rest }) => rest);

  // Советы тренера (3–4 штуки).
  const tips: string[] = [];
  const huntEvenShare = huntShots === 0 ? 0 : huntEven / huntShots;
  const sunkCount = sunkShipIds.length;

  if (huntShots >= 4 && huntEvenShare < 0.5) {
    tips.push(
      `Охота через клетку: лишь ${Math.round(huntEvenShare * 100)}% выстрелов охоты — на «чёрных» клетках (x+y чётно). ` +
        `Стреляйте в шахматном порядке: любой корабль длиной 2+ занимает такую клетку, и вы найдёте флот быстрее.`,
    );
  }
  if (extraFinishing >= 4) {
    tips.push(
      `Добивание съело ${extraFinishing} лишних выстрелов. После двух попаданий в линию продолжайте вдоль неё ` +
        `до конца, а не стреляйте по бокам: ориентация уже известна, боковые клетки — почти всегда мимо.`,
    );
  }
  if (missed.length >= 1) {
    const m = missed[0]!;
    tips.push(
      `Не бросайте недобитый корабль: на ходе ${m.moveNumber} (${coordToLabel(m.at)}) вы ушли в другое место, ` +
        `хотя попадание ещё не потоплено. Сначала добейте открытый корабль — иначе противник «дышит», а вы тратите ходы.`,
    );
  }
  if (keyMoments.length >= 2) {
    tips.push(
      `Смотрите в центр: в ключевых моментах сильные клетки были в середине поля. ` +
        `Там проходит больше возможных размещений кораблей — начинайте охоту оттуда.`,
    );
  }
  if (tips.length === 0 && accuracy >= 0.4 && playerShots.length > 0) {
    tips.push(
      `Отличная точность (${Math.round(accuracy * 100)}%)! Держите план: шахматная охота, добивание вдоль линии, без возвратов к открытым кораблям.`,
    );
  }
  if (sunkCount > 0 && extraFinishing === 0) {
    tips.push(
      `Чистое добивание: ни одного лишнего выстрела вокруг потопленных. Так держать — это уровень сильного игрока.`,
    );
  }
  const fundamentals = [
    `Начинайте охоту с центра поля: через центральные клетки проходит больше размещений кораблей.`,
    `После двух попаданий в линию не проверяйте боковые клетки — идите вдоль линии до потопления.`,
    `Вокруг потопленного корабля стрелять не нужно: соседние клетки уже помечены промахами.`,
  ];
  for (const f of fundamentals) {
    if (tips.length >= 4) break;
    if (!tips.includes(f)) tips.push(f);
  }
  while (tips.length < 3) {
    tips.push(
      `Добивайте один корабль до конца, прежде чем искать следующий: открытые попадания не тонут сами.`,
    );
    if (tips.length >= 3) break;
  }

  return {
    heatmap,
    resultMap,
    metrics: {
      totalShots: playerShots.length,
      hits,
      accuracy,
      sunk,
      sunkCount,
      longestStreak,
      extraFinishing,
      huntShots,
      huntEven,
      huntEvenShare,
      missedFinishes: missed.length,
    },
    missed,
    keyMoments,
    tips: tips.slice(0, 4),
    sunkShipIds,
  };
}
