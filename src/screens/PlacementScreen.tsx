import { useMemo, useState } from 'react';
import BoardView from '../components/BoardView';
import {
  FLEET_SPEC,
  canPlaceShip,
  getShipCells,
  isFleetComplete,
  type Coord,
  type GameState,
} from '../game';

interface Props {
  game: GameState;
  horizontal: boolean;
  onToggleRotate: () => void;
  onPlace: (c: Coord) => void;
  onRemoveAt: (c: Coord) => void;
  onRandom: () => void;
  onReset: () => void;
  onToBattle: () => void;
  onBack: () => void;
}

function shipName(len: number): string {
  if (len === 4) return '4-палубный линкор';
  if (len === 3) return '3-палубный крейсер';
  if (len === 2) return '2-палубный эсминец';
  return '1-палубный катер';
}

export default function PlacementScreen({
  game,
  horizontal,
  onToggleRotate,
  onPlace,
  onRemoveAt,
  onRandom,
  onReset,
  onToBattle,
  onBack,
}: Props) {
  const [hover, setHover] = useState<Coord | null>(null);
  const board = game.boards.player;
  const ships = game.fleets.player;

  const nextLength: number | null =
    ships.length < FLEET_SPEC.length ? FLEET_SPEC[ships.length]! : null;

  const preview = useMemo(() => {
    if (!hover || nextLength === null) return null;
    const cells = getShipCells(hover, nextLength, horizontal);
    return { cells, valid: canPlaceShip(board, cells) };
  }, [hover, nextLength, horizontal, board]);

  const ready = isFleetComplete(ships);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-slate-400 hover:text-slate-200">
          ← Меню
        </button>
        <div className="text-sm text-slate-300">
          Кораблей: <b>{ships.length}/10</b>
        </div>
      </div>

      <h2 className="mt-2 text-center text-xl font-bold text-cyan-200">
        Расставьте флот
      </h2>
      <p className="mt-1 text-center text-sm text-slate-400">
        {nextLength !== null ? (
          <>
            Ставим: <b className="text-slate-200">{shipName(nextLength)}</b>{' '}
            ({horizontal ? 'горизонтально' : 'вертикально'}). Нажмите на клетку.
            Повторный тап по кораблю — убрать его.
          </>
        ) : (
          <>Флот готов! Можно идти в бой.</>
        )}
      </p>

      <div className="mt-3">
        <BoardView
          board={board}
          preview={preview}
          onCellClick={(c) => {
            const hit = ships.some((s) =>
              s.cells.some((cell) => cell.x === c.x && cell.y === c.y),
            );
            if (hit) onRemoveAt(c);
            else onPlace(c);
          }}
          onCellHover={setHover}
          label="Моё поле"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onToggleRotate}
          className="rounded-xl bg-[#0e2f47] px-2 py-2 text-sm font-semibold text-slate-100"
        >
          Повернуть ↻
        </button>
        <button
          type="button"
          onClick={onRandom}
          className="rounded-xl bg-[#0e2f47] px-2 py-2 text-sm font-semibold text-slate-100"
        >
          Случайно
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl bg-[#0e2f47] px-2 py-2 text-sm font-semibold text-slate-100"
        >
          Сбросить
        </button>
      </div>

      <button
        type="button"
        onClick={onToBattle}
        disabled={!ready}
        className={`mt-3 w-full rounded-2xl px-6 py-3 text-lg font-bold transition-transform active:scale-[0.98] ${
          ready
            ? 'bg-cyan-500 text-[#02222e] shadow-lg shadow-cyan-950'
            : 'cursor-not-allowed bg-slate-700 text-slate-400'
        }`}
      >
        В бой →
      </button>
      {!ready && (
        <p className="mt-1 text-center text-xs text-slate-500">
          Кнопка станет активна, когда будут размещены все 10 кораблей.
        </p>
      )}
    </div>
  );
}
