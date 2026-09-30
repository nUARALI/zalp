import type { Difficulty } from '../game/ai';

/** Минимальные поля партии для статистики профиля. */
export interface ProfileGame {
  id?: string;
  difficulty: Difficulty;
  winner: 'player' | 'computer' | null;
  player_shots: number;
  player_hits: number;
  created_at?: string;
}

export interface DifficultyStats {
  played: number;
  wins: number;
  avgAccuracy: number;
}

export interface ProfileStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  avgAccuracy: number;
  byDifficulty: Record<Difficulty, DifficultyStats>;
}

/** Точность одной партии (0 при отсутствии выстрелов). */
export function gameAccuracy(g: Pick<ProfileGame, 'player_shots' | 'player_hits'>): number {
  if (g.player_shots <= 0) return 0;
  return g.player_hits / g.player_shots;
}

function emptyDiff(): DifficultyStats {
  return { played: 0, wins: 0, avgAccuracy: 0 };
}

/** Агрегировать статистику по списку партий. Чистая функция. */
export function aggregateProfileStats(games: ProfileGame[]): ProfileStats {
  const byDifficulty: Record<Difficulty, DifficultyStats> = {
    easy: emptyDiff(),
    medium: emptyDiff(),
    hard: emptyDiff(),
  };
  const accSum: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };

  let wins = 0;
  let losses = 0;
  let accTotal = 0;

  for (const g of games) {
    const acc = gameAccuracy(g);
    accTotal += acc;
    if (g.winner === 'player') wins += 1;
    else if (g.winner === 'computer') losses += 1;

    const d = byDifficulty[g.difficulty];
    if (d) {
      d.played += 1;
      if (g.winner === 'player') d.wins += 1;
      accSum[g.difficulty] += acc;
    }
  }

  const total = games.length;
  for (const k of ['easy', 'medium', 'hard'] as const) {
    const d = byDifficulty[k];
    d.avgAccuracy = d.played === 0 ? 0 : accSum[k] / d.played;
  }

  return {
    total,
    wins,
    losses,
    winRate: total === 0 ? 0 : wins / total,
    avgAccuracy: total === 0 ? 0 : accTotal / total,
    byDifficulty,
  };
}
