import { describe, expect, it } from 'vitest';
import { isFleetSunk, placeFleetRandomly, receiveShot } from '../engine';
import { createSeededRng } from '../rng';
import type { Coord } from '../types';
import { chooseShot, type AIKnowledge, type Difficulty } from './index';

function knowledgeOf(shots: AIKnowledge['shots']): AIKnowledge {
  return { shots };
}

describe('chooseShot: базовые гарантии', () => {
  it('никогда не стреляет в одну клетку дважды (все сложности)', () => {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    for (const difficulty of difficulties) {
      // 50 случайных уже обстрелянных клеток
      const rng = createSeededRng(difficulty.length * 100 + 7);
      const taken = new Set<string>();
      const shots: AIKnowledge['shots'] = [];
      while (shots.length < 50) {
        const x = Math.floor(rng() * 10);
        const y = Math.floor(rng() * 10);
        const k = `${x},${y}`;
        if (taken.has(k)) continue;
        taken.add(k);
        shots.push({ at: { x, y }, result: 'miss' });
      }
      const knowledge = knowledgeOf(shots);
      for (let i = 0; i < 30; i++) {
        const c = chooseShot(knowledge, difficulty, 1000 + i);
        expect(taken.has(`${c.x},${c.y}`)).toBe(false);
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x).toBeLessThan(10);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThan(10);
      }
    }
  });

  it('детерминирован при seed', () => {
    const k = knowledgeOf([]);
    expect(chooseShot(k, 'hard', 42)).toEqual(chooseShot(k, 'hard', 42));
    expect(chooseShot(k, 'medium', 42)).toEqual(chooseShot(k, 'medium', 42));
  });

  it('бросает ошибку когда поле исчерпано', () => {
    const shots: AIKnowledge['shots'] = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        shots.push({ at: { x, y }, result: 'miss' });
      }
    }
    expect(() => chooseShot(knowledgeOf(shots), 'easy', 1)).toThrow();
    expect(() => chooseShot(knowledgeOf(shots), 'medium', 1)).toThrow();
    expect(() => chooseShot(knowledgeOf(shots), 'hard', 1)).toThrow();
  });
});

describe('chooseShot: добивание', () => {
  it('средний после одиночного попадания бьёт рядом (манхэттен = 1)', () => {
    const knowledge = knowledgeOf([{ at: { x: 5, y: 5 }, result: 'hit' }]);
    for (let seed = 0; seed < 20; seed++) {
      const c = chooseShot(knowledge, 'medium', seed);
      const dist = Math.abs(c.x - 5) + Math.abs(c.y - 5);
      expect(dist).toBe(1);
    }
  });

  it('сложный после одиночного попадания бьёт рядом', () => {
    const knowledge = knowledgeOf([{ at: { x: 0, y: 0 }, result: 'hit' }]);
    for (let seed = 0; seed < 20; seed++) {
      const c = chooseShot(knowledge, 'hard', seed);
      const dist = Math.abs(c.x - 0) + Math.abs(c.y - 0);
      expect(dist).toBe(1);
    }
  });

  it('по двум попаданиям в линию продолжает вдоль неё', () => {
    // Горизонтальный корабль: попадания (4,5),(5,5) → следующий (3,5) или (6,5)
    const knowledge = knowledgeOf([
      { at: { x: 4, y: 5 }, result: 'hit' },
      { at: { x: 5, y: 5 }, result: 'hit' },
    ]);
    for (let seed = 0; seed < 20; seed++) {
      const c: Coord = chooseShot(knowledge, 'medium', seed);
      expect([
        [3, 5],
        [6, 5],
      ]).toContainEqual([c.x, c.y]);
    }
    for (let seed = 0; seed < 20; seed++) {
      const c: Coord = chooseShot(knowledge, 'hard', seed);
      expect([
        [3, 5],
        [6, 5],
      ]).toContainEqual([c.x, c.y]);
    }
  });

  it('вертикальная линия: продолжает вверх/вниз', () => {
    const knowledge = knowledgeOf([
      { at: { x: 2, y: 2 }, result: 'hit' },
      { at: { x: 2, y: 3 }, result: 'hit' },
    ]);
    for (let seed = 0; seed < 20; seed++) {
      const c = chooseShot(knowledge, 'medium', seed);
      expect([
        [2, 1],
        [2, 4],
      ]).toContainEqual([c.x, c.y]);
    }
  });
});

/** Симуляция: сколько выстрелов нужно ИИ, чтобы потопить весь флот. */
function shotsToSink(
  difficulty: Difficulty,
  fleetSeed: number,
  aiSeed: number,
  maxShots = 200,
): number {
  const fleet = placeFleetRandomly(fleetSeed);
  let board = fleet.board;
  const ships = fleet.ships;
  const knowledge: AIKnowledge = { shots: [] };
  const rng = createSeededRng(aiSeed);
  let count = 0;
  while (!isFleetSunk(ships, board)) {
    if (count >= maxShots) break;
    const target = chooseShot(knowledge, difficulty, rng);
    const outcome = receiveShot(board, ships, target);
    board = outcome.board;
    knowledge.shots.push({ at: target, result: outcome.result });
    count++;
  }
  return count;
}

describe('chooseShot: симуляция 200 партий', () => {
  it('сложный топит в среднем быстрее случайного', () => {
    const N = 200;
    let easyTotal = 0;
    let hardTotal = 0;
    for (let i = 0; i < N; i++) {
      // Один и тот же флот для обоих — честное сравнение
      const fleetSeed = 5000 + i;
      easyTotal += shotsToSink('easy', fleetSeed, 9000 + i);
      hardTotal += shotsToSink('hard', fleetSeed, 9000 + i);
    }
    const easyAvg = easyTotal / N;
    const hardAvg = hardTotal / N;
    // Диагностический вывод виден при --reporter=verbose
    console.log(`easy avg=${easyAvg.toFixed(2)} hard avg=${hardAvg.toFixed(2)}`);
    expect(hardAvg).toBeLessThan(easyAvg);
  }, 60000);
});
