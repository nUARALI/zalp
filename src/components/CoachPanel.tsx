import { useMemo } from 'react';
import { analyzeGame, type CoachInput } from '../game/coach';
import { BOARD_SIZE } from '../game/types';
import { coordToLabel, formatPercent } from '../lib';

interface Props {
  input: CoachInput;
}

function heatCellClass(result: string | null): string {
  const base =
    'flex aspect-square min-w-0 min-h-0 flex-col items-center justify-center rounded-[3px] leading-none select-none';
  if (result === 'sunk') return `${base} bg-red-700 text-white`;
  if (result === 'hit') return `${base} bg-orange-500 text-white`;
  if (result === 'miss') return `${base} bg-[#082032] text-slate-500`;
  return `${base} bg-[#0e2f47] text-transparent`;
}

export default function CoachPanel({ input }: Props) {
  const analysis = useMemo(() => analyzeGame(input), [input]);
  const m = analysis.metrics;

  return (
    <div className="w-full min-w-0 text-left">
      <h3 className="text-center text-lg font-bold text-cyan-200">Разбор партии</h3>

      <div className="mt-2 text-center text-xs font-medium tracking-wide text-slate-400 uppercase">
        Тепловая карта ваших выстрелов
      </div>
      <div
        className="mx-auto mt-1 grid w-full max-w-[340px] grid-cols-10 gap-[2px] sm:gap-1"
        role="grid"
        aria-label="Тепловая карта выстрелов"
      >
        {Array.from({ length: BOARD_SIZE }, (_, y) =>
          Array.from({ length: BOARD_SIZE }, (_, x) => {
            const num = analysis.heatmap[y]![x]!;
            const res = analysis.resultMap[y]![x]!;
            return (
              <div
                key={`${x}-${y}`}
                role="gridcell"
                aria-label={
                  num === null
                    ? `Клетка ${coordToLabel({ x, y })}: без выстрела`
                    : `Клетка ${coordToLabel({ x, y })}: ход ${num}`
                }
                className={heatCellClass(res)}
              >
                {num !== null && (
                  <span className="text-[9px] font-bold sm:text-[10px]">{num}</span>
                )}
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-3 text-[11px] text-slate-400">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-orange-500" />попадание</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-700" />потопление</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#082032] ring-1 ring-slate-600" />промах</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3 text-sm">
          <div className="text-xs tracking-wider text-slate-400 uppercase">Точность</div>
          <div className="text-xl font-black text-slate-100">{formatPercent(m.accuracy)}</div>
          <div className="text-xs text-slate-400">{m.hits} из {m.totalShots}</div>
        </div>
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3 text-sm">
          <div className="text-xs tracking-wider text-slate-400 uppercase">Серия попаданий</div>
          <div className="text-xl font-black text-slate-100">{m.longestStreak}</div>
          <div className="text-xs text-slate-400">потоплено: {m.sunkCount}</div>
        </div>
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3 text-sm">
          <div className="text-xs tracking-wider text-slate-400 uppercase">Лишнее добивание</div>
          <div className="text-xl font-black text-slate-100">{m.extraFinishing}</div>
          <div className="text-xs text-slate-400">выстрелов сверх минимума</div>
        </div>
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3 text-sm">
          <div className="text-xs tracking-wider text-slate-400 uppercase">Шахматная охота</div>
          <div className="text-xl font-black text-slate-100">{formatPercent(m.huntEvenShare)}</div>
          <div className="text-xs text-slate-400">{m.huntEven} из {m.huntShots} выстрелов охоты</div>
        </div>
      </div>

      {m.sunk.length > 0 && (
        <div className="mt-2 rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3 text-sm text-slate-200">
          <div className="text-xs tracking-wider text-slate-400 uppercase">Потопления</div>
          <ul className="mt-1 space-y-1">
            {m.sunk.map((s) => (
              <li key={s.shipId} className="flex justify-between gap-2">
                <span>Корабль {s.length}-палубный</span>
                <span className="text-slate-400">
                  {s.sunkOnShot !== null ? `потоплен на ходе ${s.sunkOnShot}` : 'не потоплен'}
                  {s.extraShots > 0 ? ` (+${s.extraShots} лишн.)` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Ключевые моменты
        </div>
        {analysis.keyMoments.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">
            Грубо невыгодных выстрелов охоты не найдено — хороший выбор позиций.
          </p>
        ) : (
          <ul className="mt-1 space-y-2">
            {analysis.keyMoments.map((km) => (
              <li key={km.moveNumber} className="rounded-xl bg-[#0a2436] px-3 py-2 text-sm text-slate-200">
                <div className="font-bold text-amber-300">Ход {km.moveNumber}</div>
                <div className="mt-0.5">{km.why}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {analysis.missed.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Упущенные добивания ({analysis.missed.length})
          </div>
          <ul className="mt-1 space-y-1">
            {analysis.missed.map((ms) => (
              <li key={ms.moveNumber} className="text-sm text-slate-300">
                Ход {ms.moveNumber}: {coordToLabel(ms.at)} — ушли от открытого попадания.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Советы тренера
        </div>
        <ul className="mt-1 space-y-2">
          {analysis.tips.map((tip, i) => (
            <li key={i} className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
