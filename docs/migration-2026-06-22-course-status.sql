-- LICENA migration — fix course delete + add status lifecycle
-- Run this ONCE in Supabase → SQL Editor.
-- Safe to re-run (idempotent).

-- 1. Add status column (active | inactive). Deleted courses are removed (hard delete).
alter table public.user_courses
  add column if not exists status text not null default 'active';

-- 2. Allow owners to UPDATE their course rows (needed for status + re-add via upsert).
drop policy if exists "courses: own update" on public.user_courses;
create policy "courses: own update" on public.user_courses
  for update using (auth.uid() = user_id);

-- 3. Allow owners to DELETE their course rows (this is why removed courses came back).
drop policy if exists "courses: own delete" on public.user_courses;
create policy "courses: own delete" on public.user_courses
  for delete using (auth.uid() = user_id);
