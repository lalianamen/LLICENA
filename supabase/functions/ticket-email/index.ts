// LICENA — ticket email notifications (Supabase Edge Function).
//
// Sends transactional emails via Resend when a support ticket is created
// ("received / in progress") or when its status changes to done / rejected.
// Called by a Postgres trigger (see supabase/ticket_email_trigger.sql) on every
// INSERT / relevant UPDATE of support_tickets.
//
// Deploy:  name it exactly  ticket-email
// Secrets needed (Edge Functions → Secrets):
//   RESEND_API_KEY        = re_...        (already set)
//   TICKET_WEBHOOK_SECRET = <random>      (must match the trigger SQL)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SECRET = Deno.env.get("TICKET_WEBHOOK_SECRET");
const FROM = "LICENA <noreply@licena.us>";

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// subject (s) + body (b) per locale → stage → kind
const COPY: any = {
  en: {
    footer: "You're receiving this because you contacted LICENA support. Please don't reply to this address.",
    yourMessage: "Your message",
    received: {
      request:   { s: "We've received your request", b: "Thanks! Your request is now in our queue. We'll email you as soon as it's handled." },
      complaint: { s: "We've received your report",   b: "Thanks for flagging this. We've logged it and we're looking into it — we'll let you know once it's resolved." },
    },
    done: {
      request:   { s: "Your request is done",  b: "Good news — your request has been completed." },
      complaint: { s: "Resolved",              b: "Good news — the issue you reported has been fixed. Thanks for helping us improve." },
    },
    rejected: {
      request:   { s: "Update on your request", b: "Thanks for your request. We're not able to add this right now, but we've noted your interest." },
      complaint: { s: "Update on your report",  b: "Thanks for your report. After a look, no change was needed here — but we appreciate you flagging it." },
    },
  },
  es: {
    footer: "Recibes esto porque contactaste al soporte de LICENA. Por favor no respondas a esta dirección.",
    yourMessage: "Tu mensaje",
    received: {
      request:   { s: "Recibimos tu solicitud", b: "¡Gracias! Tu solicitud está en cola. Te escribiremos en cuanto la procesemos." },
      complaint: { s: "Recibimos tu reporte",   b: "Gracias por avisarnos. Lo registramos y lo estamos revisando — te avisaremos cuando se resuelva." },
    },
    done: {
      request:   { s: "Tu solicitud está lista", b: "Buenas noticias: tu solicitud se ha completado." },
      complaint: { s: "Resuelto",                b: "Buenas noticias: corregimos el problema que reportaste. Gracias por ayudarnos a mejorar." },
    },
    rejected: {
      request:   { s: "Actualización de tu solicitud", b: "Gracias por tu solicitud. Por ahora no podemos agregarlo, pero tomamos nota de tu interés." },
      complaint: { s: "Actualización de tu reporte",   b: "Gracias por tu reporte. Tras revisarlo, no fue necesario un cambio aquí — pero agradecemos el aviso." },
    },
  },
  ru: {
    footer: "Вы получили это письмо, потому что обратились в поддержку LICENA. Пожалуйста, не отвечайте на этот адрес.",
    yourMessage: "Ваше сообщение",
    received: {
      request:   { s: "Мы получили вашу заявку", b: "Спасибо! Ваша заявка принята в работу. Напишем, как только будет готово." },
      complaint: { s: "Мы получили ваше сообщение", b: "Спасибо, что сообщили. Мы зафиксировали обращение и разбираемся — напишем о результате." },
    },
    done: {
      request:   { s: "Ваша заявка выполнена", b: "Хорошие новости — ваша заявка выполнена." },
      complaint: { s: "Исправлено",            b: "Хорошие новости — проблему, о которой вы сообщили, исправили. Спасибо, что помогли стать лучше." },
    },
    rejected: {
      request:   { s: "Обновление по вашей заявке", b: "Спасибо за заявку. Пока мы не можем это добавить, но отметили ваш интерес." },
      complaint: { s: "Обновление по вашему обращению", b: "Спасибо за обращение. После проверки правка здесь не потребовалась — но мы благодарны, что сообщили." },
    },
  },
};

function template(locale: string, kind: string, stage: string, message: string) {
  const c = COPY[locale] || COPY.en;
  const t = c[stage][kind];
  const msg = (message || "").slice(0, 600);
  const quote = msg
    ? `<div style="background:#E8EBEC;border-radius:10px;padding:12px 14px;margin:18px 0;font-size:14px;color:#15273D">
         <div style="font-size:12px;color:#5E6E7E;margin-bottom:4px">${c.yourMessage}</div>${esc(msg)}</div>`
    : "";
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#15273D;padding:8px">
       <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;letter-spacing:.5px;margin-bottom:18px">LICENA</div>
       <p style="font-size:15px;line-height:1.5;margin:0">${t.b}</p>
       ${quote}
       <p style="font-size:12px;color:#8ea2b6;line-height:1.5;margin-top:24px">${c.footer}</p>
     </div>`;
  return { subject: t.s, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  if (!SECRET || req.headers.get("x-ticket-secret") !== SECRET) return new Response("unauthorized", { status: 401 });
  if (!RESEND_API_KEY) return new Response("server_misconfigured", { status: 500 });

  let p: any;
  try { p = await req.json(); } catch { return new Response("bad_request", { status: 400 }); }

  const rec = p?.record;
  if (!rec || !rec.email) return new Response("no_recipient", { status: 200 });

  const locale = ["en", "es", "ru"].includes(rec.locale) ? rec.locale : "en";
  const kind = rec.kind === "complaint" ? "complaint" : "request";

  // Decide which email (if any) this DB event warrants.
  let stage: string | null = null;
  if (p.type === "INSERT") {
    stage = "received";
  } else if (p.type === "UPDATE" && rec.status !== p?.old_record?.status) {
    if (rec.status === "done") stage = "done";
    else if (rec.status === "rejected") stage = "rejected";
  }
  if (!stage) return new Response("no_email_needed", { status: 200 });

  const { subject, html } = template(locale, kind, stage, rec.message);

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: rec.email, subject, html }),
  });
  if (!r.ok) {
    console.error("resend send failed:", r.status, await r.text());
    return new Response("send_failed", { status: 502 });
  }
  return new Response("ok", { status: 200 });
});
