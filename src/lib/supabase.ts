import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;

function readEnv(): { url: string; anonKey: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
  return { url, anonKey };
}

/** Настроен ли Supabase (есть обе переменные окружения). */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = readEnv();
  return url.length > 0 && anonKey.length > 0;
}

/**
 * Ленивый синглтон клиента. Возвращает null, если нет env —
 * игра при этом работает гостем, без сети.
 */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const { url, anonKey } = readEnv();
  if (!url || !anonKey) {
    cached = null;
    return cached;
  }
  cached = createClient(url, anonKey);
  return cached;
}

/** Для тестов: сбросить кэш клиента. */
export function resetSupabaseCache(): void {
  cached = undefined;
}
