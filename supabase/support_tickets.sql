-- LICENA — support / requests intake ("chat-bot" tickets).
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- It is safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.
--
-- Phase 1 stores every question, course/language request, and complaint as a row
-- here. Later phases read this table: status emails (Resend) and the autonomous
-- fulfilment pipeline both key off `status`.

create table if not exists public.support_tickets (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  kind        text        not null check (kind in ('question','request','complaint')),
  status      text        not null default 'new'
                          check (status in ('new','in_progress','done','rejected')),
  email       text        not null,
  locale      text,                                   -- UI language to reply in (en/es/ru)
  user_id     uuid        references auth.users(id) on delete set null,
  course_id   text,                                   -- optional: course the ticket is about
  target_lang text,                                   -- optional: requested language to add
  message     text        not null,
  admin_note  text                                    -- fulfilment note, surfaced in status emails
);

create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_email_idx  on public.support_tickets (email);
create index if not exists support_tickets_user_idx   on public.support_tickets (user_id);

-- Keep updated_at fresh on every status change.
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists support_tickets_touch on public.support_tickets;
create trigger support_tickets_touch
  before update on public.support_tickets
  for each row execute function public.touch_updated_at();

-- ── Row-level security ────────────────────────────────────────────────────────
alter table public.support_tickets enable row level security;

-- Anyone (even a logged-out visitor) may submit a ticket — like a public contact form.
drop policy if exists "support: anyone can insert" on public.support_tickets;
create policy "support: anyone can insert"
  on public.support_tickets for insert
  to anon, authenticated
  with check (true);

-- A logged-in user may read only the tickets tied to their account (for an in-app
-- status view later). Anonymous submitters get their status by email instead.
drop policy if exists "support: read own" on public.support_tickets;
create policy "support: read own"
  on public.support_tickets for select
  to authenticated
  using (user_id = auth.uid());

-- NOTE: no UPDATE/DELETE policy is granted on purpose. Status changes happen
-- server-side with the service-role key (it bypasses RLS), so users can never
-- edit or close their own tickets.
