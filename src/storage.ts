import type { GameState } from './game/types';
import type { Difficulty } from './game/ai';

const KEY = 'zalp-save-v1';

export interface SavedGame {
  state: GameState;
  difficulty: Difficulty;
  /** Клиентский id партии для идемпотентного сейва в Supabase. */
  matchId: string;
  /** Время старта партии (мс) для подсчёта длительности. */
  startedAtMs: number;
}

function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'medium' || v === 'hard';
}

function isGameState(v: unknown): v is GameState {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (s.phase !== 'placement' && s.phase !== 'battle' && s.phase !== 'finished') return false;
  if (typeof s.boards !== 'object' || typeof s.fleets !== 'object') return false;
  if (!Array.isArray(s.shots)) return false;
  return true;
}

export function saveGame(
  state: GameState,
  difficulty: Difficulty,
  matchId: string,
  startedAtMs: number,
): void {
  try {
    const payload: SavedGame = { state, difficulty, matchId, startedAtMs };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // LocalStorage может быть недоступен — игра продолжается без сейва
  }
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: unknown;
      difficulty?: unknown;
      matchId?: unknown;
      startedAtMs?: unknown;
    };
    if (!parsed.state || !isGameState(parsed.state)) return null;
    if (!isDifficulty(parsed.difficulty)) return null;
    const matchId =
      typeof parsed.matchId === 'string' && parsed.matchId.length > 0
        ? parsed.matchId
        : `m-${Date.now().toString(36)}`;
    const startedAtMs =
      typeof parsed.startedAtMs === 'number' && Number.isFinite(parsed.startedAtMs)
        ? parsed.startedAtMs
        : Date.now();
    return { state: parsed.state, difficulty: parsed.difficulty, matchId, startedAtMs };
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
