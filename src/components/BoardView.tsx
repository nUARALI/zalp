import { memo } from 'react';
import { BOARD_SIZE, type Board, type Coord } from '../game/types';
import { coordToLabel } from '../lib';

export interface Preview {
  cells: Coord[];
  valid: boolean;
}

interface Props {
  board: Board;
  hideShips?: boolean;
  disabled?: boolean;
  preview?: Preview | null;
  onCellClick?: (c: Coord) => void;
  onCellHover?: (c: Coord | null) => void;
  label?: string;
}

function cellText(visible: string): string {
  if (visible === 'miss') return '•';
  if (visible === 'hit') return '✕';
  if (visible === 'sunk') return '✕';
  return '';
}

function cellClass(visible: string, inPreview: boolean, previewValid: boolean): string {
  const base =
    'flex aspect-square min-w-0 min-h-0 items-center justify-center rounded-[3px] text-[13px] leading-none font-bold touch-manipulation select-none transition-colors duration-150 sm:text-sm';
  if (inPreview) {
    return `${base} ${previewValid ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-500 text-white'} animate-preview`;
  }
  switch (visible) {
    case 'ship':
      return `${base} bg-cyan-600/90 shadow-[inset_0_0_0_1px_rgba(165,243,252,0.7)]`;
    case 'miss':
      return `${base} bg-[#082032] text-slate-500`;
    case 'hit':
      return `${base} bg-orange-500 text-white animate-hit`;
    case 'sunk':
      return `${base} bg-red-700 text-white shadow-[inset_0_0_0_1px_rgba(254,202,202,0.8)] animate-sunk`;
    default:
      return `${base} bg-[#0e2f47] hover:bg-[#175073] active:bg-[#1d648f] text-transparent`;
  }
}

function BoardView({
  board,
  hideShips = false,
  disabled = false,
  preview = null,
  onCellClick,
  onCellHover,
  label,
}: Props) {
  const previewSet = new Set((preview?.cells ?? []).map((c) => `${c.x},${c.y}`));

  return (
    <div className="w-full min-w-0">
      {label && (
        <div className="mb-1 text-center text-xs font-medium tracking-wide text-slate-400 uppercase">
          {label}
        </div>
      )}
      <div
        className="mx-auto grid w-full max-w-[340px] grid-cols-10 gap-[2px] sm:gap-1"
        role="grid"
        aria-label={label ?? 'Игровое поле'}
      >
        {Array.from({ length: BOARD_SIZE }, (_, y) =>
          Array.from({ length: BOARD_SIZE }, (_, x) => {
            const raw = board[y]?.[x] ?? 'empty';
            const visible = hideShips && raw === 'ship' ? 'empty' : raw;
            const inPreview = previewSet.has(`${x},${y}`);
            return (
              <button
                key={`${x}-${y}-${visible}`}
                type="button"
                role="gridcell"
                aria-label={`Клетка ${coordToLabel({ x, y })}`}
                disabled={disabled}
                onClick={() => onCellClick?.({ x, y })}
                onMouseEnter={() => onCellHover?.({ x, y })}
                onMouseLeave={() => onCellHover?.(null)}
                onFocus={() => onCellHover?.({ x, y })}
                className={`${cellClass(visible, inPreview, preview?.valid ?? false)} ${
                  disabled ? '' : 'cursor-pointer'
                }`}
              >
                {inPreview ? '' : cellText(visible)}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

export default memo(BoardView);
