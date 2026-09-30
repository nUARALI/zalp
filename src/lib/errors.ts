/** Перевод типовых ошибок Supabase/Auth на русский. */

function pickMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const rec = err as Record<string, unknown>;
    const m = rec.message;
    if (typeof m === 'string') return m;
  }
  return '';
}

/** Человекочитаемый текст ошибки Supabase по-русски. */
export function supabaseErrorToRussian(err: unknown): string {
  const raw = pickMessage(err);
  const msg = raw.toLowerCase();

  if (!raw) return 'Что-то пошло не так. Попробуйте ещё раз.';
  if (msg.includes('invalid login credentials')) {
    return 'Неверный email или пароль.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Такой email уже зарегистрирован. Войдите.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Подтвердите email, затем войдите.';
  }
  if (msg.includes('password should be at least') || msg.includes('password is too short')) {
    return 'Пароль слишком короткий (минимум 6 символов).';
  }
  if (msg.includes('invalid email') || msg.includes('email address') && msg.includes('invalid')) {
    return 'Некорректный email.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Нет соединения с сервером. Проверьте интернет.';
  }
  if (msg.includes('jwt') || msg.includes('expired') || msg.includes('session')) {
    return 'Сессия истекла. Войдите снова.';
  }
  if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('not authorized')) {
    return 'Нет доступа. Войдите снова.';
  }
  return 'Не удалось выполнить. Попробуйте ещё раз.';
}
