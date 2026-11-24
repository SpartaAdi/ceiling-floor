-- Ceiling • Floor — Supabase schema. Run once in Dashboard → SQL Editor.
-- Every table has row-level security: a signed-in user can only touch their own rows.

-- 1) One row per user holding the whole app document (merged on each device).
create table if not exists public.app_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;

drop policy if exists "app_state: read own"   on public.app_state;
drop policy if exists "app_state: insert own" on public.app_state;
drop policy if exists "app_state: update own" on public.app_state;
drop policy if exists "app_state: delete own" on public.app_state;
create policy "app_state: read own"   on public.app_state for select using (auth.uid() = user_id);
create policy "app_state: insert own" on public.app_state for insert with check (auth.uid() = user_id);
create policy "app_state: update own" on public.app_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app_state: delete own" on public.app_state for delete using (auth.uid() = user_id);

-- Live updates between devices
do $$ begin
  alter publication supabase_realtime add table public.app_state;
exception when duplicate_object then null; end $$;

-- 2) One row per device that turned reminders on.
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  tz           text not null default 'Asia/Kolkata',
  morning      text not null default '09:30',
  evening      text not null default '21:00',
  enabled      boolean not null default true,
  last_morning date,
  last_evening date,
  user_agent   text,
  created_at   timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

drop policy if exists "push: read own"   on public.push_subscriptions;
drop policy if exists "push: insert own" on public.push_subscriptions;
drop policy if exists "push: update own" on public.push_subscriptions;
drop policy if exists "push: delete own" on public.push_subscriptions;
create policy "push: read own"   on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push: insert own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push: update own" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push: delete own" on public.push_subscriptions for delete using (auth.uid() = user_id);
