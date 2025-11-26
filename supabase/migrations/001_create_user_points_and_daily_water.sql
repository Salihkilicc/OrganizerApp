-- Supabase migration for user points and daily water tracking
create extension if not exists "pgcrypto";

create table if not exists public.user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_points integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.daily_water (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  bottles_drunk integer not null default 0,
  bottles_goal integer not null default 5,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
