import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  canPlaceShip,
  createEmptyBoard,
  createInitialGameState,
  fire,
  FLEET_SPEC,
  getShipCells,
  getWinner,
  isFleetSunk,
  placeFleetRandomly,
  placeShip,
  receiveShot,
  removeShip,
  startBattle,
  type Board,
  type Coord,
  type Ship,
} from './index';

function cells(list: Array<[number, number]>): Coord[] {
  return list.map(([x, y]) => ({ x, y }));
}

function shipCellsOnBoard(board: Board): Set<string> {
  const s = new Set<string>();
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 'ship') s.add(`${x},${y}`);
    }
  }
  return s;
}

/** Проверка флота: размеры, границы, отсутствие пересечений и касаний. */
function validateFleet(board: Board, ships: Ship[]): string[] {
  const errors: string[] = [];
  if (ships.length !== 10) errors.push(`кораблей ${ships.length}, ждали 10`);

  const sizes = ships.map((s) => s.cells.length).sort((a, b) => b - a);
  const expected = [...FLEET_SPEC].sort((a, b) => b - a);
  if (JSON.stringify(sizes) !== JSON.stringify(expected)) {
    errors.push(`размеры ${sizes}, ждали ${expected}`);
  }

  const seen = new Map<string, number>();
  ships.forEach((s, idx) => {
    for (const c of s.cells) {
      if (c.x < 0 || c.x >= BOARD_SIZE || c.y < 0 || c.y >= BOARD_SIZE) {
        errors.push(`корабль ${idx} вне поля (${c.x},${c.y})`);
      }
      const k = `${c.x},${c.y}`;
      if (seen.has(k)) errors.push(`пересечение в ${k}`);
      seen.set(k, idx);
      if (board[c.y]?.[c.x] !== 'ship') {
        errors.push(`доска не помечена как ship в ${k}`);
      }
    }
  });

  // Касания между разными кораблями (включая диагонали)
  ships.forEach((s, idx) => {
    for (const c of s.cells) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = c.x + dx;
          const ny = c.y + dy;
          if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;
          const owner = seen.get(`${nx},${ny}`);
          if (owner !== undefined && owner !== idx) {
            errors.push(`касание между ${idx} и ${owner} около (${nx},${ny})`);
          }
        }
      }
    }
  });

  return errors;
}

describe('createEmptyBoard', () => {
  it('создаёт поле 10x10 из empty', () => {
    const b = createEmptyBoard();
    expect(b).toHaveLength(10);
    expect(b[0]).toHaveLength(10);
    expect(b.flat().every((c) => c === 'empty')).toBe(true);
  });
});

