-- Supabase migration to persist user settings, plans, and premium status
create table if not exists public.user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'en',
  water_reminder_enabled boolean not null default false,
  vibration_enabled boolean not null default true,
  notification_types jsonb not null default '{"planReminders": true, "focusMode": true, "dailySummary": false, "streakWarning": true}',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  blocks jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.user_premium (
  id uuid primary key references auth.users(id) on delete cascade,
  is_premium boolean not null default false,
  updated_at timestamptz not null default now()
);
