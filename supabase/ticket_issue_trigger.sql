-- LICENA — promote new actionable tickets to GitHub issues.
--
-- Run ONCE in the Supabase SQL editor. BEFORE running, replace the placeholder
-- __TICKET_WEBHOOK_SECRET__ below with the same value you set as the
-- TICKET_WEBHOOK_SECRET secret (the one ticket-email already uses).
--
-- Fires the ticket-issue Edge Function on INSERT of a request/complaint, which
-- opens a GitHub issue. (Email + issue are independent triggers, so one failing
-- never blocks the other.) The Authorization header uses the PUBLIC publishable
-- key only to satisfy the Edge gateway; real auth is the private x-ticket-secret.

create extension if not exists pg_net;

create or replace function public.notify_ticket_issue() returns trigger
  language plpgsql
  security definer
as $$
begin
  if tg_op <> 'INSERT' then return new; end if;
  if new.kind not in ('request', 'complaint') then return new; end if;

  perform net.http_post(
    url     := 'https://vewhmndummfhnbxnrqya.supabase.co/functions/v1/ticket-issue',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer sb_publishable_Ljv0fNsQC0qHMzgWE42ccA_hHgGbVzy',
      'x-ticket-secret','__TICKET_WEBHOOK_SECRET__'
    ),
    body    := jsonb_build_object('type', tg_op, 'record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists support_tickets_issue on public.support_tickets;
create trigger support_tickets_issue
  after insert on public.support_tickets
  for each row execute function public.notify_ticket_issue();
