/* LICENA — cabinet, Supabase-backed */

let lang = "en", profile = null, courses = [], pendingAdd = null, pendingAddLang = null;
let selectedState = localStorage.getItem("lp:state") || "ca";

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
function makeSubEl(sub, bodyBuilder){
  const subEl = document.createElement("div"); subEl.className = "my-sub";
  const hd = document.createElement("div"); hd.className = "my-sub-hd";
  hd.innerHTML = `<span>${sub.name[lang] || sub.name.en}</span><span class="sub-chevron">▾</span>`;
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
          (sub.courses || []).forEach(course => {
            const isOwned = owned.has(course.id);
            const badge = course.type === "guide" ? d.guideBadge : d.examBadge;
            const langStr = course.langs.map(l => l.toUpperCase()).join(" · ");
            const row = document.createElement("div"); row.className = "course-row";
            row.innerHTML = `
              <div class="course-info">
                <span class="course-name">${course.name[lang] || course.name.en}</span>
                <span class="course-meta"><span class="type-badge type-${course.type}">${badge}</span>${statePill()}<span class="lang-pill">${langStr}</span></span>
              </div>
              <div class="course-actions">
                <button class="btn-sm${isOwned ? " btn-added" : ""}"${isOwned ? " disabled" : ""}>${isOwned ? d.added : d.addBtn}</button>
              </div>`;
            if (!isOwned) row.querySelector("button").addEventListener("click", () => openLangPicker(course));
            body.appendChild(row);

            // Honest-chances block (before purchase, for courses that have it)
            const hc = (window.HONEST_CHANCES || {})[course.id];
            if (hc){
              const l = hc[lang] ? lang : (hc.en ? "en" : Object.keys(hc)[0]);
              const titles = window.HONEST_CHANCES_TITLE || {};
              const det = document.createElement("details");
              det.className = "hc-catalog";
              det.innerHTML = `<summary>${titles[l] || titles.en || "Honest chances"}</summary><div class="hc-catalog-body">${hc[l]}</div>`;
              body.appendChild(det);
            }
          });
        }));
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

// ─── Lang picker ──────────────────────────────────────────────────────────────
// Course study-lang modes: for EN+RU courses show EN / EN·RU / RU
function courseLangModes(course){
  const avail = course.langs;
  if (avail.length <= 1) return avail.map(l => ({ key:l, label:({en:"English",es:"Español",ru:"Русский",vi:"Tiếng Việt"})[l]||l.toUpperCase() }));
  const modes = [];
  modes.push({ key:"en", label:"English" });
  if (avail.includes("ru")) modes.push({ key:"en+ru", label:"EN · RU (bilingual)" });
  avail.filter(l => l !== "en").forEach(l => {
    modes.push({ key:l, label:({es:"Español",ru:"Русский",vi:"Tiếng Việt"})[l]||l.toUpperCase() });
  });
  return modes;
}

function openLangPicker(course){
  pendingAdd = course;
  const d = TAPP[lang];
  document.getElementById("langModalTitle").textContent = course.name[lang] || course.name.en;
  document.getElementById("langModalSub").textContent = d.chooseLang;
  const choices = document.getElementById("langChoices");
  choices.innerHTML = "";
  courseLangModes(course).forEach(m => {
    const btn = document.createElement("button");
    btn.className = "lang-choice-btn" + (m.key === lang || (m.key === "en+ru" && lang === "ru") ? " preferred" : "");
    btn.textContent = m.label;
    btn.addEventListener("click", () => openPayModal(m.key));
    choices.appendChild(btn);
  });
  document.getElementById("langModal").style.display = "grid";
}

// ─── Payment modal (beta: free) ───────────────────────────────────────────────
function openPayModal(chosenLang){
  pendingAddLang = chosenLang;
  document.getElementById("langModal").style.display = "none";
  const course = pendingAdd, d = TAPP[lang];
  const labels = { en:"English", es:"Español", ru:"Русский", vi:"Tiếng Việt" };
  document.getElementById("payModalTitle").textContent = course.name[lang] || course.name.en;
  document.getElementById("payCourseInfo").innerHTML =
    `<div class="pay-lang-chosen">${labels[chosenLang] || chosenLang.toUpperCase()}</div>`;
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

document.getElementById("langCancel").addEventListener("click", () => {
  document.getElementById("langModal").style.display = "none"; pendingAdd = null;
});

document.getElementById("payCancel").addEventListener("click", () => {
  document.getElementById("payModal").style.display = "none"; pendingAddLang = null;
});

document.getElementById("payConfirm").addEventListener("click", async () => {
  const course = pendingAdd, chosenLang = pendingAddLang;
  document.getElementById("payModal").style.display = "none";
  pendingAdd = null; pendingAddLang = null;
  if (!course) return;
  localStorage.setItem("lp:course_lang:" + course.id, chosenLang);
  const { data: { user } } = await supa.auth.getUser();
  // Upsert: re-adding a removed course (or new) sets status back to active.
  const { data, error } = await supa.from("user_courses")
    .upsert({ user_id: user.id, course_id: course.id, status: "active" }, { onConflict: "user_id,course_id" })
    .select().single();
  if (!error && data){
    const idx = courses.findIndex(c => c.course_id === course.id);
    if (idx >= 0) courses[idx] = data; else courses.push(data);
    renderMyTests(); renderCatalog();
  }
});

// ─── Nav ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".side button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".side button").forEach(x => x.setAttribute("aria-current", x === b ? "true" : "false"));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("on", p.dataset.panel === b.dataset.panel));
}));

// ─── Language toggle ──────────────────────────────────────────────────────────
document.querySelectorAll(".app-langs button").forEach(b => b.addEventListener("click", async () => {
  lang = b.dataset.lang;
  document.querySelectorAll(".app-langs button").forEach(x => x.setAttribute("aria-pressed", x === b));
  tr(); renderStateBadge(); renderAll();
  const { data: { user } } = await supa.auth.getUser();
  if (user) await supa.from("profiles").update({ lang }).eq("id", user.id);
}));

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

  if (profile.lang && TAPP[profile.lang]){
    lang = profile.lang;
    document.querySelectorAll(".app-langs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));
  }

  tr();
  renderStateBadge();
  document.getElementById("shell").style.display = "grid";
  renderAll();
}

init();
