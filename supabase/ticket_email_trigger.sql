-- LICENA — fire the ticket-email Edge Function on ticket events.
--
-- Run ONCE in the Supabase SQL editor. BEFORE running, replace the placeholder
-- __TICKET_WEBHOOK_SECRET__ below with the same value you set as the
-- TICKET_WEBHOOK_SECRET secret in Edge Functions → Secrets.
--
-- It calls the ticket-email function on:
--   • every INSERT (a new ticket)        → "received / in progress" email
--   • UPDATE where status becomes done    → "completed" email
--   • UPDATE where status becomes rejected→ "closed" email
-- Other updates (e.g. status → in_progress) send nothing.
--
-- The Authorization header uses the PUBLIC publishable key only to satisfy the
-- Edge gateway's JWT check — real authorization is the private x-ticket-secret.

create extension if not exists pg_net;

create or replace function public.notify_ticket_email() returns trigger
  language plpgsql
  security definer
as $$
begin
  -- On UPDATE, only act when status actually changed to a notify-worthy value.
  if (tg_op = 'UPDATE') and not (
        new.status is distinct from old.status
        and new.status in ('done', 'rejected')
     ) then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://vewhmndummfhnbxnrqya.supabase.co/functions/v1/ticket-email',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer sb_publishable_Ljv0fNsQC0qHMzgWE42ccA_hHgGbVzy',
      'x-ticket-secret','__TICKET_WEBHOOK_SECRET__'
    ),
    body    := jsonb_build_object(
      'type',       tg_op,
      'record',     to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    )
  );
  return new;
end;
$$;

drop trigger if exists support_tickets_email on public.support_tickets;
create trigger support_tickets_email
  after insert or update on public.support_tickets
  for each row execute function public.notify_ticket_email();
