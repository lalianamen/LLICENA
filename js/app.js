/* LICENA — auth page, Supabase Auth */

let lang = "en";

// Validation: email must look like an address; password must use Latin
// letters with at least one uppercase letter and at least one symbol.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function passOk(p){ return /[A-Z]/.test(p) && /[^A-Za-z0-9]/.test(p); }

// Inline validation feedback: red-highlight a control and show why next to it.
function fieldErr(input, msg){
  input.classList.add("invalid");
  const field = input.closest(".field");
  if (msg === null){                 // password: reuse the requirement hint as the reason
    const hint = field && field.querySelector(".pwhint");
    if (hint) hint.classList.add("bad");
    return;
  }
  const slot = field && field.querySelector(".ferr");
  if (slot) slot.textContent = msg;
}
function consentErr(checkbox){ checkbox.closest(".consent").classList.add("invalid"); }
function clearErrors(form){
  form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
  form.querySelectorAll(".ferr").forEach(el => el.textContent = "");
  form.querySelectorAll(".pwhint").forEach(el => el.classList.remove("bad"));
}

function applyLang(){
  const d = T[lang];
  document.querySelectorAll("[data-t]").forEach(el => {
    const k = el.getAttribute("data-t");
    if (d[k] !== undefined) el.innerHTML = d[k];
  });
  document.documentElement.lang = lang;
}

function showPanel(name){
  document.querySelectorAll(".authpanel").forEach(p => p.classList.toggle("on", p.dataset.panel === name));
  document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === name));
}

document.querySelectorAll(".langs button").forEach(b => b.addEventListener("click", () => {
  lang = b.dataset.lang;
  document.querySelectorAll(".langs button").forEach(x => x.setAttribute("aria-pressed", x === b));
  applyLang();
}));

document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-pressed", x === b));
  document.querySelectorAll(".authpanel").forEach(p => p.classList.toggle("on", p.dataset.panel === b.dataset.tab));
}));

document.querySelectorAll(".pwtoggle").forEach(btn => btn.addEventListener("click", () => {
  const inp = document.getElementById(btn.dataset.target);
  const show = inp.type === "password";
  inp.type = show ? "text" : "password";
  btn.setAttribute("aria-pressed", show ? "true" : "false");
  btn.textContent = show ? "🙈" : "👁";
}));

// If the user arrived from a password-reset email, show the reset panel instead
// of bouncing them to the cabinet. (Recovery links land with #type=recovery.)
const recovering = location.hash.includes("type=recovery");
supa.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") showPanel("reset");
});
if (recovering) showPanel("reset");

// Redirect to cabinet if already logged in — but not mid password-reset.
supa.auth.getSession().then(({ data: { session } }) => {
  if (session && !recovering) window.location.href = "app.html";
});

// LOGIN
async function doLogin() {
  const d = T[lang], err = document.getElementById("li_err");
  const emailEl = document.getElementById("li_email");
  const passEl  = document.getElementById("li_pass");
  const email = emailEl.value.trim().toLowerCase();
  const pass  = passEl.value;
  clearErrors(emailEl.form); err.textContent = "";
  const bad = [];
  if (!email || !EMAIL_RE.test(email)) { fieldErr(emailEl, d.errEmail); bad.push(emailEl); }
  if (!pass) { fieldErr(passEl, d.errPassReq); bad.push(passEl); }
  if (bad.length) { bad[0].focus(); return; }
  const btn = document.getElementById("li_btn");
  btn.disabled = true;
  const { error } = await supa.auth.signInWithPassword({ email, password: pass });
  btn.disabled = false;
  if (error) { err.textContent = d.errCreds; return; }
  window.location.href = "app.html";
}
document.getElementById("li_btn").addEventListener("click", doLogin);
document.getElementById("li_form").addEventListener("submit", doLogin);

