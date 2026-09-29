import type { GameState } from './game/types';
import type { Difficulty } from './game/ai';

const KEY = 'zalp-save-v1';

export interface SavedGame {
  state: GameState;
  difficulty: Difficulty;
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

export function saveGame(state: GameState, difficulty: Difficulty): void {
  try {
    const payload: SavedGame = { state, difficulty };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // LocalStorage может быть недоступен — игра продолжается без сейва
  }
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: unknown; difficulty?: unknown };
    if (!parsed.state || !isGameState(parsed.state)) return null;
    if (!isDifficulty(parsed.difficulty)) return null;
    return { state: parsed.state, difficulty: parsed.difficulty };
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
