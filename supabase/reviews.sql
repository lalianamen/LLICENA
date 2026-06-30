-- LICENA — user reviews (real, consented, moderated).
--
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
--
-- Logged-in users submit a review (goes to 'pending'). You approve it in the
-- Supabase dashboard (set status = 'approved'); only approved reviews are
-- readable publicly and shown (randomly) on the landing page. Users cannot
-- self-approve — the insert policy forces status = 'pending'.

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users(id) on delete set null,
  name       text,                                   -- display name (e.g. "Arsen M.")
  exam       text,                                   -- trade/exam, e.g. "C-20 HVAC"
  city       text,
  rating     int check (rating between 1 and 5),
  body       text not null,
  consent    boolean not null default false,         -- agreed: public + marketing use
  status     text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists reviews_status_idx on public.reviews (status);

alter table public.reviews enable row level security;

-- A logged-in user may submit their OWN review, and only as 'pending'
-- (so nobody can self-publish — moderation stays with you).
drop policy if exists "reviews: own insert" on public.reviews;
create policy "reviews: own insert" on public.reviews
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- Anyone (incl. logged-out visitors on the landing) may read ONLY approved reviews.
drop policy if exists "reviews: read approved" on public.reviews;
create policy "reviews: read approved" on public.reviews
  for select to anon, authenticated
  using (status = 'approved');

-- No UPDATE/DELETE policy on purpose: moderation (approve/reject/edit) happens
-- server-side / in the dashboard with the service role.
