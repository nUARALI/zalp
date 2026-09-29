import { describe, expect, it } from 'vitest';
import { chooseAiShot } from './ai';
import type { ShotRecord } from './types';

describe('chooseAiShot (честный ИИ)', () => {
  it('не повторяет уже обстрелянные клетки', () => {
    const shots: ShotRecord[] = [
      { by: 'computer', target: 'player', at: { x: 0, y: 0 }, result: 'miss' },
      { by: 'computer', target: 'player', at: { x: 5, y: 5 }, result: 'hit' },
      { by: 'player', target: 'computer', at: { x: 0, y: 0 }, result: 'miss' },
    ];
    for (let i = 0; i < 50; i++) {
      const c = chooseAiShot(shots, 'easy', i);
      expect(c).not.toEqual({ x: 0, y: 0 });
      expect(c).not.toEqual({ x: 5, y: 5 });
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(10);
    }
  });

  it('детерминирован при seed', () => {
    const a = chooseAiShot([], 'hard', 42);
    const b = chooseAiShot([], 'hard', 42);
    expect(a).toEqual(b);
  });

  it('бросает ошибку когда поле исчерпано', () => {
    const shots: ShotRecord[] = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        shots.push({ by: 'computer', target: 'player', at: { x, y }, result: 'miss' });
      }
    }
    expect(() => chooseAiShot(shots)).toThrow();
  });
});
