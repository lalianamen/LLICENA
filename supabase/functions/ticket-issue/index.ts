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
  return new Response(JSON.stringify({ ok: true, issue: data.number }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
