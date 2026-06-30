// LICENA — set a ticket's status (Supabase Edge Function).
//
// Flips a support ticket's status — e.g. to "done" when its fix PR is merged
// (or "rejected"). That status change fires the existing support_tickets email
// trigger, which sends the user the branded resolved/closed email (EN/ES/RU) via
// Resend. So this function's ONLY job is the one privileged UPDATE: RLS blocks
// the public key from updating tickets (see support_tickets.sql), so we use the
// service-role key here, behind the shared x-ticket-secret.
//
// Called by the claude-ticket-resolved GitHub Action on PR merge.
//
// Deploy:  name it exactly  ticket-status
// Secrets (all already set for the other functions — nothing new to add):
//   TICKET_WEBHOOK_SECRET                    = shared secret (matches the workflow)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  = injected automatically

import { createClient } from "npm:@supabase/supabase-js@2";

const SECRET = Deno.env.get("TICKET_WEBHOOK_SECRET");
const ALLOWED = ["new", "in_progress", "done", "rejected"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  if (!SECRET || req.headers.get("x-ticket-secret") !== SECRET) return new Response("unauthorized", { status: 401 });

  let p: any;
  try { p = await req.json(); } catch { return new Response("bad_request", { status: 400 }); }

  const id = typeof p?.ticket_id === "string" ? p.ticket_id.trim() : "";
  const status = ALLOWED.includes(p?.status) ? p.status : "done";
  if (!id) return new Response("missing_ticket_id", { status: 400 });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Only update when the status actually changes (.neq), so a re-merge or a
  // duplicate call can't re-send the email — the row won't match, nothing fires.
  const { data, error } = await supa
    .from("support_tickets")
    .update({ status })
    .eq("id", id)
    .neq("status", status)
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("ticket-status update failed:", error);
    return new Response("update_failed", { status: 502 });
  }
  // data === null = no row changed (already in that status, or unknown id):
  // idempotent, and no email is sent because the status didn't change.
  return new Response(JSON.stringify({ ok: true, changed: !!data, status }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
