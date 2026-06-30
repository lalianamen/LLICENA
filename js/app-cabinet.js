/* LICENA — cabinet, Supabase-backed */

let lang = "en", accountLang = "en";
let profile = null, courses = [], pendingAdd = null;
let selectedState = localStorage.getItem("lp:state") || "ca";

// Anti-sharing: bounce to login if this session's device isn't registered.
if (window.LICENA_devices) LICENA_devices.backstop(supa);

function tr(){
  const d = TAPP[lang];
  document.querySelectorAll("[data-a]").forEach(el => { const k = el.getAttribute("data-a"); if (d[k] !== undefined) el.textContent = d[k]; });
  document.documentElement.lang = lang;
}

// ─── State picker ───────────────────────────────────────────────────────────
function stateById(id){ return STATES.find(s => s.id === id) || STATES[0]; }

function renderStateBadge(){
  const s = stateById(selectedState);
  const badge = document.getElementById("stateBadge");
  badge.innerHTML = `<span class="state-flag">${s.flag}</span><span class="state-name">${s.name[lang] || s.name.en}</span><span class="state-caret">▾</span>`;
}

function renderStateMenu(){
  const menu = document.getElementById("stateMenu"), d = TAPP[lang];
  menu.innerHTML = "";
  STATES.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "state-opt" + (s.id === selectedState ? " active" : "") + (s.active ? "" : " disabled");
    btn.innerHTML = `<span class="state-flag">${s.flag}</span><span class="state-name">${s.name[lang] || s.name.en}</span>` +
      (s.active ? "" : `<span class="state-soon">${d.stateSoon}</span>`);
    if (s.active){
      btn.addEventListener("click", () => {
        selectedState = s.id;
        localStorage.setItem("lp:state", selectedState);
        closeStateMenu();
        renderStateBadge();
        renderAll();
      });
    }
    menu.appendChild(btn);
  });
}

function openStateMenu(){
  document.getElementById("stateMenu").hidden = false;
  document.getElementById("stateBadge").setAttribute("aria-expanded", "true");
}
function closeStateMenu(){
  document.getElementById("stateMenu").hidden = true;
  document.getElementById("stateBadge").setAttribute("aria-expanded", "false");
}

document.getElementById("stateBadge").addEventListener("click", e => {
  e.stopPropagation();
  const hidden = document.getElementById("stateMenu").hidden;
  if (hidden){ renderStateMenu(); openStateMenu(); } else closeStateMenu();
});
document.addEventListener("click", e => {
  if (!document.getElementById("statePicker").contains(e.target)) closeStateMenu();
});

// Categories for the currently-selected state
function statesCatalog(){ return CATALOG.filter(cat => (cat.state || "ca") === selectedState); }
function statePill(){ const s = stateById(selectedState); return `<span class="state-pill">${s.flag} ${s.abbr}</span>`; }

// ─── Subcategory toggle helper ────────────────────────────────────────────────
function makeSubEl(sub, bodyBuilder, startCollapsed){
  const subEl = document.createElement("div"); subEl.className = "my-sub" + (startCollapsed ? " collapsed" : "");
  const hd = document.createElement("div"); hd.className = "my-sub-hd";
  hd.innerHTML = `<span>${sub.name[lang] || sub.name.en}</span><span class="sub-chevron">${startCollapsed ? "▸" : "▾"}</span>`;
  hd.addEventListener("click", () => {
    const collapsed = subEl.classList.toggle("collapsed");
    hd.querySelector(".sub-chevron").textContent = collapsed ? "▸" : "▾";
  });
  const body = document.createElement("div"); body.className = "sub-body";
  bodyBuilder(body);
  subEl.appendChild(hd); subEl.appendChild(body);
  return subEl;
}

