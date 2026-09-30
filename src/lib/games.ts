import type { SupabaseClient } from '@supabase/supabase-js';
import type { Difficulty } from '../game/ai';
import type { GameState, Ship, ShotRecord } from '../game/types';
import { getStats } from './index';
import { supabaseErrorToRussian } from './errors';

/** Строка таблицы public.games (snake_case как в БД). */
export interface GameRow {
  id: string;
  difficulty: Difficulty;
  winner: 'player' | 'computer' | null;
  player_shots: number;
  player_hits: number;
  computer_shots: number;
  computer_hits: number;
  duration_sec: number;
  shots: ShotRecord[];
  player_fleet: Ship[];
  computer_fleet: Ship[];
}

export interface SaveResult {
  ok: boolean;
  errorRu?: string;
}

/** Новый id партии (генерируется на клиенте при старте). */
export function newMatchId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/**
 * Собрать строку для сохранения из завершённой партии.
 * Чистая функция — легко тестировать без Supabase.
 */
export function buildGameRow(
  matchId: string,
  game: GameState,
  difficulty: Difficulty,
  startedAtMs: number,
  nowMs: number = Date.now(),
): GameRow {
  const stats = getStats(game);
  const durationSec = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
  return {
    id: matchId,
    difficulty,
    winner: game.winner,
    player_shots: stats.playerShots,
    player_hits: stats.playerHits,
    computer_shots: stats.computerShots,
    computer_hits: stats.computerHits,
    duration_sec: durationSec,
    shots: game.shots.map((s) => ({
      by: s.by,
      target: s.target,
      at: { x: s.at.x, y: s.at.y },
      result: s.result,
    })),
    player_fleet: game.fleets.player.map((s) => ({
      id: s.id,
      cells: s.cells.map((c) => ({ x: c.x, y: c.y })),
    })),
    computer_fleet: game.fleets.computer.map((s) => ({
      id: s.id,
      cells: s.cells.map((c) => ({ x: c.x, y: c.y })),
    })),
  };
}

/**
 * Идемпотентно сохранить партию: upsert по id.
 * Никогда не бросает исключение — возвращает { ok, errorRu }.
 */
export async function saveFinishedGame(
  client: SupabaseClient,
  row: GameRow,
): Promise<SaveResult> {
  try {
    const { error } = await client
      .from('games')
      .upsert(row, { onConflict: 'id' });
    if (error) return { ok: false, errorRu: supabaseErrorToRussian(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, errorRu: supabaseErrorToRussian(err) };
  }
}
