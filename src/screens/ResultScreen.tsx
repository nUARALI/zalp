import BoardView from '../components/BoardView';
import type { GameState } from '../game/types';
import { formatPercent, getStats } from '../lib';

interface Props {
  game: GameState;
  onRematch: () => void;
  onNewGame: () => void;
}

export default function ResultScreen({ game, onRematch, onNewGame }: Props) {
  const stats = getStats(game);
  const win = game.winner === 'player';

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6 text-center">
      <div className="text-5xl" aria-hidden>
        {win ? '🏆' : '🌊'}
      </div>
      <h2 className={`mt-2 text-3xl font-black ${win ? 'text-emerald-300' : 'text-rose-300'}`}>
        {win ? 'Победа!' : game.winner === 'computer' ? 'Поражение' : 'Ничья'}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {win ? 'Флот противника потоплен. Отличный залп, капитан!' : 'Ваш флот потоплен. Попробуйте реванш!'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-left">
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3">
          <div className="text-xs tracking-wider text-slate-400 uppercase">Вы</div>
          <div className="mt-1 text-sm text-slate-200">Выстрелов: <b>{stats.playerShots}</b></div>
          <div className="text-sm text-slate-200">Попаданий: <b>{stats.playerHits}</b></div>
          <div className="text-sm text-slate-200">Точность: <b>{formatPercent(stats.playerAccuracy)}</b></div>
        </div>
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3">
          <div className="text-xs tracking-wider text-slate-400 uppercase">Противник</div>
          <div className="mt-1 text-sm text-slate-200">Выстрелов: <b>{stats.computerShots}</b></div>
          <div className="text-sm text-slate-200">Попаданий: <b>{stats.computerHits}</b></div>
          <div className="text-sm text-slate-200">Точность: <b>{formatPercent(stats.computerAccuracy)}</b></div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Всего выстрелов в партии: {stats.totalShots}</p>

      <div className="mt-4 flex w-full flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          <BoardView board={game.boards.computer} disabled label="Флот противника (итог)" />
        </div>
        <div className="min-w-0 flex-1">
          <BoardView board={game.boards.player} disabled label="Ваш флот (итог)" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onRematch}
          className="rounded-2xl bg-cyan-500 px-4 py-3 text-base font-bold text-[#02222e]"
        >
          Реванш
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className="rounded-2xl border border-cyan-700 px-4 py-3 text-base font-semibold text-cyan-200"
        >
          Новая игра
        </button>
      </div>
    </div>
  );
}