// ─── My Courses ───────────────────────────────────────────────────────────────
function renderMyTests(){
  const wrap = document.getElementById("myList"), d = TAPP[lang];
  wrap.innerHTML = "";
  const owned = new Set(courses.map(c => c.course_id));

  let hasAny = false;

  // Map course_id -> status row
  const statusOf = {};
  courses.forEach(c => { statusOf[c.course_id] = c.status || "active"; });

  statesCatalog().forEach(cat => {
    const bySub = {};
    (cat.subs || []).forEach(sub => {
      (sub.courses || []).forEach(course => {
        if (!owned.has(course.id)) return;
        if (!bySub[sub.id]) bySub[sub.id] = { sub, items: [] };
        bySub[sub.id].items.push(course);
      });
    });
    if (!Object.keys(bySub).length) return;
    hasAny = true;
    const catEl = document.createElement("div"); catEl.className = "my-cat";
    catEl.innerHTML = `<div class="my-cat-hd">${cat.icon} ${cat.name[lang] || cat.name.en}</div>`;
    Object.values(bySub).forEach(({ sub, items }) => {
      catEl.appendChild(makeSubEl(sub, body => {
        items.forEach(course => {
          const badge = course.type === "guide" ? d.guideBadge : d.examBadge;
          const courseLang = localStorage.getItem("lp:course_lang:" + course.id) || course.langs[0];
          const status = statusOf[course.id] || "active";
          const isActive = status === "active";
          const statusBadge = isActive
            ? `<span class="status-badge active">${d.activeBadge}</span>`
            : `<span class="status-badge inactive">${d.inactiveBadge}</span>`;
          const row = document.createElement("div");
          row.className = "course-row" + (isActive ? " course-row-link" : " course-row-inactive");
          row.innerHTML = `
            <div class="course-info">
              <span class="course-name">${course.name[lang] || course.name.en}</span>
              <span class="course-meta"><span class="type-badge type-${course.type}">${badge}</span>${statePill()}</span>
            </div>
            <div class="course-actions">
              ${statusBadge}
              ${isActive ? `<span class="open-arrow">→</span>` : ""}
              <button class="course-del-btn" title="${d.removeBtn || 'Remove'}" data-id="${course.id}">✕</button>
            </div>`;
          row.querySelector(".course-del-btn").addEventListener("click", e => {
            e.stopPropagation();
            openRemoveCourseModal(course);
          });
          if (isActive){
            row.addEventListener("click", () => { window.location.href = `course.html?id=${course.id}&lang=${courseLang}`; });
          }
          body.appendChild(row);
        });
      }));
    });
    wrap.appendChild(catEl);
  });

  if (!hasAny){
    const e = document.createElement("div"); e.className = "empty"; e.textContent = d.myEmpty;
    wrap.appendChild(e);
  }
}

// ─── Catalog ──────────────────────────────────────────────────────────────────
function renderCatalog(){
  const wrap = document.getElementById("catalog"), d = TAPP[lang];
  const owned = new Set(courses.map(c => c.course_id));
  wrap.innerHTML = "";

  const cats = statesCatalog();
  if (!cats.length){
    const e = document.createElement("div"); e.className = "empty"; e.textContent = d.stateEmpty;
    wrap.appendChild(e); return;
  }

  cats.forEach(cat => {
    const catEl = document.createElement("div"); catEl.className = "store-cat";
    catEl.innerHTML = `<div class="store-cat-hd">${cat.icon} ${cat.name[lang] || cat.name.en}${cat.soon ? ` <span class="soon-pill">${d.soon}</span>` : ""}</div>`;
    if (!cat.soon){
      (cat.subs || []).forEach(sub => {
        catEl.appendChild(makeSubEl(sub, body => {
          // General "honest chances" — pinned, open, in the General group (construction only for now).
          if (cat.id === "construction" && sub.id === "general"){
            const g = window.HONEST_CHANCES_GENERAL || {};
            const gl = g[lang] ? lang : "en";
            if (g[gl]){
              const titles = window.HONEST_CHANCES_TITLE || {};
              const det = document.createElement("details");
              det.className = "hc-my-details hc-general"; det.open = true;
              det.innerHTML = `<summary class="hc-my-summary">${titles[gl] || titles.en}</summary><div class="hc-my-body">${g[gl]}</div>`;
              body.appendChild(det);
            }
          }
          (sub.courses || []).forEach(course => {
            const isOwned = owned.has(course.id);
            const badge = course.type === "guide" ? d.guideBadge : d.examBadge;
            const row = document.createElement("div"); row.className = "course-row";
            row.innerHTML = `
              <div class="course-info">
                <span class="course-name">${course.name[lang] || course.name.en}</span>
                <span class="course-meta"><span class="type-badge type-${course.type}">${badge}</span>${statePill()}</span>
              </div>
              <div class="course-actions">
                <button class="btn-sm${isOwned ? " btn-added" : ""}"${isOwned ? " disabled" : ""}>${isOwned ? d.added : d.addBtn}</button>
              </div>`;
            if (!isOwned) row.querySelector("button").addEventListener("click", () => openPayModal(course));
            body.appendChild(row);
          });
        }, true));
      });
    }
    wrap.appendChild(catEl);
  });
}

