/* LICENA — cabinet, Supabase-backed
   Passwords: bcrypt via Supabase Auth (never stored in plaintext).
   Devices:   server-side binding; client only holds a random token.
   RLS:       each user can only read/write their own rows. */

const maskDev = id => id ? id.slice(0,4)+"····"+id.slice(-2) : "—";

let lang = "en", profile = null, devices = [], courses = [], currentDevice = null, pendingRemove = null;

function tr(){
  const d = TAPP[lang];
  document.querySelectorAll("[data-a]").forEach(el => { const k = el.getAttribute("data-a"); if (d[k] !== undefined) el.textContent = d[k]; });
  document.querySelectorAll("[data-a-ph]").forEach(el => { const k = el.getAttribute("data-a-ph"); if (d[k] !== undefined) el.placeholder = d[k]; });
  document.documentElement.lang = lang;
}

const deviceAuthorized = () => devices.some(x => x.device_token === currentDevice);

function renderPractice(){
  const auth = deviceAuthorized();
  document.getElementById("practiceContent").style.display = auth ? "block" : "none";
  document.getElementById("practiceAuth").style.display   = (!auth && devices.length < MAX_DEVICES) ? "block" : "none";
  document.getElementById("practiceLimit").style.display  = (!auth && devices.length >= MAX_DEVICES) ? "block" : "none";
  document.getElementById("statusChip").style.display     = auth ? "inline-flex" : "none";
  if (auth && !document.getElementById("topics").childElementCount){
    SECTIONS.forEach((s, i) => {
      const b = document.createElement("button"); b.className = "topic"; b.textContent = s;
      b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      b.addEventListener("click", () => document.querySelectorAll(".topic").forEach(x => x.setAttribute("aria-pressed", x === b)));
      document.getElementById("topics").appendChild(b);
    });
  }
}

function renderMyTests(){
  const wrap = document.getElementById("myList"), d = TAPP[lang];
  wrap.innerHTML = "";
  courses.forEach(c => {
    const name = COURSE_NAMES[c.course_id] || c.course_id;
    const el = document.createElement("div"); el.className = "card";
    el.innerHTML = '<div class="row-between"><strong style="font-family:\'Archivo\';font-size:17px"></strong><span class="badge"></span></div><div class="bar"><i style="width:0%"></i></div><div style="font-size:13px;color:var(--steel);margin-top:8px"><span></span>: 0%</div>';
    el.querySelector("strong").textContent = name;
    el.querySelector(".badge").textContent = d.activeBadge;
    el.querySelector("span").textContent   = d.progress;
    wrap.appendChild(el);
  });
}

function renderCatalog(){
  const d = TAPP[lang];
  document.querySelectorAll("#catalog .cat[data-course]").forEach(card => {
    const c = card.dataset.course, btn = card.querySelector("button");
    const owned = courses.some(x => x.course_id === c);
    if (owned){ btn.textContent = d.added; btn.classList.add("soon"); btn.disabled = true; }
    else { btn.textContent = d.addBtn; btn.classList.remove("soon"); btn.disabled = false; }
  });
}

function renderAccount(){
  const d = TAPP[lang];
  document.getElementById("aEmail").textContent = profile?.email || "—";
  const nameEl = document.getElementById("aName");
  if (nameEl) nameEl.textContent = profile?.name || "—";
  document.getElementById("aSlots").textContent = devices.length + " / " + MAX_DEVICES;
  const wrap = document.getElementById("deviceList"); wrap.innerHTML = "";
  if (!devices.length){
    const e = document.createElement("div"); e.className = "empty"; e.style.marginTop = "0"; e.textContent = "—"; wrap.appendChild(e);
  }
  devices.forEach(dev => {
    const here = dev.device_token === currentDevice;
    const row = document.createElement("div"); row.className = "dev";
    row.innerHTML = '<div><span class="di"></span><span class="here" style="display:none"></span><div class="meta2"></div></div><button></button>';
    row.querySelector(".di").textContent = maskDev(dev.device_token);
    if (here){ const h = row.querySelector(".here"); h.style.display = "inline-block"; h.textContent = d.thisDevice; }
    row.querySelector(".meta2").textContent = new Date(dev.added_at).toLocaleDateString();
    const rb = row.querySelector("button"); rb.textContent = d.remove;
    rb.addEventListener("click", () => openRemove(dev.id));
    wrap.appendChild(row);
  });
}

function renderAll(){ renderPractice(); renderMyTests(); renderCatalog(); renderAccount(); }

async function openRemove(deviceId){
  pendingRemove = deviceId;
  document.getElementById("rmEmail").textContent = profile.email;
  document.getElementById("rmCode").value = "";
  document.getElementById("rmErr").textContent = "";
  document.getElementById("rmModal").style.display = "grid";
  // Send real OTP to user's email via Supabase Auth
  await supa.auth.signInWithOtp({ email: profile.email, options: { shouldCreateUser: false } });
}

