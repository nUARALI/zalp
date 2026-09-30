import type { User } from '@supabase/supabase-js';

interface Props {
  user: User | null;
  authLoading: boolean;
  onHome: () => void;
  onProfile: () => void;
  screen: string;
}

export default function AppHeader({ user, authLoading, onHome, onProfile, screen }: Props) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-2">
      <button
        type="button"
        onClick={onHome}
        className="flex items-center gap-1 text-sm font-black tracking-wide text-cyan-300"
        aria-label="На главный экран"
      >
        <span aria-hidden>⚓</span> ЗАЛП
      </button>
      <div className="flex items-center gap-2">
        {authLoading ? (
          <span className="text-xs text-slate-500">…</span>
        ) : user ? (
          <span className="max-w-[140px] truncate text-xs text-slate-400" title={user.email ?? ''}>
            {user.email}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Гость</span>
        )}
        <button
          type="button"
          onClick={onProfile}
          className={`rounded-lg px-3 py-1 text-xs font-bold ${screen === 'profile' ? 'bg-cyan-500 text-[#02222e]' : 'bg-[#0e2f47] text-slate-200'}`}
        >
          {user ? 'Профиль' : 'Войти'}
        </button>
      </div>
    </header>
  );
}
