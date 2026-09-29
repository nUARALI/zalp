import { DIFFICULTY_LABEL, type Difficulty } from '../game/ai';

interface Props {
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onPlay: () => void;
  hasSave: boolean;
  onContinue: () => void;
}

const OPTIONS: Difficulty[] = ['easy', 'medium', 'hard'];

export default function MenuScreen({
  difficulty,
  onDifficulty,
  onPlay,
  hasSave,
  onContinue,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-10 text-center">
      <div className="text-5xl" aria-hidden>
        ⚓
      </div>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-cyan-300">
        ЗАЛП
      </h1>
      <p className="mt-1 text-sm tracking-widest text-slate-400 uppercase">
        Морской бой
      </p>
      <p className="mt-4 max-w-xs text-sm text-slate-300">
        Поле 10×10. Флот: 1×4, 2×3, 3×2, 4×1. Попал — стреляешь снова.
      </p>

      <div className="mt-6 w-full rounded-2xl border border-cyan-900 bg-[#06263b]/60 p-4">
        <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Сложность
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Сложность">
          {OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={difficulty === d}
              onClick={() => onDifficulty(d)}
              className={`rounded-xl px-2 py-2 text-sm font-semibold transition-colors ${
                difficulty === d
                  ? 'bg-cyan-500 text-[#02222e]'
                  : 'bg-[#0e2f47] text-slate-200 hover:bg-[#175073]'
              }`}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Лёгкая — случайно. Средняя — шахматы + добивание. Сложная — карта
          вероятностей + добивание.
        </p>
      </div>

      <button
        type="button"
        onClick={onPlay}
        className="mt-6 w-full rounded-2xl bg-cyan-500 px-6 py-3 text-lg font-bold text-[#02222e] shadow-lg shadow-cyan-950 transition-transform active:scale-[0.98]"
      >
        Играть
      </button>
      {hasSave && (
        <button
          type="button"
          onClick={onContinue}
          className="mt-2 w-full rounded-2xl border border-cyan-700 bg-transparent px-6 py-3 text-base font-semibold text-cyan-200"
        >
          Продолжить партию
        </button>
      )}
    </div>
  );
}
