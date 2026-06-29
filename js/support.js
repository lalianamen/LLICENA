/* LICENA — support / requests assistant (Phase 1: intake).
   Captures questions, course/language requests, and complaints into Supabase
   (support_tickets). Grounded AI answers + email notifications are layered on in
   later phases; this file only needs the existing anon Supabase client. */
(function(){
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const fab   = document.getElementById("supFab");
  const panel = document.getElementById("supPanel");
  if (!fab || !panel) return;

  const form    = document.getElementById("supForm");
  const msgEl   = document.getElementById("supMsg");
  const emailEl = document.getElementById("supEmail");
  const errEl   = document.getElementById("supErr");
  const done    = document.getElementById("supDone");
  const doneMsg = document.getElementById("supDoneMsg");
  let kind = "question";

  // Active translation dict (falls back to English). `T` and `lang` come from i18n.js/app.js.
  const d = () => (typeof T !== "undefined" && T[lang]) ? T[lang] : (typeof T !== "undefined" ? T.en : {});
  const setPlaceholder = () => { if (msgEl) msgEl.placeholder = d().supMsgPh || ""; };

  function open(){ panel.hidden = false; fab.setAttribute("aria-expanded", "true"); setPlaceholder(); msgEl.focus(); }
  function close(){ panel.hidden = true; fab.setAttribute("aria-expanded", "false"); }
  fab.addEventListener("click", () => panel.hidden ? open() : close());
  document.getElementById("supClose").addEventListener("click", close);

  // Ticket type selector
  panel.querySelectorAll(".sup-type").forEach(b => b.addEventListener("click", () => {
    kind = b.dataset.kind;
    panel.querySelectorAll(".sup-type").forEach(x => x.classList.toggle("on", x === b));
  }));

  // Re-localize the placeholder when the page language changes
  document.querySelectorAll(".langs button").forEach(b => b.addEventListener("click", setPlaceholder));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = msgEl.value.trim();
    const email   = emailEl.value.trim().toLowerCase();
    errEl.textContent = "";
    if (!message)              { errEl.textContent = d().supErrMsg;   msgEl.focus();   return; }
    if (!EMAIL_RE.test(email)) { errEl.textContent = d().supErrEmail; emailEl.focus(); return; }

    const btn = document.getElementById("supSend");
    btn.disabled = true;
    // Attach the user when logged in (cabinet use later); anonymous on the landing.
    let user_id = null;
    try { const { data } = await supa.auth.getSession(); user_id = data.session ? data.session.user.id : null; } catch (_) {}
    const { error } = await supa.from("support_tickets").insert([{ kind, email, message, user_id, locale: lang }]);
    btn.disabled = false;
    if (error) { errEl.textContent = error.message || "Error"; return; }

    form.hidden = true;
    done.hidden = false;
    doneMsg.textContent = (d().supDone || "").replace("{email}", email);
  });

  document.getElementById("supAgain").addEventListener("click", () => {
    msgEl.value = ""; emailEl.value = ""; errEl.textContent = "";
    done.hidden = true; form.hidden = false; msgEl.focus();
  });

  setPlaceholder();
})();