async function init(){
  const { data: { session } } = await supa.auth.getSession();
  if (!session){ window.location.replace("index.html"); return; }

  // Device token: generated once, stored in localStorage (intentionally not a hardware fingerprint)
  let devToken = localStorage.getItem("lp:device");
  if (!devToken){
    devToken = "DEV" + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem("lp:device", devToken);
  }
  currentDevice = devToken;

  // Load all data in parallel
  const userId = session.user.id;
  const [profRes, devRes, courseRes] = await Promise.all([
    supa.from("profiles").select("*").eq("id", userId).single(),
    supa.from("devices").select("*").eq("user_id", userId),
    supa.from("user_courses").select("*").eq("user_id", userId)
  ]);

  devices = devRes.data || [];

  // On first login after email confirmation: create profile from pending localStorage data
  if (!profRes.data) {
    const pendingName = localStorage.getItem("lp:pending_name") || session.user.user_metadata?.name || "";
    const pendingLang = localStorage.getItem("lp:pending_lang") || "en";
    await supa.from("profiles").upsert({ id: userId, name: pendingName, lang: pendingLang });
    await supa.from("user_courses").upsert({ user_id: userId, course_id: "cslb-law" });
    localStorage.removeItem("lp:pending_name");
    localStorage.removeItem("lp:pending_lang");
    const [p2, c2] = await Promise.all([
      supa.from("profiles").select("*").eq("id", userId).single(),
      supa.from("user_courses").select("*").eq("user_id", userId)
    ]);
    profile = { ...(p2.data || {}), email: session.user.email };
    courses = c2.data || [];
  } else {
    profile = { ...profRes.data, email: session.user.email };
    courses = courseRes.data || [];
  }

  // Apply saved language preference
  if (profile.lang && TAPP[profile.lang]){
    lang = profile.lang;
    document.querySelectorAll(".app-langs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));
  }

  tr();
  document.getElementById("shell").style.display = "grid";
  renderAll();
}

// — Nav —
document.querySelectorAll(".side button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".side button").forEach(x => x.setAttribute("aria-current", x === b ? "true" : "false"));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("on", p.dataset.panel === b.dataset.panel));
}));

// — Language toggle (saves to profile) —
document.querySelectorAll(".app-langs button").forEach(b => b.addEventListener("click", async () => {
  lang = b.dataset.lang;
  document.querySelectorAll(".app-langs button").forEach(x => x.setAttribute("aria-pressed", x === b));
  tr(); renderAll();
  const { data: { user } } = await supa.auth.getUser();
  if (user) await supa.from("profiles").update({ lang }).eq("id", user.id);
}));

// — Sign out —
document.getElementById("signOut").addEventListener("click", async () => {
  await supa.auth.signOut();
  window.location.replace("index.html");
});

// — Add this device —
document.getElementById("useDevice").addEventListener("click", async () => {
  if (devices.length >= MAX_DEVICES){ renderPractice(); return; }
  const { data: { user } } = await supa.auth.getUser();
  const { data, error } = await supa.from("devices")
    .insert({ user_id: user.id, device_token: currentDevice })
    .select().single();
  if (!error && data){ devices.push(data); renderAll(); }
});

// — Add a course —
document.querySelectorAll("#catalog .cat[data-course] button").forEach(btn => btn.addEventListener("click", async () => {
  const c = btn.closest(".cat").dataset.course;
  if (courses.some(x => x.course_id === c)) return;
  const { data: { user } } = await supa.auth.getUser();
  const { data, error } = await supa.from("user_courses")
    .insert({ user_id: user.id, course_id: c })
    .select().single();
  if (!error && data){ courses.push(data); renderMyTests(); renderCatalog(); }
}));

// — Remove device modal —
document.getElementById("rmCancel").addEventListener("click", () => {
  document.getElementById("rmModal").style.display = "none"; pendingRemove = null;
});
document.getElementById("rmVerify").addEventListener("click", async () => {
  const d = TAPP[lang], err = document.getElementById("rmErr");
  const token = document.getElementById("rmCode").value.trim();
  if (!token || token.length < 6){ err.textContent = d.badCode; return; }
  // Verify OTP code sent to user's email
  const { error: otpErr } = await supa.auth.verifyOtp({ email: profile.email, token, type: "email" });
  if (otpErr){ err.textContent = d.badCode; return; }
  const { error: delErr } = await supa.from("devices").delete().eq("id", pendingRemove);
  if (!delErr){
    devices = devices.filter(x => x.id !== pendingRemove);
    document.getElementById("rmModal").style.display = "none"; pendingRemove = null; renderAll();
  }
});

init();
