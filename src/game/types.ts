/**
 * «Залп» — типы игрового движка.
 * Только чистый TypeScript, без React и DOM.
 * Всё состояние — JSON-сериализуемые plain-объекты.
 */

/** Координата клетки: x — столбец (0..9), y — строка (0..9). */
export interface Coord {
  x: number;
  y: number;
}

/** Состояние одной клетки на доске. */
export type CellState =
  | 'empty' // нет корабля, выстрела не было
  | 'ship' // есть корабль, попаданий по клетке не было
  | 'hit' // попадание по кораблю, но корабль ещё не потоплен
  | 'miss' // промах (включая авто-промахи вокруг потопленного)
  | 'sunk'; // клетка потопленного корабля

/** Поле 10x10: Board[y][x]. */
export type Board = CellState[][];

/** Корабль: список клеток. Попадания выводятся из Board. */
export interface Ship {
  id: number;
  cells: Coord[];
}

/** Результат выстрела. */
export type ShotResult = 'miss' | 'hit' | 'sunk';

/** Фаза игры. */
export type GamePhase = 'placement' | 'battle' | 'finished';

/** Игрок. */
export type PlayerId = 'player' | 'computer';

/** Одна запись в истории выстрелов (видимая всем). */
export interface ShotRecord {
  by: PlayerId;
  /** В кого стреляли. */
  target: PlayerId;
  at: Coord;
  result: ShotResult;
}

/** Полное состояние игры — JSON-сериализуемо. */
export interface GameState {
  phase: GamePhase;
  currentPlayer: PlayerId;
  boards: Record<PlayerId, Board>;
  fleets: Record<PlayerId, Ship[]>;
  shots: ShotRecord[];
  winner: PlayerId | null;
}

/** Стандартный флот: 1x4, 2x3, 3x2, 4x1. */
export const FLEET_SPEC: readonly number[] = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

/** Размер поля. */
export const BOARD_SIZE = 10;
