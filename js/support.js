/* LICENA — support assistant (AI chat).
   A conversational widget: answers questions (grounded via the server function's
   web search) and logs course/language requests and complaints. All Claude calls
   go through the Supabase Edge Function `assistant` — the API key never touches
   the browser. `supa` comes from supabase-client.js.

   Strings and the current UI language are self-contained here so the widget drops
   into ANY page (landing / cabinet / course) regardless of that page's i18n: the
   landing exposes `lang` + `T`, the cabinet exposes `lang` + `TAPP`, the course
   exposes `uiLang` + `TAPP`. We read none of those objects to avoid coupling. */
(function(){
  const fab   = document.getElementById("supFab");
  const panel = document.getElementById("supPanel");
  if (!fab || !panel) return;

  const log    = document.getElementById("supLog");
  const form   = document.getElementById("supForm");
  const input  = document.getElementById("supMsg");
  const sendBtn= document.getElementById("supSend");
  const titleEl= document.getElementById("supTitle");

  // Self-contained copy (mirrors the sup* keys in i18n.js) so no page i18n is needed.
  const STR = {
    en:{ title:"LICENA Assistant", hello:"Hi", intro:"I'm the LICENA assistant. Ask about exams, scheduling, or where to take a test — and I can log a request for a new course or language, or a problem you found.", ph:"Ask a question…", error:"Something went wrong. Please try again.", hint:"Need help? Ask me about exams or courses — or report a problem." },
    es:{ title:"Asistente LICENA", hello:"¡Hola", intro:"Soy el asistente de LICENA. Pregunta sobre exámenes, citas o dónde dar una prueba — y puedo registrar una solicitud de un nuevo curso o idioma, o un problema que hayas encontrado.", ph:"Escribe tu pregunta…", error:"Algo salió mal. Inténtalo de nuevo.", hint:"¿Necesitas ayuda? Pregúntame sobre exámenes o cursos — o reporta un problema." },
    ru:{ title:"Ассистент LICENA", hello:"Привет", intro:"Я ассистент LICENA. Спроси про экзамены, запись или где сдавать тест — и я могу зафиксировать заявку на новый курс или язык, либо найденную ошибку.", ph:"Задай вопрос…", error:"Что-то пошло не так. Попробуйте ещё раз.", hint:"Нужна помощь? Спроси про экзамены и курсы — или сообщи о проблеме." },
  };
  // UI language across pages: course exposes `uiLang`, landing/cabinet expose `lang`,
  // all persist lp:ui_lang. typeof-guarded so an undefined global never throws.
  function curLang(){
    const l = (typeof uiLang !== "undefined" && uiLang) ||
              (typeof lang   !== "undefined" && lang)   ||
              localStorage.getItem("lp:ui_lang") || "en";
    return (l === "es" || l === "ru") ? l : "en";
  }
  const d = () => STR[curLang()];
  // Greeting, personalized with the signed-in user's first name when we have it.
  function greetingText(){
    const s = d(), n = (authName || "").trim().split(/\s+/)[0];
    return n ? `${s.hello}, ${n}! ${s.intro}` : `${s.hello}! ${s.intro}`;
  }

  const history = [];   // [{role:'user'|'assistant', content}] sent to the model
  let greeted = false, busy = false;
  let supHint = null, supHintHideT = null;   // discovery-hint bubble by the FAB
  // A signed-in user's email/id/name so the assistant never asks logged-in users for
  // their email and can address them by name.
  let authEmail = null, authId = null, authName = null;
  async function refreshAuth(){
    try {
      const { data: { session } } = await supa.auth.getSession();
      const u = session && session.user ? session.user : null;
      authEmail = u ? (u.email || null) : null;
      authId    = u ? (u.id || null) : null;
      authName  = u && u.user_metadata ? (u.user_metadata.name || null) : null;
    } catch (_) { authEmail = null; authId = null; authName = null; }
  }
  refreshAuth();

  const esc = (s) => { const e = document.createElement("div"); e.textContent = s; return e.innerHTML.replace(/"/g, "&quot;"); };
  // Escape (incl. " so a URL can't break out of the href), then linkify bare URLs.
  const fmt = (s) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  function bubble(role, text){
    const el = document.createElement("div");
    el.className = "sup-msg " + (role === "user" ? "user" : "bot");
    el.innerHTML = fmt(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  function typing(on){
    let t = document.getElementById("supTyping");
    if (on && !t){
      t = document.createElement("div");
      t.id = "supTyping"; t.className = "sup-typing";
      t.innerHTML = "<span></span><span></span><span></span>";
      log.appendChild(t); log.scrollTop = log.scrollHeight;
    } else if (!on && t){ t.remove(); }
  }

  function localize(){
    if (titleEl) titleEl.textContent = d().title;
    input.placeholder = d().ph;
  }

  async function open(){
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    try { localStorage.setItem("lp:sup_seen", "1"); } catch(_){}   // opened once → stop the discovery hint
    hideSupHint();
    localize();
    await refreshAuth();
    if (!greeted){ bubble("assistant", greetingText()); greeted = true; }
    input.focus();
  }
  function close(){ panel.hidden = true; fab.setAttribute("aria-expanded", "false"); }
  fab.addEventListener("click", () => panel.hidden ? open() : close());
  document.getElementById("supClose").addEventListener("click", close);

  // Auto-grow the input; Enter sends, Shift+Enter makes a newline.
  function grow(){ input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 96) + "px"; }
  input.addEventListener("input", grow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); }
  });

  async function send(text){
    busy = true; sendBtn.disabled = true;
    bubble("user", text);
    history.push({ role: "user", content: text });
    typing(true);
    try {
      await refreshAuth();
      const { data, error } = await supa.functions.invoke("assistant", {
        body: { messages: history, locale: curLang(), userEmail: authEmail, userId: authId, userName: authName },
      });
      typing(false);
      if (error || !data || !data.reply) throw (error || new Error("no reply"));
      bubble("assistant", data.reply);
      history.push({ role: "assistant", content: data.reply });
    } catch (_) {
      typing(false);
      bubble("assistant", d().error);
    } finally {
      busy = false; sendBtn.disabled = false; input.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = ""; grow();
    send(text);
  });

  // Re-localize when the UI language changes. Landing uses `.langs`, the cabinet a
  // `#appLangs` switcher; both render buttons with [data-lang]. Defer so the page's
  // own handler updates the language first; re-greet only if no message was sent yet.
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".langs [data-lang], #appLangs [data-lang]")) return;
    setTimeout(() => {
      localize();
      if (greeted && history.length === 0){ log.innerHTML = ""; bubble("assistant", greetingText()); }
    }, 0);
  });

  // ── Discovery hint ────────────────────────────────────────────────────────
  // A small teaser bubble by the FAB, shown a while after each page load and
  // repeated on the next navigation — so people notice the assistant is live and
  // what it does. Stops once the user opens the chat (lp:sup_seen), or after a
  // small appearance cap (so a user who ignores it isn't nagged forever). Never
  // shows while the panel is open. Tunable via DELAY / DURATION / MAX below.
  function hideSupHint(){
    if (supHint) supHint.classList.remove("on");
    if (supHintHideT){ clearTimeout(supHintHideT); supHintHideT = null; }
  }
  (function setupHint(){
    const DELAY = 60000, DURATION = 60000, MAX = 6;
    let seen = false, count = 0;
    try { seen = !!localStorage.getItem("lp:sup_seen"); count = parseInt(localStorage.getItem("lp:sup_hint_n") || "0", 10) || 0; } catch(_){}
    if (seen || count >= MAX) return;

    const el = document.createElement("div");
    el.className = "sup-hint"; el.setAttribute("role", "button"); el.setAttribute("tabindex", "0");
    const t = document.createElement("span"); t.className = "sup-hint-txt";
    const x = document.createElement("button"); x.type = "button"; x.className = "sup-hint-x"; x.setAttribute("aria-label", "Close"); x.textContent = "✕";
    el.appendChild(t); el.appendChild(x);
    document.body.appendChild(el);
    supHint = el;

    x.addEventListener("click", (e) => { e.stopPropagation(); hideSupHint(); });
    el.addEventListener("click", () => { hideSupHint(); if (panel.hidden) open(); });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); el.click(); } });

    setTimeout(() => {
      if (!panel.hidden) return;                 // chat already open — skip this appearance
      t.textContent = d().hint;                  // localize at show time
      el.classList.add("on");
      try { localStorage.setItem("lp:sup_hint_n", String(count + 1)); } catch(_){}
      supHintHideT = setTimeout(hideSupHint, DURATION);
    }, DELAY);
  })();
})();
