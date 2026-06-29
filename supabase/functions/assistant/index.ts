// LICENA — support assistant (Supabase Edge Function).
//
// A server-side proxy to the Claude API. It holds the API key (never the
// browser) and powers the chat widget: it answers user questions grounded in
// official sources via web search, and logs course/language requests and
// complaints into the support_tickets table via a tool.
//
// Deploy:  supabase functions deploy assistant
// Secret:  supabase secrets set CLAUDE_API_KEY=sk-ant-...
//          (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// The browser calls it through supa.functions.invoke('assistant', { body }), so
// the anon key handles auth and CORS for same-project requests.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-opus-4-8";
const MAX_TURNS = 6;          // safety cap on the tool-use loop
const MAX_MESSAGES = 40;      // cap on conversation length we accept
const MAX_CHARS = 8000;       // cap on a single user message

const SYSTEM = `You are the support assistant for LICENA, a free practice-question tool for
California (and soon other US states') licensing exams, available in English, Spanish, and Russian.

What LICENA is: a study aid with real-exam-style practice questions and a bilingual side-by-side
study mode. It is NOT a school and does NOT guarantee passing any exam. Exams covered include CSLB
trades (Law & Business, C-10, C-20, C-36, C-7, C-16, asbestos, OSHA), CDL endorsements, DMV car &
motorcycle, EPA 608, backflow, NICET, and beauty/cosmetology licenses.

How to answer:
- Be concise, friendly, and direct. Reply in the SAME language the user writes their latest message in —
  whatever it is (English, Spanish, Russian, Armenian, Ukrainian, etc.), even if it differs from their
  interface language. Only fall back to the interface locale when the message itself is language-ambiguous
  (e.g. just a greeting, a number, or an email address).
- For factual specifics that change over time or by location — where/how to schedule or take an exam,
  the nearest office by ZIP code, current fees, deadlines — DO NOT invent addresses, dates, or fees.
  Use the web_search tool and prefer official / government sources (.gov, the state agency or board,
  the official test vendor such as PSI). Point the user to the official scheduler or office locator and
  link it, rather than stating a specific address you are not certain of.
- If you cannot confirm something from an official source, say so plainly instead of guessing.
- Do not give legal advice or guarantees about passing.

Requests and complaints — use the create_ticket tool:
- If the user asks to ADD a language to a course, ADD a new course/exam, or otherwise requests something
  we don't yet offer, collect a one-line summary and (if not already provided) their email, then call
  create_ticket with kind "request".
- If the user reports a mistake, inaccuracy, or discrepancy in a question, guide, or resource, collect a
  one-line summary plus their email, then call create_ticket with kind "complaint".
- Always ask for an email first if you don't have one — it's required to follow up. After the ticket is
  created, confirm it was logged and that we'll email them with updates.

Respond with your final answer only — do not narrate your reasoning.`;

const TOOLS = [
  { type: "web_search_20260209", name: "web_search" },
  {
    name: "create_ticket",
    description:
      "Log a user's course/language request or a complaint about a discrepancy so the team can follow up by email. Only call this once you have a clear summary and the user's email.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["request", "complaint"], description: "request = wants something added; complaint = reporting a mistake" },
        summary: { type: "string", description: "One or two sentences describing the request or issue" },
        email: { type: "string", description: "The user's email for follow-up" },
        course_id: { type: "string", description: "Course id if the ticket is about a specific course (optional)" },
        target_lang: { type: "string", description: "Requested language code for an 'add language' request, e.g. hy, ko (optional)" },
      },
      required: ["kind", "summary", "email"],
    },
  },
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const textOf = (content: any[]) =>
  content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("CLAUDE_API_KEY");
  if (!apiKey) return json({ error: "server_misconfigured" }, 500);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  const locale = ["en", "es", "ru"].includes(payload?.locale) ? payload.locale : "en";
  const incoming = Array.isArray(payload?.messages) ? payload.messages : null;
  if (!incoming || !incoming.length) return json({ error: "bad_request" }, 400);

  // Sanitize the conversation we forward to the model.
  const messages = incoming
    .slice(-MAX_MESSAGES)
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_CHARS) }));
  if (!messages.length || messages[0].role !== "user") return json({ error: "bad_request" }, 400);

  const anthropic = new Anthropic({ apiKey });
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const system = `${SYSTEM}\n\nThe user's interface language is "${locale}"; use it only as a fallback when the language of their message is unclear. Otherwise always mirror the language of their latest message.`;
  let ticketId: string | null = null;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: TOOLS as any,
        messages,
      });

      if (resp.stop_reason === "refusal") {
        return json({ reply: "Sorry, I can't help with that. Please try rephrasing your question." });
      }

      // Server-side tool (web search) hit its iteration limit — resend to continue.
      if (resp.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: resp.content as any });
        continue;
      }

      if (resp.stop_reason !== "tool_use") {
        return json({ reply: textOf(resp.content) || "…", ticketId });
      }

      // Handle our custom tool calls (web_search resolves server-side, not here).
      messages.push({ role: "assistant", content: resp.content as any });
      const results: any[] = [];
      for (const block of resp.content as any[]) {
        if (block.type !== "tool_use") continue;
        if (block.name === "create_ticket") {
          const t = block.input || {};
          const { data, error } = await supa
            .from("support_tickets")
            .insert([{
              kind: t.kind === "complaint" ? "complaint" : "request",
              email: String(t.email || "").toLowerCase(),
              message: String(t.summary || ""),
              locale,
              course_id: t.course_id || null,
              target_lang: t.target_lang || null,
            }])
            .select("id")
            .single();
          if (error) {
            results.push({ type: "tool_result", tool_use_id: block.id, content: "Failed to save the ticket. Ask the user to try again.", is_error: true });
          } else {
            ticketId = data.id;
            results.push({ type: "tool_result", tool_use_id: block.id, content: `Ticket ${data.id} logged (${t.kind}).` });
          }
        }
      }
      messages.push({ role: "user", content: results });
    }
    return json({ reply: "Sorry, I couldn't complete that. Please try again.", ticketId });
  } catch (e) {
    console.error("assistant error:", e);
    return json({ error: "assistant_failed" }, 502);
  }
});
