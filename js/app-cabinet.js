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
  const owned = new Set(courses.map(c => c.course_id));
  let hasAny = false;

  CATALOG.forEach(cat => {
    // collect courses in this category that the user owns
    const catCourses = [];
    (cat.subs || []).forEach(sub => {
      (sub.courses || []).forEach(course => {
        if (owned.has(course.id)) catCourses.push({ sub, course });
      });
    });
    if (!catCourses.length) return;
    hasAny = true;

    const catEl = document.createElement("div"); catEl.className = "my-cat";
    catEl.innerHTML = `<div class="my-cat-hd">${cat.icon} ${cat.name[lang] || cat.name.en}</div>`;

    // group by sub
    const bySub = {};
    catCourses.forEach(({ sub, course }) => {
      if (!bySub[sub.id]) bySub[sub.id] = { sub, items: [] };
      bySub[sub.id].items.push(course);
    });
    Object.values(bySub).forEach(({ sub, items }) => {
      const subEl = document.createElement("div"); subEl.className = "my-sub";
      subEl.innerHTML = `<div class="my-sub-hd">${sub.name[lang] || sub.name.en}</div>`;
      items.forEach(course => {
        const row = document.createElement("div"); row.className = "course-row";
        const badge = course.type === "guide" ? d.guideBadge : d.examBadge;
        const langs = course.langs.map(l => l.toUpperCase()).join(" · ");
        row.innerHTML = `
          <div class="course-info">
            <span class="course-name">${course.name[lang] || course.name.en}</span>
            <span class="course-meta"><span class="type-badge type-${course.type}">${badge}</span> <span class="lang-pill">${langs}</span></span>
          </div>
          <div class="course-actions">
            <span class="status-badge active">${d.activeBadge}</span>
            <a class="btn-sm open-btn" href="#">${d.openCourse}</a>
          </div>`;
        subEl.appendChild(row);
      });
      catEl.appendChild(subEl);
    });
    wrap.appendChild(catEl);
  });

  if (!hasAny){
    const e = document.createElement("div"); e.className = "empty"; e.textContent = d.myEmpty;
    wrap.appendChild(e);
  }
}

function renderCatalog(){
  const wrap = document.getElementById("catalog"), d = TAPP[lang];
  const owned = new Set(courses.map(c => c.course_id));
  wrap.innerHTML = "";

  CATALOG.forEach(cat => {
    const catEl = document.createElement("div"); catEl.className = "store-cat";
    catEl.innerHTML = `<div class="store-cat-hd">${cat.icon} ${cat.name[lang] || cat.name.en}${cat.soon ? ` <span class="soon-pill">${d.soon}</span>` : ""}</div>`;

    if (!cat.soon) {
      (cat.subs || []).forEach(sub => {
        const subEl = document.createElement("div"); subEl.className = "store-sub";
        subEl.innerHTML = `<div class="store-sub-hd">${sub.name[lang] || sub.name.en}</div>`;
        (sub.courses || []).forEach(course => {
          const isOwned = owned.has(course.id);
          const badge = course.type === "guide" ? d.guideBadge : d.examBadge;
          const langs = course.langs.map(l => l.toUpperCase()).join(" · ");
          const row = document.createElement("div"); row.className = "course-row";
          row.innerHTML = `
            <div class="course-info">
              <span class="course-name">${course.name[lang] || course.name.en}</span>
              <span class="course-meta"><span class="type-badge type-${course.type}">${badge}</span> <span class="lang-pill">${langs}</span></span>
            </div>
            <div class="course-actions">
              <button class="btn-sm${isOwned ? " btn-added" : ""}" data-course-id="${course.id}"${isOwned ? " disabled" : ""}>${isOwned ? d.added : d.addBtn}</button>
            </div>`;
          row.querySelector("button")?.addEventListener("click", async () => {
            if (owned.has(course.id)) return;
            const { data: { user } } = await supa.auth.getUser();
            const { data, error } = await supa.from("user_courses")
              .insert({ user_id: user.id, course_id: course.id })
              .select().single();
            if (!error && data){ courses.push(data); renderMyTests(); renderCatalog(); }
          });
          subEl.appendChild(row);
        });
        catEl.appendChild(subEl);
      });
    }
    wrap.appendChild(catEl);
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
