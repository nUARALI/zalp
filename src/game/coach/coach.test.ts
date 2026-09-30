import { describe, expect, it } from 'vitest';
import { analyzeGame, type CoachInput } from './index';
import type { PlayerId, Ship, ShotRecord } from '../types';

function shot(
  x: number,
  y: number,
  result: ShotRecord['result'],
  n = 0,
): ShotRecord {
  void n;
  return { by: 'player', target: 'computer', at: { x, y }, result };
}

function fleet(ids: Array<{ id: number; cells: Array<[number, number]> }>): Record<PlayerId, Ship[]> {
  const computer: Ship[] = ids.map((s) => ({
    id: s.id,
    cells: s.cells.map(([x, y]) => ({ x, y })),
  }));
  return { player: [], computer };
}

/** Фикстура A: добивание с одним упущением и лишним выстрелом. */
function fixtureA(): CoachInput {
  return {
    shots: [
      shot(0, 0, 'hit'), // 1: hunt, попадание
      shot(9, 9, 'miss'), // 2: упущенное добивание (далеко от (0,0))
      shot(1, 0, 'sunk'), // 3: добил корабль 0
      shot(5, 5, 'sunk'), // 4: одиночка, hunt
    ],
    fleets: fleet([
      { id: 0, cells: [[0, 0], [1, 0]] },
      { id: 1, cells: [[5, 5]] },
    ]),
  };
}

describe('analyzeGame: heatmap', () => {
  it('все выстрелы в heatmap уникальны', () => {
    const a = analyzeGame(fixtureA());
    const seen = new Set<number>();
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const v = a.heatmap[y]![x]!;
        if (v !== null) {
          expect(seen.has(v)).toBe(false);
          seen.add(v);
        }
      }
    }
    expect(seen.size).toBe(4);
    expect(a.heatmap[0]![0]).toBe(1);
    expect(a.heatmap[9]![9]).toBe(2);
    expect(a.heatmap[0]![1]).toBe(3);
    expect(a.heatmap[5]![5]).toBe(4);
  });
});

describe('analyzeGame: метрики', () => {
  it('точность, потопления, серия, добивание, охота', () => {
    const a = analyzeGame(fixtureA());
    expect(a.metrics.totalShots).toBe(4);
    expect(a.metrics.hits).toBe(3);
    expect(a.metrics.accuracy).toBeCloseTo(0.75);
    // потопление корабля длины 2 на 3-м выстреле, одиночки — на 4-м
    const two = a.metrics.sunk.find((s) => s.length === 2)!;
    expect(two.sunkOnShot).toBe(3);
    expect(two.extraShots).toBe(1);
    const one = a.metrics.sunk.find((s) => s.length === 1)!;
    expect(one.sunkOnShot).toBe(4);
    expect(a.metrics.extraFinishing).toBe(1);
    expect(a.metrics.longestStreak).toBe(2);
    // охота: ходы 1 и 4, оба на чётной клетке
    expect(a.metrics.huntShots).toBe(2);
    expect(a.metrics.huntEvenShare).toBe(1);
    expect(a.sunkShipIds).toContain(0);
    expect(a.sunkShipIds).toContain(1);
  });
});

describe('analyzeGame: упущенные добивания', () => {
  it('находит уход в другое место после попадания', () => {
    const a = analyzeGame(fixtureA());
    expect(a.metrics.missedFinishes).toBe(1);
    expect(a.missed).toHaveLength(1);
    expect(a.missed[0]!.moveNumber).toBe(2);
    expect(a.missed[0]!.at).toEqual({ x: 9, y: 9 });
  });

  it('не считает упущением выстрел при нескольких открытых попаданиях', () => {
    // Ход 2 при одном открытом — упущение; ход 3 при двух открытых — логичен.
    const input: CoachInput = {
      shots: [
        shot(0, 0, 'hit'),
        shot(9, 0, 'hit'),
        shot(5, 5, 'miss'),
      ],
      fleets: fleet([
        { id: 0, cells: [[0, 0], [0, 1]] },
        { id: 1, cells: [[9, 0], [9, 1]] },
        { id: 2, cells: [[5, 5]] },
      ]),
    };
    const a = analyzeGame(input);
    expect(a.missed.map((m) => m.moveNumber)).toEqual([2]);
  });
});

describe('analyzeGame: детерминированность', () => {
  it('один вход — один выход', () => {
    const input = fixtureA();
    const a = analyzeGame(input);
    const b = analyzeGame(JSON.parse(JSON.stringify(input)) as CoachInput);
    expect(b).toEqual(a);
  });
});

describe('analyzeGame: ключевые моменты и советы', () => {
  it('угловой первый выстрел — ключевой момент (центр был сильнее)', () => {
    const input: CoachInput = {
      shots: [shot(0, 0, 'miss'), shot(9, 9, 'miss')],
      fleets: fleet([{ id: 0, cells: [[5, 5]] }]),
    };
    const a = analyzeGame(input);
    expect(a.keyMoments.length).toBeGreaterThan(0);
    expect(a.keyMoments.length).toBeLessThanOrEqual(3);
    const km = a.keyMoments[0]!;
    expect(km.moveNumber).toBe(1);
    expect(km.betterScore).toBeGreaterThan(km.chosenScore);
    expect(km.why.length).toBeGreaterThan(10);
  });

  it('советов 3–4, на русском', () => {
    const a = analyzeGame(fixtureA());
    expect(a.tips.length).toBeGreaterThanOrEqual(3);
    expect(a.tips.length).toBeLessThanOrEqual(4);
    for (const t of a.tips) expect(t.length).toBeGreaterThan(10);
  });
});