describe('canPlaceShip', () => {
  it('запрещает выход за границы', () => {
    const b = createEmptyBoard();
    // горизонтальный 4-палубный с x=7 вылезет за поле (7,8,9,10)
    expect(
      canPlaceShip(b, getShipCells({ x: 7, y: 0 }, 4, true)),
    ).toBe(false);
    // вертикальный с y=9 длиной 2
    expect(
      canPlaceShip(b, getShipCells({ x: 0, y: 9 }, 2, false)),
    ).toBe(false);
    // отрицательные координаты
    expect(canPlaceShip(b, cells([[-1, 0]]))).toBe(false);
    expect(canPlaceShip(b, cells([[10, 10]]))).toBe(false);
  });

  it('запрещает пересечение кораблей', () => {
    let b = createEmptyBoard();
    let ships: Ship[] = [];
    const r = placeShip(b, ships, getShipCells({ x: 2, y: 2 }, 3, true));
    b = r.board;
    ships = r.ships;
    // пересекает в (3,2)
    expect(
      canPlaceShip(b, getShipCells({ x: 3, y: 1 }, 3, false)),
    ).toBe(false);
    // полностью поверх
    expect(
      canPlaceShip(b, getShipCells({ x: 2, y: 2 }, 3, true)),
    ).toBe(false);
  });

  it('запрещает касание по стороне', () => {
    let b = createEmptyBoard();
    let ships: Ship[] = [];
    const r = placeShip(b, ships, cells([[5, 5]]));
    b = r.board;
    ships = r.ships;
    expect(canPlaceShip(b, cells([[5, 6]]))).toBe(false);
    expect(canPlaceShip(b, cells([[4, 5]]))).toBe(false);
    expect(canPlaceShip(b, cells([[5, 4]]))).toBe(false);
  });

  it('запрещает касание по диагонали', () => {
    let b = createEmptyBoard();
    const r = placeShip(b, [], cells([[5, 5]]));
    b = r.board;
    expect(canPlaceShip(b, cells([[4, 4]]))).toBe(false);
    expect(canPlaceShip(b, cells([[6, 4]]))).toBe(false);
    expect(canPlaceShip(b, cells([[4, 6]]))).toBe(false);
    expect(canPlaceShip(b, cells([[6, 6]]))).toBe(false);
  });

  it('разрешает на расстоянии в 2 клетки', () => {
    let b = createEmptyBoard();
    const r = placeShip(b, [], cells([[5, 5]]));
    b = r.board;
    expect(canPlaceShip(b, cells([[5, 7]]))).toBe(true);
    expect(canPlaceShip(b, cells([[7, 7]]))).toBe(true);
  });

  it('клетки одного корабля не считаются касанием', () => {
    const b = createEmptyBoard();
    expect(
      canPlaceShip(b, getShipCells({ x: 0, y: 0 }, 4, true)),
    ).toBe(true);
  });
});

describe('placeShip / removeShip', () => {
  it('ставит корабль и помечает доску', () => {
    const { board, ships } = placeShip(
      createEmptyBoard(),
      [],
      cells([
        [0, 0],
        [1, 0],
      ]),
    );
    expect(ships).toHaveLength(1);
    expect(board[0][0]).toBe('ship');
    expect(board[0][1]).toBe('ship');
    expect(board[0][2]).toBe('empty');
  });

  it('бросает ошибку при невалидной установке', () => {
    expect(() => placeShip(createEmptyBoard(), [], [])).toThrow();
    expect(() =>
      placeShip(createEmptyBoard(), [], cells([[9, 9], [10, 9]])),
    ).toThrow();
  });

  it('не мутирует входную доску', () => {
    const b = createEmptyBoard();
    placeShip(b, [], cells([[0, 0]]));
    expect(b[0][0]).toBe('empty');
  });

  it('removeShip убирает корабль', () => {
    let b = createEmptyBoard();
    let ships: Ship[] = [];
    const placed = placeShip(b, ships, cells([[1, 1], [1, 2]]));
    b = placed.board;
    ships = placed.ships;
    const removed = removeShip(b, ships, ships[0].id);
    expect(removed.ships).toHaveLength(0);
    expect(removed.board[1][1]).toBe('empty');
    expect(removed.board[2][1]).toBe('empty');
  });

  it('removeShip бросает ошибку для неизвестного id', () => {
    expect(() => removeShip(createEmptyBoard(), [], 999)).toThrow();
  });
});

