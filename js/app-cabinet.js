/* LICENA cabinet logic (DEMO / client-side simulation).
   Password opens the shell (any device); questions open only on added devices.
   Removing a device needs an email code (simulated). Real enforcement = backend. */

const mem = {};
const store = {
  async get(k){ try{ const r = await window.storage.get(k); return r ? r.value : (k in mem ? mem[k] : null);}catch(e){ return k in mem ? mem[k] : null; } },
  async set(k,v){ mem[k]=v; try{ await window.storage.set(k,v);}catch(e){} },
  async del(k){ delete mem[k]; try{ await window.storage.delete(k);}catch(e){} }
};
const maskDev = id => id ? id.slice(0,4)+"····"+id.slice(-2) : "—";
const code6 = () => String(Math.floor(100000+Math.random()*900000));

let lang="en", session=null, account=null, currentDevice=null, pendingRemove=null, pendingCode=null;

function tr(){
  const d=TAPP[lang];
  document.querySelectorAll("[data-a]").forEach(el=>{ const k=el.getAttribute("data-a"); if(d[k]!==undefined) el.textContent=d[k]; });
  document.querySelectorAll("[data-a-ph]").forEach(el=>{ const k=el.getAttribute("data-a-ph"); if(d[k]!==undefined) el.placeholder=d[k]; });
  document.documentElement.lang=lang;
}
const deviceAuthorized = () => !!account && account.devices.some(x=>x.id===currentDevice);

function renderPractice(){
  const auth=deviceAuthorized();
  document.getElementById("practiceContent").style.display = auth ? "block" : "none";
  document.getElementById("practiceAuth").style.display = (!auth && account.devices.length<MAX_DEVICES) ? "block" : "none";
  document.getElementById("practiceLimit").style.display = (!auth && account.devices.length>=MAX_DEVICES) ? "block" : "none";
  document.getElementById("statusChip").style.display = auth ? "inline-flex" : "none";
  if(auth && !document.getElementById("topics").childElementCount){
    SECTIONS.forEach((s,i)=>{ const b=document.createElement("button"); b.className="topic"; b.textContent=s;
      b.setAttribute("aria-pressed", i===0?"true":"false");
      b.addEventListener("click",()=>document.querySelectorAll(".topic").forEach(x=>x.setAttribute("aria-pressed", x===b)));
      document.getElementById("topics").appendChild(b); });
  }
}
function renderMyTests(){
  const wrap=document.getElementById("myList"), d=TAPP[lang]; wrap.innerHTML="";
  account.courses.forEach(c=>{
    const name=COURSE_NAMES[c]||c;
    const el=document.createElement("div"); el.className="card";
    el.innerHTML='<div class="row-between"><strong style="font-family:\'Archivo\';font-size:17px"></strong><span class="badge"></span></div>'+
      '<div class="bar"><i style="width:0%"></i></div><div style="font-size:13px;color:var(--steel);margin-top:8px"><span></span>: 0%</div>';
    el.querySelector("strong").textContent=name;
    el.querySelector(".badge").textContent=d.activeBadge;
    el.querySelector("span").textContent=d.progress;
    wrap.appendChild(el);
  });
}
function renderCatalog(){
  const d=TAPP[lang];
  document.querySelectorAll("#catalog .cat[data-course]").forEach(card=>{
    const c=card.dataset.course, btn=card.querySelector("button");
    if(account.courses.includes(c)){ btn.textContent=d.added; btn.classList.add("soon"); btn.disabled=true; }
    else { btn.textContent=d.addBtn; btn.classList.remove("soon"); btn.disabled=false; }
  });
}
function renderAccount(){
  const d=TAPP[lang];
  document.getElementById("aEmail").textContent=account.email;
  document.getElementById("aSlots").textContent=account.devices.length+" / "+MAX_DEVICES;
  document.getElementById("aMoves").textContent=Math.max(0, MAX_MOVES-(account.moves||0));
  const wrap=document.getElementById("deviceList"); wrap.innerHTML="";
  if(!account.devices.length){ const e=document.createElement("div"); e.className="empty"; e.style.marginTop="0"; e.textContent="—"; wrap.appendChild(e); }
  account.devices.forEach(dev=>{
    const here = dev.id===currentDevice;
    const row=document.createElement("div"); row.className="dev";
    row.innerHTML='<div><span class="di"></span><span class="here" style="display:none"></span><div class="meta2"></div></div><button></button>';
    row.querySelector(".di").textContent=maskDev(dev.id);
    if(here){ const h=row.querySelector(".here"); h.style.display="inline-block"; h.textContent=d.thisDevice; }
    row.querySelector(".meta2").textContent=new Date(dev.addedAt).toLocaleDateString();
    const rb=row.querySelector("button"); rb.textContent=d.remove;
    rb.addEventListener("click",()=>openRemove(dev.id));
    wrap.appendChild(row);
  });
}
function renderAll(){ renderPractice(); renderMyTests(); renderCatalog(); renderAccount(); }