// REGISTER
async function doRegister() {
  const d = T[lang], err = document.getElementById("rg_err");
  const nameEl  = document.getElementById("rg_name");
  const emailEl = document.getElementById("rg_email");
  const passEl  = document.getElementById("rg_pass");
  const ageEl   = document.getElementById("rg_age");
  const consEl  = document.getElementById("rg_consent");
  const name  = nameEl.value.trim();
  const email = emailEl.value.trim().toLowerCase();
  const pass  = passEl.value;
  clearErrors(nameEl.form); err.textContent = "";
  const bad = [];
  if (!name) { fieldErr(nameEl, d.errName); bad.push(nameEl); }
  if (!email || !EMAIL_RE.test(email)) { fieldErr(emailEl, d.errEmail); bad.push(emailEl); }
  if (!passOk(pass)) { fieldErr(passEl, null); bad.push(passEl); }
  if (!ageEl.checked)  { consentErr(ageEl);  if (!err.textContent) err.textContent = d.errAge;     bad.push(ageEl); }
  if (!consEl.checked) { consentErr(consEl); if (!err.textContent) err.textContent = d.errConsent; bad.push(consEl); }
  if (bad.length) { bad[0].focus(); return; }
  const btn = document.getElementById("rg_btn");
  btn.disabled = true;
  const { data, error } = await supa.auth.signUp({
    email, password: pass,
    options: { data: { name, lang } }
  });
  btn.disabled = false;
  if (error) { err.textContent = error.message; return; }
  // Save pending profile data — will be written to DB on first login (session required for RLS)
  localStorage.setItem("lp:pending_name", name);
  localStorage.setItem("lp:pending_lang", lang);
  if (!data.session) {
    // Email confirmation required — show check-email screen
    const sentTo = document.getElementById("sentTo");
    if (sentTo) sentTo.textContent = email;
    history.pushState({ panel: "check-email" }, "");
    showPanel("check-email");
  } else {
    window.location.href = "app.html";
  }
}
document.getElementById("rg_btn").addEventListener("click", doRegister);
document.getElementById("rg_form").addEventListener("submit", doRegister);

// FORGOT PASSWORD — request a reset link
document.getElementById("fp_link").addEventListener("click", () => showPanel("forgot"));
document.getElementById("fp_back").addEventListener("click", () => showPanel("login"));
async function doForgot() {
  const d = T[lang], err = document.getElementById("fp_err");
  const emailEl = document.getElementById("fp_email");
  const email = emailEl.value.trim().toLowerCase();
  clearErrors(emailEl.form); err.textContent = "";
  if (!email || !EMAIL_RE.test(email)) { fieldErr(emailEl, d.errEmail); emailEl.focus(); return; }
  const btn = document.getElementById("fp_btn");
  btn.disabled = true;
  // redirectTo is built from the current origin, so it works on any domain.
  await supa.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  btn.disabled = false;
  // Anti-enumeration: identical confirmation whether or not the email is registered.
  document.getElementById("fp_form").style.display = "none";
  document.getElementById("fp_sent").style.display = "block";
}
document.getElementById("fp_btn").addEventListener("click", doForgot);
document.getElementById("fp_form").addEventListener("submit", doForgot);

// RESET PASSWORD — set a new password from the recovery link
async function doReset() {
  const d = T[lang], err = document.getElementById("rs_err");
  const passEl = document.getElementById("rs_pass");
  const pass = passEl.value;
  clearErrors(passEl.form); err.textContent = "";
  if (!passOk(pass)) { fieldErr(passEl, null); passEl.focus(); return; }
  const btn = document.getElementById("rs_btn");
  btn.disabled = true;
  const { error } = await supa.auth.updateUser({ password: pass });
  btn.disabled = false;
  if (error) { err.textContent = d.rsErrLink; return; }
  window.location.href = "app.html";
}
document.getElementById("rs_btn").addEventListener("click", doReset);
document.getElementById("rs_form").addEventListener("submit", doReset);

// Clear a field's error highlight as soon as the user starts fixing it
document.querySelectorAll("#li_form input, #rg_form input, #fp_form input, #rs_form input").forEach(el => {
  const clear = () => {
    el.classList.remove("invalid");
    const box = el.closest(".field, .consent");
    if (!box) return;
    box.classList.remove("invalid");
    const slot = box.querySelector(".ferr"); if (slot) slot.textContent = "";
    const hint = box.querySelector(".pwhint"); if (hint) hint.classList.remove("bad");
  };
  el.addEventListener("input", clear);
  el.addEventListener("change", clear);
});

// Back button / browser back from check-email screen → return to register panel
document.getElementById("backToRegister").addEventListener("click", () => {
  history.back();
});
window.addEventListener("popstate", () => {
  showPanel("register");
});

applyLang();
