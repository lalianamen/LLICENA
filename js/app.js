/* LICENA — auth page, Supabase Auth */

let lang = "en";

function applyLang(){
  const d = T[lang];
  document.querySelectorAll("[data-t]").forEach(el => {
    const k = el.getAttribute("data-t");
    if (d[k] !== undefined) el.innerHTML = d[k];
  });
  document.documentElement.lang = lang;
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
document.getElementById("li_btn").addEventListener("click", async () => {
  const d = T[lang], err = document.getElementById("li_err");
  const email = document.getElementById("li_email").value.trim().toLowerCase();
  const pass  = document.getElementById("li_pass").value;
  if (!email || !pass) { err.textContent = d.errFields; return; }
  const btn = document.getElementById("li_btn");
  btn.disabled = true; err.textContent = "";
  const { error } = await supa.auth.signInWithPassword({ email, password: pass });
  btn.disabled = false;
  if (error) { err.textContent = d.errCreds; return; }
  window.location.href = "app.html";
});

// REGISTER
document.getElementById("rg_btn").addEventListener("click", async () => {
  const d = T[lang], err = document.getElementById("rg_err");
  const name  = document.getElementById("rg_name").value.trim();
  const email = document.getElementById("rg_email").value.trim().toLowerCase();
  const exam  = document.getElementById("rg_exam").value;
  const pass  = document.getElementById("rg_pass").value;
  if (!name)  { err.textContent = d.errName;    return; }
  if (!email) { err.textContent = d.errEmail;   return; }
  if (!pass)  { err.textContent = d.errFields;  return; }
  if (!document.getElementById("rg_consent").checked) { err.textContent = d.errConsent; return; }
  const btn = document.getElementById("rg_btn");
  btn.disabled = true; err.textContent = "";
  const { data, error } = await supa.auth.signUp({ email, password: pass });
  if (error) { btn.disabled = false; err.textContent = error.message; return; }
  if (data.user) {
    await supa.from("profiles").upsert({ id: data.user.id, name, target_exam: exam, lang });
    await supa.from("user_courses").upsert({ user_id: data.user.id, course_id: "cslb-law" });
  }
  btn.disabled = false;
  window.location.href = "app.html";
});

applyLang();
