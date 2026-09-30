import { describe, expect, it } from 'vitest';
import type { GameState } from '../game/types';
import { buildGameRow } from './games';
import { aggregateProfileStats, gameAccuracy } from './profileStats';

function finishedGame(winner: 'player' | 'computer'): GameState {
  return {
    phase: 'finished',
    currentPlayer: 'player',
    boards: {
      player: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 'empty' as const)),
      computer: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 'empty' as const)),
    },
    fleets: { player: [], computer: [] },
    shots: [
      { by: 'player', target: 'computer', at: { x: 0, y: 0 }, result: 'hit' },
      { by: 'player', target: 'computer', at: { x: 1, y: 0 }, result: 'miss' },
      { by: 'computer', target: 'player', at: { x: 2, y: 2 }, result: 'miss' },
    ],
    winner,
  };
}

describe('gameAccuracy', () => {
  it('0 при отсутствии выстрелов', () => {
    expect(gameAccuracy({ player_shots: 0, player_hits: 0 })).toBe(0);
  });
  it('считает попадания/выстрелы', () => {
    expect(gameAccuracy({ player_shots: 4, player_hits: 1 })).toBe(0.25);
  });
});

describe('buildGameRow', () => {
  it('собирает строку с id и статистикой', () => {
    const row = buildGameRow('id-1', finishedGame('player'), 'hard', 1000, 61000);
    expect(row.id).toBe('id-1');
    expect(row.difficulty).toBe('hard');
    expect(row.winner).toBe('player');
    expect(row.player_shots).toBe(2);
    expect(row.player_hits).toBe(1);
    expect(row.computer_shots).toBe(1);
    expect(row.computer_hits).toBe(0);
    expect(row.duration_sec).toBe(60);
    expect(row.shots).toHaveLength(3);
  });

  it('длительность не отрицательная', () => {
    const row = buildGameRow('id-2', finishedGame(null as never), 'easy', 5000, 1000);
    expect(row.duration_sec).toBe(0);
  });
});

describe('aggregateProfileStats', () => {
  it('пустой список даёт нули', () => {
    const s = aggregateProfileStats([]);
    expect(s.total).toBe(0);
    expect(s.wins).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.avgAccuracy).toBe(0);
  });

  it('считает победы, процент и точность', () => {
    const s = aggregateProfileStats([
      { difficulty: 'easy', winner: 'player', player_shots: 10, player_hits: 5 },
      { difficulty: 'hard', winner: 'computer', player_shots: 10, player_hits: 2 },
      { difficulty: 'hard', winner: 'player', player_shots: 0, player_hits: 0 },
    ]);
    expect(s.total).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBeCloseTo(2 / 3);
    // (0.5 + 0.2 + 0) / 3
    expect(s.avgAccuracy).toBeCloseTo(0.7 / 3);
    expect(s.byDifficulty.easy.played).toBe(1);
    expect(s.byDifficulty.easy.wins).toBe(1);
    expect(s.byDifficulty.hard.played).toBe(2);
    expect(s.byDifficulty.hard.wins).toBe(1);
    expect(s.byDifficulty.medium.played).toBe(0);
  });
});
