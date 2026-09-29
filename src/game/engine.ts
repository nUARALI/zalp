/**
 * «Залп» — игровой движок.
 * Чистый TypeScript, без React/DOM. Все функции чистые (не мутируют вход).
 */
import { normalizeRng } from './rng';
import {
  BOARD_SIZE,
  type Board,
  type Coord,
  type GameState,
  type PlayerId,
  type Ship,
  type ShotResult,
  FLEET_SPEC,
} from './types';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 'empty' as const),
  );
}

export function isInBounds(c: Coord): boolean {
  return (
    Number.isInteger(c.x) &&
    Number.isInteger(c.y) &&
    c.x >= 0 &&
    c.x < BOARD_SIZE &&
    c.y >= 0 &&
    c.y < BOARD_SIZE
  );
}

/** Построить клетки корабля из носа, длины и ориентации. */
export function getShipCells(
  origin: Coord,
  length: number,
  horizontal: boolean,
): Coord[] {
  const cells: Coord[] = [];
  for (let i = 0; i < length; i++) {
    cells.push({
      x: origin.x + (horizontal ? i : 0),
      y: origin.y + (horizontal ? 0 : i),
    });
  }
  return cells;
}

function key(c: Coord): string {
  return `${c.x},${c.y}`;
}

/**
 * Можно ли поставить корабль на эти клетки:
 * - все клетки в границах,
 * - без дубликатов,
 * - клетки свободны (нет пересечений),
 * - нет касаний (включая диагонали) с уже стоящими кораблями.
 * Соседство клеток внутри самого размещаемого корабля игнорируется.
 */
export function canPlaceShip(board: Board, cells: Coord[]): boolean {
  if (cells.length === 0) return false;

  const own = new Set(cells.map(key));
  // Дубликаты внутри cells
  if (own.size !== cells.length) return false;

  for (const c of cells) {
    if (!isInBounds(c)) return false;
    if (board[c.y][c.x] !== 'empty') return false;
  }

  for (const c of cells) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = c.x + dx;
        const ny = c.y + dy;
        if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;
        if (own.has(`${nx},${ny}`)) continue;
        if (board[ny][nx] !== 'empty') return false;
      }
    }
  }
  return true;
}

function copyBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

function nextShipId(ships: Ship[]): number {
  let max = -1;
  for (const s of ships) if (s.id > max) max = s.id;
  return max + 1;
}

export interface PlaceShipResult {
  board: Board;
  ships: Ship[];
}

/** Поставить корабль. Бросает ошибку, если нельзя. Не мутирует вход. */
export function placeShip(
  board: Board,
  ships: Ship[],
  cells: Coord[],
): PlaceShipResult {
  if (!canPlaceShip(board, cells)) {
    throw new Error('Нельзя разместить корабль в этих клетках');
  }
  const newBoard = copyBoard(board);
  for (const c of cells) {
    newBoard[c.y][c.x] = 'ship';
  }
  const ship: Ship = {
    id: nextShipId(ships),
    cells: cells.map((c) => ({ x: c.x, y: c.y })),
  };
  return { board: newBoard, ships: [...ships, ship] };
}

/** Убрать корабль по id. Бросает ошибку, если не найден. */
export function removeShip(
  board: Board,
  ships: Ship[],
  shipId: number,
): PlaceShipResult {
  const ship = ships.find((s) => s.id === shipId);
  if (!ship) throw new Error('Корабль не найден');
  const newBoard = copyBoard(board);
  for (const c of ship.cells) {
    if (isInBounds(c)) newBoard[c.y][c.x] = 'empty';
  }
  return {
    board: newBoard,
    ships: ships.filter((s) => s.id !== shipId),
  };
}

export interface RandomFleetResult {
  board: Board;
  ships: Ship[];
}

/**
 * Случайно расставить полный флот 1x4, 2x3, 3x2, 4x1.
 * Принимает seed (число) или rng-функцию — для детерминированных тестов.
 */
export function placeFleetRandomly(
  seedOrRng?: number | (() => number),
): RandomFleetResult {
  const rng = normalizeRng(seedOrRng);
  const MAX_RESTARTS = 100;

  for (let restart = 0; restart < MAX_RESTARTS; restart++) {
    let board = createEmptyBoard();
    let ships: Ship[] = [];
    let ok = true;

    for (const length of FLEET_SPEC) {
      let placed = false;
      // Пробуем случайные позиции для корабля этой длины
      for (let attempt = 0; attempt < 200; attempt++) {
        const horizontal = rng() < 0.5;
        const maxX = horizontal ? BOARD_SIZE - length : BOARD_SIZE - 1;
        const maxY = horizontal ? BOARD_SIZE - 1 : BOARD_SIZE - length;
        const ox = Math.floor(rng() * (maxX + 1));
        const oy = Math.floor(rng() * (maxY + 1));
        const cells = getShipCells({ x: ox, y: oy }, length, horizontal);
        if (!canPlaceShip(board, cells)) continue;
        const res = placeShip(board, ships, cells);
        board = res.board;
        ships = res.ships;
        placed = true;
        break;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok) return { board, ships };
  }
  throw new Error('Не удалось расставить флот случайно');
}

export interface ShotOutcome {
  board: Board;
  ships: Ship[];
  result: ShotResult;
  sunkShip?: Ship;
}

function findShipAt(ships: Ship[], target: Coord): Ship | undefined {
  return ships.find((s) =>
    s.cells.some((c) => c.x === target.x && c.y === target.y),
  );
}

/**
 * Выстрел по доске.
 * - бросает ошибку при выстреле за пределы поля,
 * - бросает ошибку при повторном выстреле в ту же клетку,
 * - при потоплении помечает 'sunk' и автоматически ставит 'miss'
 *   вокруг потопленного корабля.
 * Не мутирует входной board.
 */
export function receiveShot(
  board: Board,
  ships: Ship[],
  target: Coord,
): ShotOutcome {
  if (!isInBounds(target)) {
    throw new Error('Выстрел за пределами поля');
  }
  const cur = board[target.y][target.x];
  if (cur === 'miss' || cur === 'hit' || cur === 'sunk') {
    throw new Error('Повторный выстрел в клетку запрещён');
  }

  const newBoard = copyBoard(board);

  if (cur === 'empty') {
    newBoard[target.y][target.x] = 'miss';
    return { board: newBoard, ships, result: 'miss' };
  }

  // cur === 'ship'
  newBoard[target.y][target.x] = 'hit';
  const ship = findShipAt(ships, target);
  if (!ship) throw new Error('Внутренняя ошибка: корабль не найден');

  const allHit = ship.cells.every((c) => {
    if (c.x === target.x && c.y === target.y) return true;
    const v = newBoard[c.y]?.[c.x];
    return v === 'hit' || v === 'sunk';
  });

  if (!allHit) {
    return { board: newBoard, ships, result: 'hit' };
  }

  for (const c of ship.cells) {
    newBoard[c.y][c.x] = 'sunk';
  }
  // Авто-промахи вокруг потопленного корабля
  for (const c of ship.cells) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = c.x + dx;
        const ny = c.y + dy;
        if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;
        if (newBoard[ny][nx] === 'empty') newBoard[ny][nx] = 'miss';
      }
    }
  }
  return { board: newBoard, ships, result: 'sunk', sunkShip: ship };
}

