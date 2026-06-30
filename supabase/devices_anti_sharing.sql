-- LICENA — anti-sharing device gate.
--
-- Run ONCE in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- Model: max 5 devices per ACCOUNT; once full, a new device can replace one only
-- if the account's last device change was > 30 days ago (auto-evicts the most
-- dormant device). All enforced server-side here, so the browser can't bypass it.
-- The client just calls register_device() and never writes the table directly.

-- 1. Track per-device activity (to evict the most dormant one on a swap).
alter table public.devices add column if not exists last_seen_at timestamptz default now();

-- 2. Lock the table down: clients may READ their own devices but never write them.
--    All inserts/deletes go through register_device() (security definer) so the
--    limit + 30-day throttle can't be tampered with from the browser.
drop policy if exists "devices: own insert" on public.devices;
drop policy if exists "devices: own delete" on public.devices;
-- (the existing "devices: own select" policy stays)

-- 3. The gate. p_confirm = false is a dry run that returns the state the UI should
--    show; p_confirm = true actually registers/swaps. Returns:
--      'ok'      — device is registered (this session is allowed)
--      'add'     — there's room; ask the user to confirm adding
--      'swap'    — at the limit but eligible; adding will evict the most dormant
--      'blocked' — at the limit and within the 30-day window; refuse
create or replace function public.register_device(p_token text, p_confirm boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  cnt    int;
  newest timestamptz;
  lim    int      := 5;              -- device limit per account
  win    interval := interval '30 days';
  victim uuid;
begin
  if uid is null then return 'unauthenticated'; end if;
  if p_token is null or length(p_token) < 8 then return 'error'; end if;

  -- Already registered → just refresh activity.
  if exists (select 1 from devices where user_id = uid and device_token = p_token) then
    update devices set last_seen_at = now() where user_id = uid and device_token = p_token;
    return 'ok';
  end if;

  select count(*), max(added_at) into cnt, newest from devices where user_id = uid;

  -- Room available.
  if cnt < lim then
    if not p_confirm then return 'add'; end if;
    insert into devices(user_id, device_token, last_seen_at) values (uid, p_token, now());
    return 'ok';
  end if;

  -- At capacity: allow a swap only if the last change is older than the window.
  if newest is null or newest < now() - win then
    if not p_confirm then return 'swap'; end if;
    select id into victim from devices
      where user_id = uid
      order by last_seen_at asc nulls first, added_at asc
      limit 1;
    delete from devices where id = victim;
    insert into devices(user_id, device_token, last_seen_at) values (uid, p_token, now());
    return 'ok';
  end if;

  return 'blocked';
end;
$$;

revoke all on function public.register_device(text, boolean) from public;
grant execute on function public.register_device(text, boolean) to authenticated;
