-- LICENA — Supabase schema
-- Run this in Supabase → SQL Editor

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  name         text,
  target_exam  text default 'cslb-law',
  lang         text default 'en',
  created_at   timestamptz default now()
);

-- 2. Authorized devices per account (max 3)
create table if not exists public.devices (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  device_token text not null,
  added_at     timestamptz default now(),
  unique(user_id, device_token)
);

-- 3. Unlocked courses per account
create table if not exists public.user_courses (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  course_id    text not null,
  status       text not null default 'active',  -- 'active' | 'inactive' (subscription expired)
  activated_at timestamptz default now(),
  unique(user_id, course_id)
);

-- Row-Level Security (data is only accessible by its owner)
alter table public.profiles    enable row level security;
alter table public.devices     enable row level security;
alter table public.user_courses enable row level security;

-- Profiles policies
create policy "profiles: own select" on public.profiles for select using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- Devices policies
create policy "devices: own select" on public.devices for select using (auth.uid() = user_id);
create policy "devices: own insert" on public.devices for insert with check (auth.uid() = user_id);
create policy "devices: own delete" on public.devices for delete using (auth.uid() = user_id);

-- User courses policies
create policy "courses: own select" on public.user_courses for select using (auth.uid() = user_id);
create policy "courses: own insert" on public.user_courses for insert with check (auth.uid() = user_id);
create policy "courses: own update" on public.user_courses for update using (auth.uid() = user_id);
create policy "courses: own delete" on public.user_courses for delete using (auth.uid() = user_id);