// ─── Account ──────────────────────────────────────────────────────────────────
function renderAccount(){
  document.getElementById("aEmail").textContent = profile?.email || "—";
  const nameEl = document.getElementById("aName");
  if (nameEl) nameEl.textContent = profile?.name || "—";
}

function renderAll(){ renderMyTests(); renderCatalog(); renderAccount(); }

// ─── Activate / pay modal (beta: free) ────────────────────────────────────────
// No language is chosen at purchase — a course is study-language-agnostic, and the
// player shows it in the account language. Adding just records the entitlement.
function openPayModal(course){
  pendingAdd = course;
  document.getElementById("payModalTitle").textContent = course.name[lang] || course.name.en;
  document.getElementById("payCourseInfo").innerHTML = "";
  // Honest-chances: mandatory read + acknowledgment before a course can be activated.
  const g = window.HONEST_CHANCES_GENERAL || {};
  const titles = window.HONEST_CHANCES_TITLE || {};
  const gl = g[lang] ? lang : "en";
  document.getElementById("payHonestTitle").textContent = titles[gl] || titles.en || "★ Honest chances";
  document.getElementById("payHonestBody").innerHTML = g[gl] || g.en || "";
  document.getElementById("payHonest").open = true;
  const chk = document.getElementById("payHonestChk");
  chk.checked = false;
  document.getElementById("payConfirm").disabled = true;
  document.getElementById("payModal").style.display = "grid";
}

// ─── Remove course modal ──────────────────────────────────────────────────────
let pendingRemove = null;

function openRemoveCourseModal(course){
  pendingRemove = course;
  const d = TAPP[lang];
  document.getElementById("removeCourseTitle").textContent = course.name[lang] || course.name.en;
  document.getElementById("removeCourseModal").style.display = "grid";
}

document.getElementById("removeCourseCancel").addEventListener("click", () => {
  document.getElementById("removeCourseModal").style.display = "none"; pendingRemove = null;
});

document.getElementById("removeCourseConfirm").addEventListener("click", async () => {
  const course = pendingRemove;
  document.getElementById("removeCourseModal").style.display = "none";
  pendingRemove = null;
  if (!course) return;
  const { data: { user } } = await supa.auth.getUser();
  const { error } = await supa.from("user_courses")
    .delete().eq("user_id", user.id).eq("course_id", course.id);
  if (!error){
    courses = courses.filter(c => c.course_id !== course.id);
    renderMyTests(); renderCatalog();
  }
});

document.getElementById("payCancel").addEventListener("click", () => {
  document.getElementById("payModal").style.display = "none"; pendingAdd = null;
});

// Mandatory honest-chances acknowledgment gates the activate button.
document.getElementById("payHonestChk").addEventListener("change", e => {
  document.getElementById("payConfirm").disabled = !e.target.checked;
});

// ── Entitlement grant — SINGLE POINT TO CHANGE FOR PAYMENT ─────────────────────
// During the free beta the client writes the user_courses "active" row directly.
// When payment goes live this must move SERVER-SIDE: a Stripe webhook
// (checkout.session.completed) inserts the row, and the RLS "courses: own insert"
// policy must be dropped so a user can no longer self-grant a course for free.
// Everything else only READS user_courses and doesn't care who wrote it, so this
// function is the only thing that changes.
async function grantCourseAccess(course){
  const { data: { user } } = await supa.auth.getUser();
  // Upsert: re-adding a removed course (or new) sets status back to active.
  const { data, error } = await supa.from("user_courses")
    .upsert({ user_id: user.id, course_id: course.id, status: "active" }, { onConflict: "user_id,course_id" })
    .select().single();
  if (error || !data) return false;
  const idx = courses.findIndex(c => c.course_id === course.id);
  if (idx >= 0) courses[idx] = data; else courses.push(data);
  return true;
}

