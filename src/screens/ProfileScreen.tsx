import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import AuthPanel from '../components/AuthPanel';
import CoachPanel from '../components/CoachPanel';
import { DIFFICULTY_LABEL } from '../game/ai';
import type { CoachInput } from '../game/coach';
import type { Coord, PlayerId, Ship, ShotRecord } from '../game/types';
import { supabaseErrorToRussian } from '../lib/errors';
import { aggregateProfileStats, type ProfileGame } from '../lib/profileStats';
import { formatPercent } from '../lib';
import { getSupabase } from '../lib/supabase';

interface Props {
  user: User | null;
  onBack: () => void;
  /** Последняя сыгранная партия (для гостя без истории). */
  guestInput?: CoachInput | null;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isCoord(v: unknown): v is Coord {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.x === 'number' &&
    Number.isInteger(c.x) &&
    c.x >= 0 &&
    c.x < 10 &&
    typeof c.y === 'number' &&
    Number.isInteger(c.y) &&
    c.y >= 0 &&
    c.y < 10
  );
}

function isShip(v: unknown): v is Ship {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (typeof s.id !== 'number' || !Array.isArray(s.cells)) return false;
  return (s.cells as unknown[]).every(isCoord);
}

/** Собрать вход тренера из сохранённой строки Supabase. Null — данных нет. */
function coachInputFromStored(row: {
  shots?: unknown;
  player_fleet?: unknown;
  computer_fleet?: unknown;
}): CoachInput | null {
  if (!Array.isArray(row.shots) || !Array.isArray(row.player_fleet) || !Array.isArray(row.computer_fleet)) {
    return null;
  }
  const shots: ShotRecord[] = [];
  for (const s of row.shots as unknown[]) {
    if (typeof s !== 'object' || s === null) return null;
    const r = s as Record<string, unknown>;
    if (r.by !== 'player' && r.by !== 'computer') return null;
    if (r.target !== 'player' && r.target !== 'computer') return null;
    if (!isCoord(r.at)) return null;
    if (r.result !== 'miss' && r.result !== 'hit' && r.result !== 'sunk') return null;
    shots.push({
      by: r.by,
      target: r.target,
      at: { x: (r.at as Coord).x, y: (r.at as Coord).y },
      result: r.result,
    });
  }
  const playerFleet: Ship[] = [];
  const computerFleet: Ship[] = [];
  for (const s of row.player_fleet as unknown[]) {
    if (!isShip(s)) return null;
    playerFleet.push({ id: s.id, cells: s.cells.map((c) => ({ x: c.x, y: c.y })) });
  }
  for (const s of row.computer_fleet as unknown[]) {
    if (!isShip(s)) return null;
    computerFleet.push({ id: s.id, cells: s.cells.map((c) => ({ x: c.x, y: c.y })) });
  }
  const fleets: Record<PlayerId, Ship[]> = { player: playerFleet, computer: computerFleet };
  return { shots, fleets };
}