/** Потоплен ли конкретный корабль (все клетки 'hit' или 'sunk'). */
export function isShipSunk(ship: Ship, board: Board): boolean {
  return ship.cells.every((c) => {
    if (!isInBounds(c)) return false;
    const v = board[c.y][c.x];
    return v === 'hit' || v === 'sunk';
  });
}

/** Потоплен ли весь флот. Пустой флот не считается потопленным. */
export function isFleetSunk(ships: Ship[], board: Board): boolean {
  if (ships.length === 0) return false;
  return ships.every((s) => isShipSunk(s, board));
}

/** Кто победил: тот, чей противник потоплен. Иначе null. */
export function getWinner(
  boards: Record<PlayerId, Board>,
  fleets: Record<PlayerId, Ship[]>,
): PlayerId | null {
  const playerSunk = isFleetSunk(fleets.player, boards.player);
  const computerSunk = isFleetSunk(fleets.computer, boards.computer);
  if (playerSunk && computerSunk) return null;
  if (computerSunk) return 'player';
  if (playerSunk) return 'computer';
  return null;
}

export function getOpponent(p: PlayerId): PlayerId {
  return p === 'player' ? 'computer' : 'player';
}

/** Начальное состояние: пустые поля, фаза расстановки. */
export function createInitialGameState(): GameState {
  return {
    phase: 'placement',
    currentPlayer: 'player',
    boards: {
      player: createEmptyBoard(),
      computer: createEmptyBoard(),
    },
    fleets: {
      player: [],
      computer: [],
    },
    shots: [],
    winner: null,
  };
}

function totalShipCells(ships: Ship[]): number {
  return ships.reduce((n, s) => n + s.cells.length, 0);
}

/** Проверить, готов ли флот к бою: 10 кораблей, 20 палуб. */
export function isFleetComplete(ships: Ship[]): boolean {
  if (ships.length !== FLEET_SPEC.length) return false;
  const sizes = ships.map((s) => s.cells.length).sort((a, b) => b - a);
  const expected = [...FLEET_SPEC].sort((a, b) => b - a);
  if (totalShipCells(ships) !== 20) return false;
  return sizes.every((v, i) => v === expected[i]);
}

/** Перевести игру в фазу боя. Требует два полных флота. */
export function startBattle(state: GameState): GameState {
  if (state.phase !== 'placement') throw new Error('Бой уже начался');
  if (!isFleetComplete(state.fleets.player)) {
    throw new Error('Флот игрока не готов');
  }
  if (!isFleetComplete(state.fleets.computer)) {
    throw new Error('Флот соперника не готов');
  }
  return { ...state, phase: 'battle' };
}

/**
 * Выстрел текущего игрока по сопернику.
 * Правило «попал — ходишь снова»: при 'hit'/'sunk' ход остаётся,
 * при 'miss' переходит сопернику. При потоплении всего флота —
 * фаза 'finished' и победитель.
 */
export function fire(state: GameState, target: Coord): GameState {
  if (state.phase === 'finished') throw new Error('Игра уже завершена');
  if (state.phase !== 'battle') throw new Error('Игра ещё не в фазе боя');

  const attacker = state.currentPlayer;
  const defender = getOpponent(attacker);
  const outcome = receiveShot(
    state.boards[defender],
    state.fleets[defender],
    target,
  );

  const boards: Record<PlayerId, Board> = {
    ...state.boards,
    [defender]: outcome.board,
  };
  const winner = getWinner(boards, state.fleets);

  if (winner) {
    return {
      ...state,
      boards,
      shots: [
        ...state.shots,
        {
          by: attacker,
          target: defender,
          at: { x: target.x, y: target.y },
          result: outcome.result,
        },
      ],
      phase: 'finished',
      winner,
    };
  }

  return {
    ...state,
    boards,
    shots: [
      ...state.shots,
      {
        by: attacker,
        target: defender,
        at: { x: target.x, y: target.y },
        result: outcome.result,
      },
    ],
    // попал — ходишь снова, промах — ход сопернику
    currentPlayer: outcome.result === 'miss' ? defender : attacker,
  };
}
