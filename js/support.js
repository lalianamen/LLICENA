/* LICENA — support assistant (AI chat).
   A conversational widget: answers questions (grounded via the server function's
   web search) and logs course/language requests and complaints. All Claude calls
   go through the Supabase Edge Function `assistant` — the API key never touches
   the browser. `T`, `lang`, and `supa` come from i18n.js / app.js / supabase-client.js. */
(function(){
  const fab   = document.getElementById("supFab");
  const panel = document.getElementById("supPanel");
  if (!fab || !panel) return;

  const log    = document.getElementById("supLog");
  const form   = document.getElementById("supForm");
  const input  = document.getElementById("supMsg");
  const sendBtn= document.getElementById("supSend");

  const d = () => (typeof T !== "undefined" && T[lang]) ? T[lang] : (typeof T !== "undefined" ? T.en : {});
  const history = [];   // [{role:'user'|'assistant', content}] sent to the model
  let greeted = false, busy = false;

  const esc = (s) => { const e = document.createElement("div"); e.textContent = s; return e.innerHTML; };
  // Escape, then linkify bare URLs (safe: escaping runs first).
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

  function open(){
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    input.placeholder = d().supPh || "";
    if (!greeted){ bubble("assistant", d().supGreeting || ""); greeted = true; }
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
      const { data, error } = await supa.functions.invoke("assistant", {
        body: { messages: history, locale: lang },
      });
      typing(false);
      if (error || !data || !data.reply) throw (error || new Error("no reply"));
      bubble("assistant", data.reply);
      history.push({ role: "assistant", content: data.reply });
    } catch (_) {
      typing(false);
      bubble("assistant", d().supError || "Something went wrong. Please try again.");
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

  // Re-localize on language change; re-greet only if no conversation started yet
  document.querySelectorAll(".langs button").forEach(b =>
    b.addEventListener("click", () => {
      input.placeholder = d().supPh || "";
      if (greeted && history.length === 0){ log.innerHTML = ""; bubble("assistant", d().supGreeting || ""); }
    }));
})();
