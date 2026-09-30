import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseErrorToRussian } from '../lib/errors';
import { getSupabase } from '../lib/supabase';

interface Props {
  user: User | null;
  onAuth?: () => void;
}

export default function AuthPanel({ user, onAuth }: Props) {
  const client = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [errorRu, setErrorRu] = useState('');

  if (!client) {
    return (
      <p className="text-xs text-slate-500">
        Supabase не настроен (.env). Можно играть гостем.
      </p>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-[140px] truncate text-xs text-slate-300" title={user.email ?? ''}>
          {user.email}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErrorRu('');
            const { error } = await client.auth.signOut();
            setBusy(false);
            if (error) setErrorRu(supabaseErrorToRussian(error));
            else onAuth?.();
          }}
          className="rounded-lg bg-[#0e2f47] px-2 py-1 text-xs font-semibold text-slate-200"
        >
          Выйти
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorRu('');
    try {
      if (mode === 'register') {
        const { error } = await client.auth.signUp({ email, password });
        if (error) setErrorRu(supabaseErrorToRussian(error));
        else onAuth?.();
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) setErrorRu(supabaseErrorToRussian(error));
        else onAuth?.();
      }
    } catch (err) {
      setErrorRu(supabaseErrorToRussian(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full space-y-2">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Режим входа">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => setMode('login')}
          className={`rounded-lg px-2 py-1 text-xs font-semibold ${mode === 'login' ? 'bg-cyan-500 text-[#02222e]' : 'bg-[#0e2f47] text-slate-300'}`}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => setMode('register')}
          className={`rounded-lg px-2 py-1 text-xs font-semibold ${mode === 'register' ? 'bg-cyan-500 text-[#02222e]' : 'bg-[#0e2f47] text-slate-300'}`}
        >
          Регистрация
        </button>
      </div>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-[#14425e] bg-[#082032] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        placeholder="Пароль (мин. 6 символов)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-[#14425e] bg-[#082032] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
      />
      {errorRu && (
        <p role="alert" className="text-xs text-rose-300">
          {errorRu}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-cyan-500 px-3 py-2 text-sm font-bold text-[#02222e] disabled:opacity-60"
      >
        {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
      </button>
    </form>
  );
}