describe('receiveShot', () => {
  it('промах помечает miss', () => {
    const { board, result } = receiveShot(createEmptyBoard(), [], {
      x: 0,
      y: 0,
    });
    expect(result).toBe('miss');
    expect(board[0][0]).toBe('miss');
  });

  it('бросает ошибку при выстреле за пределы поля', () => {
    expect(() =>
      receiveShot(createEmptyBoard(), [], { x: 10, y: 0 }),
    ).toThrow();
    expect(() =>
      receiveShot(createEmptyBoard(), [], { x: -1, y: 5 }),
    ).toThrow();
  });

  it('запрещает повторный выстрел', () => {
    let b = createEmptyBoard();
    const r1 = receiveShot(b, [], { x: 1, y: 1 });
    b = r1.board;
    expect(() => receiveShot(b, [], { x: 1, y: 1 })).toThrow();
  });

  it('запрещает повторный выстрел по попаданию', () => {
    let b = createEmptyBoard();
    const placed = placeShip(
      b,
      [],
      cells([
        [2, 2],
        [3, 2],
      ]),
    );
    b = placed.board;
    const r1 = receiveShot(b, placed.ships, { x: 2, y: 2 });
    expect(r1.result).toBe('hit');
    expect(() => receiveShot(r1.board, placed.ships, { x: 2, y: 2 })).toThrow();
  });

  it('одиночный корабль сразу sunk + авто-промахи вокруг', () => {
    let b = createEmptyBoard();
    const placed = placeShip(b, [], cells([[5, 5]]));
    const r = receiveShot(placed.board, placed.ships, { x: 5, y: 5 });
    expect(r.result).toBe('sunk');
    expect(r.board[5][5]).toBe('sunk');
    // все 8 соседей — miss
    const neighbors: Array<[number, number]> = [
      [4, 4],
      [5, 4],
      [6, 4],
      [4, 5],
      [6, 5],
      [4, 6],
      [5, 6],
      [6, 6],
    ];
    for (const [x, y] of neighbors) {
      expect(r.board[y][x]).toBe('miss');
    }
  });

  it('потопление многопалубного: hit, hit, sunk', () => {
    let b = createEmptyBoard();
    const placed = placeShip(
      b,
      [],
      cells([
        [0, 0],
        [1, 0],
        [2, 0],
      ]),
    );
    b = placed.board;
    const ships = placed.ships;

    const s1 = receiveShot(b, ships, { x: 0, y: 0 });
    expect(s1.result).toBe('hit');
    expect(s1.board[0][0]).toBe('hit');

    const s2 = receiveShot(s1.board, ships, { x: 1, y: 0 });
    expect(s2.result).toBe('hit');

    const s3 = receiveShot(s2.board, ships, { x: 2, y: 0 });
    expect(s3.result).toBe('sunk');
    expect(s3.board[0][0]).toBe('sunk');
    expect(s3.board[0][1]).toBe('sunk');
    expect(s3.board[0][2]).toBe('sunk');
    // авто-мисс под кораблём
    expect(s3.board[1][0]).toBe('miss');
    expect(s3.board[1][1]).toBe('miss');
    expect(s3.board[1][2]).toBe('miss');
    expect(s3.board[1][3]).toBe('miss');
  });

  it('авто-промахи у края поля не выходят за границы', () => {
    const placed = placeShip(createEmptyBoard(), [], cells([[0, 0]]));
    const r = receiveShot(placed.board, placed.ships, { x: 0, y: 0 });
    expect(r.result).toBe('sunk');
    expect(r.board[0][1]).toBe('miss');
    expect(r.board[1][0]).toBe('miss');
    expect(r.board[1][1]).toBe('miss');
  });
});

describe('isFleetSunk / getWinner', () => {
  it('пустой флот не считается потопленным', () => {
    expect(isFleetSunk([], createEmptyBoard())).toBe(false);
  });

  it('флот потоплен после всех попаданий', () => {
    const placed = placeShip(createEmptyBoard(), [], cells([[3, 3]]));
    expect(isFleetSunk(placed.ships, placed.board)).toBe(false);
    const shot = receiveShot(placed.board, placed.ships, { x: 3, y: 3 });
    expect(isFleetSunk(placed.ships, shot.board)).toBe(true);
  });

  it('getWinner определяет победителя', () => {
    const mk = (sunk: boolean) => {
      const p = placeShip(createEmptyBoard(), [], cells([[0, 0]]));
      if (!sunk) return { board: p.board, ships: p.ships };
      const s = receiveShot(p.board, p.ships, { x: 0, y: 0 });
      return { board: s.board, ships: p.ships };
    };
    const alive = mk(false);
    const dead = mk(true);
    expect(
      getWinner(
        { player: alive.board, computer: dead.board },
        { player: alive.ships, computer: dead.ships },
      ),
    ).toBe('player');
    expect(
      getWinner(
        { player: dead.board, computer: alive.board },
        { player: dead.ships, computer: alive.ships },
      ),
    ).toBe('computer');
    expect(
      getWinner(
        { player: alive.board, computer: alive.board },
        { player: alive.ships, computer: alive.ships },
      ),
    ).toBeNull();
  });
});

