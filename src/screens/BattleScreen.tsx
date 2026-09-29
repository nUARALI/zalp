import BoardView from '../components/BoardView';
import type { Coord, GameState } from '../game/types';
import { coordToLabel } from '../lib';

interface Props {
  game: GameState;
  onShoot: (c: Coord) => void;
  onSurrender: () => void;
}

function resultWord(r: string): string {
  if (r === 'miss') return 'мимо';
  if (r === 'hit') return 'попадание!';
  return 'потопил!';
}

export default function BattleScreen({ game, onShoot, onSurrender }: Props) {
  const myTurn = game.currentPlayer === 'player' && game.phase === 'battle';
  const last = [...game.shots].slice(-6).reverse();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            myTurn ? 'bg-emerald-500 text-emerald-950 animate-pulse' : 'bg-amber-500/20 text-amber-300'
          }`}
          role="status"
          aria-live="polite"
        >
          {myTurn ? 'Ваш ход — стреляйте!' : 'Ход противника…'}
        </div>
        <button
          type="button"
          onClick={onSurrender}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Сдаться
        </button>
      </div>

      <div className="mt-3 flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:justify-center">
        <div className="min-w-0 flex-1">
          <BoardView
            board={game.boards.computer}
            hideShips
            disabled={!myTurn}
            onCellClick={onShoot}
            label="Поле противника — ваш огонь"
          />
          {!myTurn && (
            <p className="mt-1 text-center text-xs text-slate-500">
              Дождитесь выстрела противника (~0,7 c)…
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <BoardView board={game.boards.player} disabled label="Моё поле — огонь противника" />
        </div>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3">
        <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Журнал выстрелов
        </div>
        {last.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">Пока тихо… Сделайте первый залп!</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {last.map((s, i) => (
              <li key={`${s.at.x}-${s.at.y}-${i}`} className="text-sm text-slate-200">
                <span className={s.by === 'player' ? 'text-cyan-300' : 'text-rose-300'}>
                  {s.by === 'player' ? 'Вы' : 'Противник'}
                </span>
                {' → '}
                {coordToLabel(s.at)} — {resultWord(s.result)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
