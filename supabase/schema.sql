-- «Залп»: схема таблицы истории партий.
-- Выполнить в Supabase Dashboard → SQL Editor (один раз).
-- id генерируется на клиенте при старте партии (crypto.randomUUID),
-- повторное сохранение той же партии делает upsert и не создаёт дубли.

create table if not exists public.games (
  id uuid primary key,
  user_id uuid references auth.users default auth.uid(),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  winner text check (winner in ('player', 'computer')),
  player_shots int not null default 0,
  player_hits int not null default 0,
  computer_shots int not null default 0,
  computer_hits int not null default 0,
  duration_sec int not null default 0,
  shots jsonb not null default '[]'::jsonb,
  player_fleet jsonb not null default '[]'::jsonb,
  computer_fleet jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

drop policy if exists "games_select_own" on public.games;
create policy "games_select_own"
  on public.games for select
  using (auth.uid() = user_id);

drop policy if exists "games_insert_own" on public.games;
create policy "games_insert_own"
  on public.games for insert
  with check (auth.uid() = user_id);

create index if not exists games_user_created_idx
  on public.games (user_id, created_at desc);
