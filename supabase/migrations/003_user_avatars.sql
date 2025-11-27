-- Supabase migration for user avatar ownership and selection
create extension if not exists "pgcrypto";

create table if not exists public.user_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purchased_avatars text[] not null default '{}',
  selected_avatar text null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_avatars enable row level security;

create policy "User avatars are readable by owner"
  on public.user_avatars
  for select
  using (auth.uid() = user_id);

create policy "User avatars insert restricted to owner"
  on public.user_avatars
  for insert
  with check (auth.uid() = user_id);

create policy "User avatars update restricted to owner"
  on public.user_avatars
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
