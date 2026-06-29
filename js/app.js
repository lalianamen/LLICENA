/* LICENA — auth page, Supabase Auth */

let lang = "en";

// Validation: email must look like an address; password must use Latin
// letters with at least one uppercase letter and at least one symbol.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function passOk(p){ return /[A-Z]/.test(p) && /[^A-Za-z0-9]/.test(p); }

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

// Redirect to cabinet if already logged in
supa.auth.getSession().then(({ data: { session } }) => {
  if (session) window.location.href = "app.html";
});

// LOGIN
async function doLogin() {
  const d = T[lang], err = document.getElementById("li_err");
  const email = document.getElementById("li_email").value.trim().toLowerCase();
  const pass  = document.getElementById("li_pass").value;
  if (!email || !pass) { err.textContent = d.errFields; return; }
  if (!EMAIL_RE.test(email)) { err.textContent = d.errEmail; return; }
  const btn = document.getElementById("li_btn");
  btn.disabled = true; err.textContent = "";
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
  const name  = document.getElementById("rg_name").value.trim();
  const email = document.getElementById("rg_email").value.trim().toLowerCase();
  const pass  = document.getElementById("rg_pass").value;
  if (!name)  { err.textContent = d.errName;    return; }
  if (!email) { err.textContent = d.errEmail;   return; }
  if (!EMAIL_RE.test(email)) { err.textContent = d.errEmail; return; }
  if (!pass)  { err.textContent = d.errFields;  return; }
  if (!passOk(pass)) { err.textContent = d.errPass; return; }
  if (!document.getElementById("rg_age").checked)     { err.textContent = d.errAge;     return; }
  if (!document.getElementById("rg_consent").checked) { err.textContent = d.errConsent; return; }
  const btn = document.getElementById("rg_btn");
  btn.disabled = true; err.textContent = "";
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

// Back button / browser back from check-email screen → return to register panel
document.getElementById("backToRegister").addEventListener("click", () => {
  history.back();
});
window.addEventListener("popstate", () => {
  showPanel("register");
});

applyLang();
