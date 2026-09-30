import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import AuthPanel from '../components/AuthPanel';
import { DIFFICULTY_LABEL } from '../game/ai';
import { supabaseErrorToRussian } from '../lib/errors';
import { aggregateProfileStats, type ProfileGame } from '../lib/profileStats';
import { formatPercent } from '../lib';
import { getSupabase } from '../lib/supabase';

interface Props {
  user: User | null;
  onBack: () => void;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProfileScreen({ user, onBack }: Props) {
  const [games, setGames] = useState<ProfileGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorRu, setErrorRu] = useState('');

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
      </div>
    );
  }

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
          Последние партии
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
            return (
              <li
                key={g.id ?? `${g.created_at}-${g.difficulty}`}
                className="flex items-center justify-between rounded-xl bg-[#0a2436] px-3 py-2 text-sm"
              >
                <span className="text-slate-400">{formatDate(g.created_at)}</span>
                <span className="text-slate-200">{DIFFICULTY_LABEL[g.difficulty] ?? g.difficulty}</span>
                <span className={g.winner === 'player' ? 'font-bold text-emerald-300' : 'text-rose-300'}>
                  {g.winner === 'player' ? 'Победа' : g.winner === 'computer' ? 'Поражение' : '—'}
                </span>
                <span className="text-slate-400">{formatPercent(acc)}</span>
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