async function save(){ await store.set("lp:account", JSON.stringify(account)); }

function openRemove(id){
  const d=TAPP[lang];
  if((account.moves||0) >= MAX_MOVES){ alert(d.noMoves); return; }
  pendingRemove=id; pendingCode=code6();
  document.getElementById("rmEmail").textContent=account.email;
  document.getElementById("rmDemoCode").textContent=pendingCode;
  document.getElementById("rmCode").value=""; document.getElementById("rmErr").textContent="";
  document.getElementById("rmModal").style.display="grid";
}

async function init(){
  const sraw=await store.get("lp:session"); session = sraw?JSON.parse(sraw):null;
  if(!session){ window.location.replace("index.html"); return; }
  const araw=await store.get("lp:account"); account = araw?JSON.parse(araw):{email:session.email,courses:["cslb-law"],devices:[],moves:0};
  if(!account.devices) account.devices=[];
  currentDevice=await store.get("lp:device");
  if(!currentDevice){ currentDevice="DEV"+Math.random().toString(36).slice(2,8).toUpperCase(); await store.set("lp:device",currentDevice); }
  tr(); document.getElementById("shell").style.display="grid"; renderAll();
}

// nav
document.querySelectorAll(".side button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".side button").forEach(x=>x.setAttribute("aria-current", x===b?"true":"false"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("on", p.dataset.panel===b.dataset.panel));
}));
// language
document.querySelectorAll(".app-langs button").forEach(b=>b.addEventListener("click",()=>{
  lang=b.dataset.lang; document.querySelectorAll(".app-langs button").forEach(x=>x.setAttribute("aria-pressed", x===b)); tr(); renderAll();
}));
// sign out
document.getElementById("signOut").addEventListener("click", async ()=>{ await store.del("lp:session"); window.location.replace("index.html"); });
// authorize this device
document.getElementById("useDevice").addEventListener("click", async ()=>{
  if(account.devices.length>=MAX_DEVICES){ renderPractice(); return; }
  account.devices.push({id:currentDevice, addedAt:Date.now()}); await save(); renderAll();
});
// add a course (no payment)
document.querySelectorAll("#catalog .cat[data-course] button").forEach(btn=>btn.addEventListener("click", async ()=>{
  const c=btn.closest(".cat").dataset.course;
  if(account.courses.includes(c)) return;
  account.courses.push(c); await save(); renderMyTests(); renderCatalog();
}));
// remove-device modal
document.getElementById("rmCancel").addEventListener("click",()=>{ document.getElementById("rmModal").style.display="none"; pendingRemove=null; });
document.getElementById("rmVerify").addEventListener("click", async ()=>{
  const d=TAPP[lang], err=document.getElementById("rmErr");
  if(document.getElementById("rmCode").value.trim()!==pendingCode){ err.textContent=d.badCode; return; }
  account.devices=account.devices.filter(x=>x.id!==pendingRemove);
  account.moves=(account.moves||0)+1; await save();
  document.getElementById("rmModal").style.display="none"; pendingRemove=null; renderAll();
});

init();