export default function ProfileScreen({ user, onBack, guestInput = null }: Props) {
  const [games, setGames] = useState<ProfileGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorRu, setErrorRu] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailInput, setDetailInput] = useState<CoachInput | null>(null);
  const [showGuestCoach, setShowGuestCoach] = useState(false);

  useEffect(() => {
    if (!user) return;
    const client = getSupabase();
    if (!client) return;
    let cancelled = false;
    setLoading(true);
    setErrorRu('');
    (async () => {
      try {
        const { data, error } = await client
          .from('games')
          .select('id,difficulty,winner,player_shots,player_hits,created_at')
          .order('created_at', { ascending: false })
          .limit(20);
        if (cancelled) return;
        if (error) {
          setErrorRu(supabaseErrorToRussian(error));
          return;
        }
        setGames((data ?? []) as ProfileGame[]);
      } catch (err) {
        if (!cancelled) setErrorRu(supabaseErrorToRussian(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-4">
        <button type="button" onClick={onBack} className="text-sm text-slate-400 hover:text-slate-200">
          ← Назад
        </button>
        <h2 className="mt-2 text-center text-xl font-bold text-cyan-200">Профиль</h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Войдите, чтобы сохранять историю партий и видеть статистику.
        </p>
        <div className="mt-4 rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-4">
          <AuthPanel user={null} />
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          Играть можно и без входа — гостем.
        </p>
        {guestInput && guestInput.shots.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowGuestCoach((v) => !v)}
              aria-expanded={showGuestCoach}
              className="w-full rounded-2xl border border-amber-700 bg-amber-950/40 px-4 py-3 text-base font-bold text-amber-200"
            >
              {showGuestCoach ? 'Скрыть разбор ▲' : 'Разбор последней партии 🎓'}
            </button>
            {showGuestCoach && (
              <div className="mt-3 rounded-2xl border border-[#14425e] bg-[#04121f]/60 p-3">
                <CoachPanel input={guestInput} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const openGameDetail = async (gameId: string) => {
    if (selectedId === gameId) {
      setSelectedId(null);
      setDetailInput(null);
      setDetailError('');
      return;
    }
    const client = getSupabase();
    if (!client) {
      setDetailError('Supabase не настроен.');
      return;
    }
    setSelectedId(gameId);
    setDetailInput(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const { data, error } = await client
        .from('games')
        .select('shots,player_fleet,computer_fleet')
        .eq('id', gameId)
        .single();
      if (error) {
        setDetailError(supabaseErrorToRussian(error));
        return;
      }
      const parsed = coachInputFromStored({
        shots: (data as Record<string, unknown>).shots,
        player_fleet: (data as Record<string, unknown>).player_fleet,
        computer_fleet: (data as Record<string, unknown>).computer_fleet,
      });
      if (!parsed) {
        setDetailError('Для этой партии нет сохранённых данных — разбор невозможен.');
        return;
      }
      setDetailInput(parsed);
    } catch (err) {
      setDetailError(supabaseErrorToRussian(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const stats = aggregateProfileStats(games);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-4">
      <button type="button" onClick={onBack} className="text-sm text-slate-400 hover:text-slate-200">
        ← Назад
      </button>
      <h2 className="mt-2 text-center text-xl font-bold text-cyan-200">Профиль</h2>
      <p className="mt-1 truncate text-center text-xs text-slate-500">{user.email}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3">
          <div className="text-2xl font-black text-slate-100">{stats.wins}</div>
          <div className="text-[11px] tracking-wider text-slate-400 uppercase">Побед</div>
        </div>
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3">
          <div className="text-2xl font-black text-slate-100">{stats.losses}</div>
          <div className="text-[11px] tracking-wider text-slate-400 uppercase">Поражений</div>
        </div>
        <div className="rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3">
          <div className="text-2xl font-black text-slate-100">{formatPercent(stats.winRate)}</div>
          <div className="text-[11px] tracking-wider text-slate-400 uppercase">Побед</div>
        </div>
      </div>

      <div className="mt-2 rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-3 text-sm text-slate-200">
        <div>
          Партий: <b>{stats.total}</b>
        </div>
        <div>
          Средняя точность: <b>{formatPercent(stats.avgAccuracy)}</b>
        </div>
        <div className="mt-2 text-xs tracking-wider text-slate-400 uppercase">По сложностям</div>
        <ul className="mt-1 space-y-1 text-sm">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <li key={d} className="flex justify-between gap-2">
              <span>{DIFFICULTY_LABEL[d]}</span>
              <span className="text-slate-400">
                {stats.byDifficulty[d].wins}/{stats.byDifficulty[d].played} ·{' '}
                {formatPercent(stats.byDifficulty[d].avgAccuracy)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Последние партии — нажмите для разбора
        </div>
        {loading && <p className="mt-1 text-sm text-slate-500">Загрузка…</p>}
        {errorRu && (
          <p role="alert" className="mt-1 text-sm text-rose-300">
            {errorRu}
          </p>
        )}
        {!loading && !errorRu && games.length === 0 && (
          <p className="mt-1 text-sm text-slate-500">Пока нет сохранённых партий.</p>
        )}
        <ul className="mt-1 space-y-1">
          {games.map((g) => {
            const acc = g.player_shots > 0 ? g.player_hits / g.player_shots : 0;
            const open = selectedId === g.id;
            return (
              <li key={g.id ?? `${g.created_at}-${g.difficulty}`}>
                <button
                  type="button"
                  onClick={() => g.id && openGameDetail(g.id)}
                  aria-expanded={open}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    open ? 'bg-[#14425e]' : 'bg-[#0a2436] hover:bg-[#10314a]'
                  }`}
                >
                  <span className="text-slate-400">{formatDate(g.created_at)}</span>
                  <span className="text-slate-200">{DIFFICULTY_LABEL[g.difficulty] ?? g.difficulty}</span>
                  <span className={g.winner === 'player' ? 'font-bold text-emerald-300' : 'text-rose-300'}>
                    {g.winner === 'player' ? 'Победа' : g.winner === 'computer' ? 'Поражение' : '—'}
                  </span>
                  <span className="text-slate-400">{formatPercent(acc)}</span>
                </button>
                {open && (
                  <div className="mt-1 rounded-2xl border border-[#14425e] bg-[#04121f]/60 p-3">
                    {detailLoading && <p className="text-sm text-slate-500">Загрузка разбора…</p>}
                    {detailError && (
                      <p role="alert" className="text-sm text-rose-300">
                        {detailError}
                      </p>
                    )}
                    {!detailLoading && !detailError && detailInput && (
                      <CoachPanel input={detailInput} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl border border-[#14425e] bg-[#06263b]/60 p-4">
        <AuthPanel user={user} />
      </div>
    </div>
  );
}
