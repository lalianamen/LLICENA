/* LICENA auth page logic (DEMO / client-side simulation).
   DEMO ONLY: a static test login is hardcoded below. Remove before production. */

const DEMO_EMAIL = "test@licena.app";   // DEMO ONLY
const DEMO_PASS  = "test1234";          // DEMO ONLY

const mem = {};
const store = {
  async get(k){ try{ const r = await window.storage.get(k); return r ? r.value : (k in mem ? mem[k] : null);}catch(e){ return k in mem ? mem[k] : null; } },
  async set(k,v){ mem[k]=v; try{ await window.storage.set(k,v);}catch(e){} }
};
const validEmail = e => /\S+@\S+\.\S+/.test(e);

let lang="en";
function applyLang(){
  const d=T[lang];
  document.querySelectorAll("[data-t]").forEach(el=>{ const k=el.getAttribute("data-t"); if(d[k]!==undefined) el.innerHTML=d[k]; });
  document.documentElement.lang=lang;
}
document.querySelectorAll(".langs button").forEach(b=>b.addEventListener("click",()=>{
  lang=b.dataset.lang; document.querySelectorAll(".langs button").forEach(x=>x.setAttribute("aria-pressed", x===b)); applyLang();
}));

// tabs
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tabs button").forEach(x=>x.setAttribute("aria-pressed", x===b));
  document.querySelectorAll(".authpanel").forEach(p=>p.classList.toggle("on", p.dataset.panel===b.dataset.tab));
}));

async function ensureAccount(email, password){
  // create the account record if missing (demo). Default course unlocked for testing.
  let raw = await store.get("lp:account");
  let acc = raw ? JSON.parse(raw) : null;
  if(!acc || acc.email!==email){
    acc = { email, password, courses:["cslb-law"], devices:[], moves:0 };
    await store.set("lp:account", JSON.stringify(acc));
  }
  return acc;
}
async function startSession(email){
  await store.set("lp:session", JSON.stringify({ email, at: Date.now() }));
  window.location.href = "app.html";
}

// login
document.getElementById("li_btn").addEventListener("click", async ()=>{
  const d=T[lang], err=document.getElementById("li_err");
  const email=document.getElementById("li_email").value.trim().toLowerCase();
  const pass=document.getElementById("li_pass").value;
  if(!email || !pass){ err.textContent=d.errFields; return; }
  // 1) static demo credentials
  if(email===DEMO_EMAIL && pass===DEMO_PASS){ await ensureAccount(DEMO_EMAIL, DEMO_PASS); return startSession(DEMO_EMAIL); }
  // 2) locally-registered account (simulation)
  const raw=await store.get("lp:account"); const acc=raw?JSON.parse(raw):null;
  if(acc && acc.email===email && acc.password===pass){ return startSession(email); }
  err.textContent=d.errCreds;
});

// register
document.getElementById("rg_btn").addEventListener("click", async ()=>{
  const d=T[lang], err=document.getElementById("rg_err");
  const email=document.getElementById("rg_email").value.trim().toLowerCase();
  const pass=document.getElementById("rg_pass").value;
  if(!validEmail(email)){ err.textContent=d.errEmail; return; }
  if(!pass){ err.textContent=d.errFields; return; }
  if(!document.getElementById("rg_consent").checked){ err.textContent=d.errConsent; return; }
  const acc={ email, password:pass, courses:["cslb-law"], devices:[], moves:0 };
  await store.set("lp:account", JSON.stringify(acc));
  return startSession(email);
});

applyLang();