describe('placeFleetRandomly', () => {
  it('расставляет полный валидный флот', () => {
    const { board, ships } = placeFleetRandomly(42);
    const errors = validateFleet(board, ships);
    expect(errors).toEqual([]);
    expect(shipCellsOnBoard(board).size).toBe(20);
  });

  it('один seed даёт одинаковый флот', () => {
    const a = placeFleetRandomly(123);
    const b = placeFleetRandomly(123);
    expect(a.ships).toEqual(b.ships);
    expect(a.board).toEqual(b.board);
  });

  it('1000 прогонов — все валидны', () => {
    for (let i = 0; i < 1000; i++) {
      const { board, ships } = placeFleetRandomly(i);
      const errors = validateFleet(board, ships);
      if (errors.length > 0) {
        throw new Error(`seed ${i}: ${errors.join('; ')}`);
      }
    }
  }, 30000);
});

describe('GameState: fire и правило «попал — ходишь снова»', () => {
  function battleState(): ReturnType<typeof startBattle> {
    let s = createInitialGameState();
    const p = placeFleetRandomly(7);
    const c = placeFleetRandomly(8);
    s = {
      ...s,
      boards: { player: p.board, computer: c.board },
      fleets: { player: p.ships, computer: c.ships },
    };
    return startBattle(s);
  }

  it('startBattle требует полные флоты', () => {
    expect(() => startBattle(createInitialGameState())).toThrow();
  });

  it('промах передаёт ход', () => {
    let s = battleState();
    s = { ...s, currentPlayer: 'player' };
    // найти заведомо пустую клетку у соперника
    let target: Coord = { x: 0, y: 0 };
    outer: for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (s.boards.computer[y][x] === 'empty') {
          target = { x, y };
          break outer;
        }
      }
    }
    const next = fire(s, target);
    expect(
      next.shots[next.shots.length - 1]?.result,
    ).toBe('miss');
    expect(next.currentPlayer).toBe('computer');
    expect(next.phase).toBe('battle');
  });

  it('попадание оставляет ход', () => {
    let s = battleState();
    s = { ...s, currentPlayer: 'player' };
    // найти клетку с кораблём у соперника
    let target: Coord = { x: 0, y: 0 };
    outer: for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (s.boards.computer[y][x] === 'ship') {
          target = { x, y };
          break outer;
        }
      }
    }
    const next = fire(s, target);
    const last = next.shots[next.shots.length - 1];
    expect(['hit', 'sunk']).toContain(last?.result);
    expect(next.currentPlayer).toBe('player');
  });

  it('потопление всего флота завершает игру с победителем', () => {
    let s = createInitialGameState();
    // мини-флоты по одному однопалубнику для быстрой победы
    const p = placeShip(createEmptyBoard(), [], cells([[0, 0]]));
    const c = placeShip(createEmptyBoard(), [], cells([[9, 9]]));
    s = {
      ...s,
      boards: { player: p.board, computer: c.board },
      fleets: { player: p.ships, computer: c.ships },
      // обходим startBattle: ставим фазу напрямую для юнит-проверки fire
      phase: 'battle',
      currentPlayer: 'player',
    };
    const next = fire(s, { x: 9, y: 9 });
    expect(next.shots[next.shots.length - 1]?.result).toBe('sunk');
    expect(next.phase).toBe('finished');
    expect(next.winner).toBe('player');
    expect(() => fire(next, { x: 0, y: 0 })).toThrow();
  });

  it('состояние сериализуется в JSON', () => {
    const s = battleState();
    const json = JSON.stringify(s);
    const parsed = JSON.parse(json) as typeof s;
    expect(parsed.phase).toBe('battle');
    expect(parsed.boards.player).toHaveLength(10);
  });
});
