// LICENA — ticket → GitHub issue (Supabase Edge Function).
//
// Turns an actionable support ticket (a course/language request or a content
// complaint) into a GitHub issue so the automation workflow can pick it up.
// Called by a Postgres trigger on INSERT (see supabase/ticket_issue_trigger.sql),
// the same way ticket-email is. The chat reply is never blocked by this — it runs
// async off the database trigger.
//
// Deploy:  name it exactly  ticket-issue
// Secrets needed (Edge Functions → Secrets):
//   GH_ISSUE_TOKEN        = GitHub fine-grained PAT, repo lalianamen/llicena,
//                           permission "Issues: Read and write"
//   TICKET_WEBHOOK_SECRET = same shared secret the trigger sends (already set)

const REPO = "lalianamen/llicena";
const TOKEN = Deno.env.get("GH_ISSUE_TOKEN");
const SECRET = Deno.env.get("TICKET_WEBHOOK_SECRET");
// Owner notification (so you never have to monitor). Reuses the Resend key the
// email function already uses; OWNER_EMAIL defaults to the owner's address.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "armenlalian@gmail.com";
const FROM = "LICENA <noreply@licena.us>";
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Greenlight policy: issues are created WITHOUT the "from-chat" label, so the
// workflow does not auto-run — you add that label to approve a ticket for work.
// To go fully hands-off (every ticket worked automatically), add "from-chat" here
// — but only once the public chat endpoint is rate-limited, or it's an abuse/cost
// vector (anyone could spam paid Claude runs).
const LABELS_BASE = ["support"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  if (!SECRET || req.headers.get("x-ticket-secret") !== SECRET) return new Response("unauthorized", { status: 401 });
  if (!TOKEN) return new Response("server_misconfigured", { status: 500 });

  let p: any;
  try { p = await req.json(); } catch { return new Response("bad_request", { status: 400 }); }

  const rec = p?.record;
  // Only newly-created, actionable tickets become issues.
  if (p.type !== "INSERT" || !rec) return new Response("skip", { status: 200 });
  const kind = rec.kind === "complaint" ? "complaint" : rec.kind === "request" ? "request" : null;
  if (!kind) return new Response("skip", { status: 200 });

  const msg = String(rec.message || "").slice(0, 4000);
  const short = msg.slice(0, 70) + (msg.length > 70 ? "…" : "");
  const title = `[chat] ${kind}: ${short || "(no message)"}`;
  const body = [
    `A user submitted a **${kind}** through the LICENA in-app chat.`,
    "",
    `**Request**`,
    "> " + (msg || "(empty)").replace(/\n/g, "\n> "),
    "",
    `- Ticket id: \`${rec.id ?? ""}\``,
    `- Email: ${rec.email ?? "—"}`,
    `- Locale: ${rec.locale ?? "—"}`,
    rec.course_id ? `- Course: \`${rec.course_id}\`` : null,
    rec.target_lang ? `- Requested language: \`${rec.target_lang}\`` : null,
    "",
    "_Add the **`from-chat`** label to greenlight Claude to work this into a PR._",
  ].filter((l) => l !== null).join("\n");

  const r = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "licena-ticket-issue",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, labels: [...LABELS_BASE, kind] }),
  });
  if (!r.ok) {
    console.error("github issue create failed:", r.status, await r.text());
    return new Response("issue_failed", { status: 502 });
  }
  const data = await r.json();

  // Tell the owner there's a new ticket to greenlight (best-effort; the issue
  // created above is the source of truth, so a failed email never fails the run).
  if (RESEND_API_KEY) {
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;color:#15273D;padding:8px">
       <p style="font-size:15px;margin:0 0 10px">New <b>${kind}</b> from the LICENA chat:</p>
       <div style="background:#E8EBEC;border-radius:10px;padding:12px 14px;font-size:14px">${esc(msg) || "(empty)"}</div>
       <p style="font-size:14px;margin:16px 0"><a href="${data.html_url}" style="color:#1E3A5C"><b>Open the issue →</b></a> &nbsp;then add the <b>from-chat</b> label to greenlight Claude, or close it to dismiss.</p>
       <p style="font-size:12px;color:#8ea2b6;margin:0">From ${esc(rec.email || "—")} · locale ${esc(rec.locale || "—")}</p>
     </div>`;
    try {
      const er = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: OWNER_EMAIL, subject: `New LICENA ${kind} — review`, html }),
      });
      if (!er.ok) console.error("owner notify failed:", er.status, await er.text());
    } catch (e) { console.error("owner notify error:", e); }
  }

  return new Response(JSON.stringify({ ok: true, issue: data.number }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