document.getElementById("payConfirm").addEventListener("click", async () => {
  if (document.getElementById("payConfirm").disabled) return;
  const course = pendingAdd;
  document.getElementById("payModal").style.display = "none";
  pendingAdd = null;
  if (!course) return;
  if (await grantCourseAccess(course)){ renderMyTests(); renderCatalog(); }
});

// ─── Nav ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".side button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".side button").forEach(x => x.setAttribute("aria-current", x === b ? "true" : "false"));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("on", p.dataset.panel === b.dataset.panel));
}));

// ─── Language pickers ─────────────────────────────────────────────────────────
const ALL_LANGS = [
  { key:"en", label:"EN", name:"English" },
  { key:"ru", label:"RU", name:"Русский" },
  { key:"es", label:"ES", name:"Español" }
];

// Toggle display lang (header EN/LANG buttons) — does NOT change account language
function switchDisplayLang(newLang){
  lang = newLang;
  tr(); renderStateBadge(); renderAll();
  renderHeaderLangs();
  renderAcctLangPicker();
}

// Save account language (Account panel) — persists to Supabase + localStorage
async function saveAccountLang(newLang){
  accountLang = newLang;
  lang = newLang;
  if (profile) profile.lang = newLang;
  localStorage.setItem("lp:ui_lang", newLang);
  // The account language drives course content too. Drop the per-course study-language
  // overrides (written when a course was added) so every previously-added course
  // re-derives its language from the new account language next time it is opened —
  // otherwise an old Russian pick would stick on already-added courses.
  for (let i = localStorage.length - 1; i >= 0; i--){
    const k = localStorage.key(i);
    if (k && k.indexOf("lp:course_lang:") === 0) localStorage.removeItem(k);
  }
  tr(); renderStateBadge(); renderAll();
  renderHeaderLangs();
  renderAcctLangPicker();
  const { data: { user } } = await supa.auth.getUser();
  if (user){
    const { error } = await supa.from("profiles").update({ lang: newLang }).eq("id", user.id);
    if (error) console.warn("lang save failed:", error.message);
  }
}

function renderHeaderLangs(){
  const wrap = document.getElementById("appLangs");
  if (!wrap) return;
  wrap.innerHTML = "";
  // Buttons determined by accountLang (the saved preference), active state by current lang
  const visible = accountLang === "en"
    ? [{ key:"en", label:"EN" }]
    : [{ key:"en", label:"EN" }, { key:accountLang, label:accountLang.toUpperCase() }];
  visible.forEach(l => {
    const btn = document.createElement("button");
    btn.dataset.lang = l.key;
    btn.textContent = l.label;
    btn.setAttribute("aria-pressed", l.key === lang ? "true" : "false");
    btn.addEventListener("click", () => switchDisplayLang(l.key));
    wrap.appendChild(btn);
  });
}

function renderAcctLangPicker(){
  const wrap = document.getElementById("acctLangPicker");
  if (!wrap) return;
  wrap.innerHTML = "";
  ALL_LANGS.forEach(l => {
    const btn = document.createElement("button");
    btn.className = "acct-lang-btn" + (l.key === accountLang ? " active" : "");
    btn.innerHTML = `<span class="acct-lang-code">${l.label}</span><span class="acct-lang-name">${l.name}</span>`;
    btn.addEventListener("click", () => saveAccountLang(l.key));
    wrap.appendChild(btn);
  });
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
document.getElementById("signOut").addEventListener("click", async () => {
  await supa.auth.signOut();
  window.location.replace("index.html");
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init(){
  const { data: { session } } = await supa.auth.getSession();
  if (!session){ window.location.replace("index.html"); return; }

  const userId = session.user.id;
  const [profRes, courseRes] = await Promise.all([
    supa.from("profiles").select("*").eq("id", userId).single(),
    supa.from("user_courses").select("*").eq("user_id", userId)
  ]);

  if (!profRes.data) {
    const pendingName = localStorage.getItem("lp:pending_name") || session.user.user_metadata?.name || "";
    const pendingLang = localStorage.getItem("lp:pending_lang") || session.user.user_metadata?.lang || "en";
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

  const savedLang = profile.lang || localStorage.getItem("lp:ui_lang");
  if (savedLang && TAPP[savedLang]){ lang = savedLang; accountLang = savedLang; }

  tr();
  renderStateBadge();
  renderHeaderLangs();
  renderAcctLangPicker();
  document.getElementById("shell").style.display = "grid";
  renderAll();
}

init();
