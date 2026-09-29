/**
 * Честный ИИ для «Залпа».
 * Получает ТОЛЬКО историю выстрелов (что видел бы игрок),
 * никогда не читает доски и флоты напрямую.
 */
import { normalizeRng } from './rng';
import { BOARD_SIZE, type Coord, type ShotRecord } from './types';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

/**
 * Выбрать клетку для выстрела компьютера.
 * @param shots — полная история выстрелов из GameState (фильтруем свои).
 * @param difficulty — пока заглушка: все уровни стреляют случайно.
 * @param seedOrRng — для тестов.
 */
export function chooseAiShot(
  shots: ShotRecord[],
  difficulty: Difficulty = 'easy',
  seedOrRng?: number | (() => number),
): Coord {
  void difficulty; // заглушка: пока все сложности — случайные выстрелы
  const rng = normalizeRng(seedOrRng);
  const tried = new Set<string>();
  for (const s of shots) {
    if (s.by === 'computer') tried.add(`${s.at.x},${s.at.y}`);
  }
  const candidates: Coord[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!tried.has(`${x},${y}`)) candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) throw new Error('Нет доступных клеток');
  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx]!;
}
