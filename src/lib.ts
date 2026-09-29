import type { Coord, GameState } from './game/types';

const LETTERS = 'АБВГДЕЖЗИК';

export function coordToLabel(c: Coord): string {
  const l = LETTERS[c.x] ?? String(c.x + 1);
  return `${l}${c.y + 1}`;
}

export interface BattleStats {
  playerShots: number;
  playerHits: number;
  playerAccuracy: number;
  computerShots: number;
  computerHits: number;
  computerAccuracy: number;
  totalShots: number;
}

export function getStats(state: GameState): BattleStats {
  const playerShots = state.shots.filter((s) => s.by === 'player');
  const computerShots = state.shots.filter((s) => s.by === 'computer');
  const playerHits = playerShots.filter((s) => s.result !== 'miss').length;
  const computerHits = computerShots.filter((s) => s.result !== 'miss').length;
  return {
    playerShots: playerShots.length,
    playerHits,
    playerAccuracy:
      playerShots.length === 0 ? 0 : playerHits / playerShots.length,
    computerShots: computerShots.length,
    computerHits,
    computerAccuracy:
      computerShots.length === 0 ? 0 : computerHits / computerShots.length,
    totalShots: state.shots.length,
  };
}

export function formatPercent(v: number): string {
  return `${Math.round(v * 100)}%`;
}
