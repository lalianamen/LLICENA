/* LICENA — course player
   uiLang   = cabinet language (button labels, Prev/Next/Restart etc.)
   studyLang = question display mode: "en" | "en+ru" | "ru" | "es" */

const params   = new URLSearchParams(location.search);
const courseId = params.get("id") || "";

let uiLang    = localStorage.getItem("lp:ui_lang") || "en";
let studyLang = localStorage.getItem("lp:course_lang:" + courseId) || "en";

// Filled by loadCourseData() in initCourse — content is loaded on demand, only for
// the opened course (not every course's file on every page).
let QUESTIONS = [];
// id -> { q, opts, re } translation overlay for the user's language (empty in English).
let TR = {};

// Anti-sharing: bounce to login if this session's device isn't registered.
if (window.LICENA_devices) LICENA_devices.backstop(supa);

function loadScript(src){
  return new Promise(res => {
    const s = document.createElement("script");
    s.src = src;
    s.onload  = () => res(true);
    s.onerror = () => res(false);
    document.head.appendChild(s);
  });
}

// Load the English base (js/questions/<id>.js → COURSE_REGISTRY[id]) and, when the UI
// language is a non-English language the course provides, that language's translation
// overlay (js/questions/<id>.<lang>.js → COURSE_LANG[id][lang]). Bilingual = base + one
// overlay, so the page never loads more than two files no matter how many languages the
// course has in total. A missing base degrades to "coming soon".
async function loadCourseData(id){
  if (!id) return false;
  if (!(window.COURSE_REGISTRY && window.COURSE_REGISTRY[id])){
    if (!(await loadScript("js/questions/" + id + ".js"))) return false;
  }
  const langs = (courseMeta && courseMeta.langs) || ["en"];
  if (uiLang !== "en" && langs.includes(uiLang)){
    const have = window.COURSE_LANG && window.COURSE_LANG[id] && window.COURSE_LANG[id][uiLang];
    if (!have) await loadScript("js/questions/" + id + "." + uiLang + ".js");
  }
  return true;
}

// Build the id→translation lookup from the loaded overlay for the user's language.
function buildOverlay(){
  TR = {};
  const ov = window.COURSE_LANG && window.COURSE_LANG[courseId] && window.COURSE_LANG[courseId][uiLang];
  if (ov) for (const o of ov) TR[o.id] = o;
}

let courseMeta = null, courseState = "ca";
for (const cat of CATALOG){
  for (const sub of (cat.subs || [])){
    const found = (sub.courses || []).find(c => c.id === courseId);
    if (found){ courseMeta = found; courseState = cat.state || "ca"; break; }
  }
  if (courseMeta) break;
}

function ui(key){ return (TAPP[uiLang] && TAPP[uiLang][key]) || (TAPP.en[key]) || key; }
function esc(s){ const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

// ─── Study language ───────────────────────────────────────────────────────────
// The study-language switcher follows the USER'S interface language and only ever
// offers that language plus English. A Russian user on an EN+RU course sees
// EN / EN·RU / RU; a Spanish user sees EN / EN·ES / ES (or just EN when the course
// has no Spanish yet) and is NEVER shown Russian, and vice-versa. Courses without the
// user's language (or an English UI) show plain EN with no switcher.
const LANG_LABEL = { ru:"RU", es:"ES", hy:"HY", ar:"AR", zh:"ZH", ko:"KO" };
const LANG_FIELD = { ru:"r",  es:"s",  hy:"hy", ar:"ar", zh:"zh", ko:"ko" };

function buildStudyLangModes(){
  if (!courseMeta) return [{ key:"en", label:"EN" }];
  const avail = courseMeta.langs || ["en"];
  if (uiLang === "en" || !avail.includes(uiLang)) return [{ key:"en", label:"EN" }];
  const ll = LANG_LABEL[uiLang] || uiLang.toUpperCase();
  return [
    { key:"en",           label:"EN" },
    { key:"en+" + uiLang, label:`EN·${ll}` },
    { key:uiLang,         label:ll }
  ];
}

// The secondary study language a mode key carries ("en"→null, "ru"→"ru", "en+ru"→"ru").
function modeSecondary(key){ return key === "en" ? null : key.replace("en+", ""); }

// Localized display label for a section (the English q.sec stays the data key).
function secLabel(sec){
  const m = (window.SECTION_I18N || {})[sec];
  return (m && m[uiLang]) || sec;
}

function buildStudyLangSwitcher(){
  const wrap = document.getElementById("studyLangWrap");
  wrap.innerHTML = "";
  const modes = buildStudyLangModes();

  // Reconcile the stored study language BEFORE deciding whether to show a switcher,
  // so a leftover value can never keep rendering the wrong language. Reset it when it
  // isn't valid for this course, OR when its secondary language isn't the active UI
  // language (e.g. a Russian selection lingering after switching the UI to Spanish).
  // Falls back to EN·<uiLang> when the course offers it, otherwise plain EN.
  const keys = modes.map(m => m.key);
  const sec  = modeSecondary(studyLang);
  if (!keys.includes(studyLang) || (sec && sec !== uiLang)){
    const pref = "en+" + uiLang;
    studyLang = keys.includes(pref) ? pref : "en";
    localStorage.setItem("lp:course_lang:" + courseId, studyLang);
  }

  if (modes.length <= 1) return;

  const label = document.createElement("span");
  label.className = "study-lang-label";
  label.textContent = ui("courseStudyIn");
  wrap.appendChild(label);

  const seg = document.createElement("div");
  seg.className = "study-lang-seg";
  modes.forEach(m => {
    const btn = document.createElement("button");
    btn.textContent = m.label;
    btn.setAttribute("aria-pressed", m.key === studyLang ? "true" : "false");
    btn.addEventListener("click", () => {
      studyLang = m.key;
      localStorage.setItem("lp:course_lang:" + courseId, studyLang);
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      buildBlockCards();
      renderQ();
    });
    seg.appendChild(btn);
  });
  wrap.appendChild(seg);
}

// ─── Question text helpers ────────────────────────────────────────────────────
// Monolingual reads come from the base (English q.*) or the overlay (TR by id);
// bilingual rendering pulls both sides directly in renderQ.
const isBilingual = () => studyLang.includes("+");

function getQText(q){
  if (studyLang === "en") return q.q;
  const t = TR[q.id];
  return (t && t.q) || q.q;
}
function getOpts(q){
  if (studyLang === "en") return q.opts;
  const t = TR[q.id];
  return (t && t.opts && t.opts.length) ? t.opts : q.opts;
}
function getExplanation(q){
  if (studyLang === "en") return q.re || "";
  const t = TR[q.id];
  return (t && t.re) || q.re || "";
}

// ─── Progress persistence ─────────────────────────────────────────────────────
// userAnswers keyed by question ID: { [qId]: pickedOptionIndex }
let userAnswers = {};

function loadAnswers(){
  try { return JSON.parse(localStorage.getItem("lp:answers:" + courseId) || "{}"); } catch(e){ return {}; }
}
function saveAnswers(){
  localStorage.setItem("lp:answers:" + courseId, JSON.stringify(userAnswers));
}
function resetAllProgress(){
  if (!confirm(ui("courseResetConfirm"))) return;
  userAnswers = {};
  localStorage.removeItem("lp:answers:" + courseId);
  resetOrder(); renderQ(); buildBlockCards();
}

// ─── Blocks ───────────────────────────────────────────────────────────────────
let activeBlock = null;

function hasBlocks(){ return QUESTIONS.some(q => q.block !== undefined); }

function blockProgress(blockN){
  const pool = QUESTIONS.filter(q => q.block === blockN);
  const answered = pool.filter(q => userAnswers[q.id] !== undefined).length;
  const correct  = pool.filter(q => userAnswers[q.id] === q.correct).length;
  return { total: pool.length, answered, correct };
}

function buildBlockCards(){
  const wrap = document.getElementById("blockCards");
  if (!wrap) return;
  if (!hasBlocks()){ wrap.style.display = "none"; return; }

  const nums = [...new Set(QUESTIONS.map(q => q.block))].filter(n => n !== undefined).sort((a,b) => a-b);
  if (activeBlock === null) activeBlock = nums[0];
  const meta = (window.COURSE_BLOCKS || {})[courseId] || [];
  const sl = m => (m && (m[isBilingual() ? "en" : studyLang] || m.en)) || "";

  wrap.innerHTML = "";
  nums.forEach(n => {
    const m = meta.find(x => x.n === n);
    const { total, correct } = blockProgress(n);
    const pct = total ? Math.round(correct / total * 100) : 0;

    const card = document.createElement("button");
    card.className = "block-card" + (n === activeBlock ? " active" : "");
    card.innerHTML = `
      <span class="block-roman">${m ? m.roman : n}</span>
      <span class="block-txt">
        <span class="block-title">${m ? sl(m.title) : ("Block " + n)}</span>
        <span class="block-sub">${m ? sl(m.sub) : ""}</span>
        <span class="block-prog">
          <span class="block-prog-bar"><span style="width:${pct}%"></span></span>
          <span class="block-prog-num">${correct}/${total}</span>
        </span>
      </span>`;
    card.addEventListener("click", () => {
      activeBlock = n;
      activeSection = null;
      wrap.querySelectorAll(".block-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      buildSections(); resetOrder(); renderQ();
    });
    wrap.appendChild(card);
  });
  wrap.style.display = "grid";
}

// ─── Sections ─────────────────────────────────────────────────────────────────
let activeSection = null;

function inActiveBlock(q){ return activeBlock === null || q.block === activeBlock; }

function buildSections(){
  const wrap = document.getElementById("sideSections");
  wrap.innerHTML = "";
  const secs = [...new Set(QUESTIONS.filter(inActiveBlock).map(q => q.sec))].filter(Boolean);
  if (!secs.length) return;

  const allLbl = ui("courseAllSections");
  const all = document.createElement("button");
  all.className = "sec-btn active";
  all.textContent = allLbl;
  all.addEventListener("click", () => {
    activeSection = null; resetOrder(); renderQ();
    wrap.querySelectorAll(".sec-btn").forEach(b => b.classList.remove("active"));
    all.classList.add("active");
  });
  wrap.appendChild(all);

  secs.forEach(sec => {
    const btn = document.createElement("button");
    btn.className = "sec-btn";
    btn.textContent = secLabel(sec);
    btn.addEventListener("click", () => {
      activeSection = sec; resetOrder(); renderQ();
      wrap.querySelectorAll(".sec-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
    wrap.appendChild(btn);
  });
}

function buildSideResources(){
  const wrap = document.getElementById("sideResources");
  if (!wrap) return;
  const res = (typeof COURSE_RESOURCES !== "undefined") ? COURSE_RESOURCES[courseId] : null;
  if (!res || !res.links || !res.links.length){ wrap.style.display = "none"; return; }
  const lang = (uiLang !== "en" && TAPP[uiLang]) ? uiLang : "en";
  const title = res.title[lang] || res.title.en;
  let html = `<div class="side-res-title">${title}</div>`;
  res.links.forEach(lnk => {
    const label = lnk[lang] || lnk.en;
    html += `<a class="side-res-link" href="${lnk.url}" target="_blank" rel="noopener"><span class="res-icon">${lnk.icon}</span>${label}</a>`;
  });
  wrap.innerHTML = html;
  wrap.style.display = "flex";
}

// ─── Order / progress ─────────────────────────────────────────────────────────
let order = [], filterWrong = false;

function resetOrder(){
  let pool = QUESTIONS.map((_, i) => i);
  if (activeBlock !== null) pool = pool.filter(i => QUESTIONS[i].block === activeBlock);
  if (activeSection) pool = pool.filter(i => QUESTIONS[i].sec === activeSection);
  if (filterWrong) pool = pool.filter(i => {
    const q = QUESTIONS[i];
    const picked = userAnswers[q.id];
    return picked === undefined || picked !== q.correct;
  });
  pool = pool.sort(() => Math.random() - .5);
  order = pool;
  currentQ = 0;
  updateProgress();
}

let currentQ = 0;

function updateProgress(){
  const total = order.length;
  const done  = order.filter(i => userAnswers[QUESTIONS[i].id] !== undefined).length;
  document.getElementById("progCount").textContent = done;
  document.getElementById("progTotal").textContent = total;
  document.getElementById("progFill").style.width = total ? (done / total * 100) + "%" : "0%";
  updateFilterWrongBtn();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderQ(){
  const qCard       = document.getElementById("qCard");
  const resultsCard = document.getElementById("resultsCard");
  const cs          = document.getElementById("comingSoon");

  if (!QUESTIONS.length){
    qCard.style.display = "none"; resultsCard.style.display = "none";
    cs.style.display = "block";
    document.getElementById("csTitle").textContent = courseMeta ? (courseMeta.name[uiLang] || courseMeta.name.en) : courseId;
    document.getElementById("csText").textContent = ui("courseSoon");
    return;
  }

  if (currentQ >= order.length){ showResults(); return; }

  cs.style.display = "none"; resultsCard.style.display = "none";
  qCard.style.display = "block";

  const qi  = order[currentQ];
  const q   = QUESTIONS[qi];
  const picked     = userAnswers[q.id];
  const isAnswered = picked !== undefined;
  const bilingual  = isBilingual();

  document.getElementById("qNum").textContent = (currentQ + 1) + " / " + order.length;
  document.getElementById("qSection").textContent = secLabel(q.sec);

  // Question text
  const qTextEl = document.getElementById("qText");
  if (bilingual){
    const t = TR[q.id];
    const qTrans = t && t.q;
    qTextEl.innerHTML = `<span class="lx-en">${esc(q.q)}</span>${qTrans ? `<span class="lx-ru">${esc(qTrans)}</span>` : ""}`;
  } else {
    qTextEl.textContent = getQText(q);
  }

  // Options
  const optsWrap = document.getElementById("qOpts");
  optsWrap.innerHTML = "";
  const enOpts = q.opts;
  const localOpts = getOpts(q);
  enOpts.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    if (bilingual){
      const t = TR[q.id];
      const transOpts = t && t.opts;
      if (transOpts && transOpts[i]){
        btn.innerHTML = `<span class="lx-en">${esc(enOpts[i])}</span><span class="lx-ru">${esc(transOpts[i])}</span>`;
      } else {
        btn.textContent = enOpts[i];
      }
    } else {
      btn.textContent = localOpts[i] !== undefined ? localOpts[i] : enOpts[i];
    }
    if (isAnswered){
      if (i === q.correct) btn.classList.add("correct");
      else if (i === picked) btn.classList.add("wrong");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => pickAnswer(i));
    }
    optsWrap.appendChild(btn);
  });

  // Explanation
  const expEl = document.getElementById("qExplanation");
  if (isAnswered){
    if (bilingual){
      const t = TR[q.id];
      const rTrans = t && t.re;
      if (q.re || rTrans){
        expEl.innerHTML = (q.re ? `<div class="lx-en">${esc(q.re)}</div>` : "") +
                          (rTrans ? `<div class="lx-ru">${esc(rTrans)}</div>` : "");
        expEl.style.display = "block";
      } else expEl.style.display = "none";
    } else {
      const exp = getExplanation(q);
      if (exp){ expEl.textContent = exp; expEl.style.display = "block"; }
      else expEl.style.display = "none";
    }
  } else {
    expEl.style.display = "none";
  }

  // Nav buttons
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  prevBtn.disabled = currentQ === 0;
  prevBtn.textContent = ui("coursePrev");
  nextBtn.textContent = currentQ === order.length - 1 ? ui("courseFinish") : ui("courseNext");
}

function pickAnswer(i){
  const q = QUESTIONS[order[currentQ]];
  if (userAnswers[q.id] !== undefined) return;
  userAnswers[q.id] = i;
  saveAnswers();
  updateProgress();
  buildBlockCards();
  renderQ();
}

function showResults(){
  document.getElementById("qCard").style.display = "none";
  document.getElementById("comingSoon").style.display = "none";
  const card = document.getElementById("resultsCard"); card.style.display = "block";
  const total   = order.length;
  const correct = order.filter(i => userAnswers[QUESTIONS[i].id] === QUESTIONS[i].correct).length;
  const pct  = total ? Math.round(correct / total * 100) : 0;
  const pass = pct >= 70;
  document.getElementById("resultScore").textContent = pct + "%";
  document.getElementById("resultLabel").textContent = pass ? ui("coursePassed") : ui("courseFail");
  document.getElementById("resultLabel").className = "result-label " + (pass ? "pass" : "fail");
  document.getElementById("resultStats").textContent = `${ui("courseCorrect")} ${correct} ${ui("courseOf")} ${total}`;
  document.getElementById("retryBtn").textContent = ui("courseRetry");
}

// ─── Static UI labels ─────────────────────────────────────────────────────────
function wrongCount(){
  return QUESTIONS.filter(q => {
    const picked = userAnswers[q.id];
    return picked !== undefined && picked !== q.correct;
  }).length;
}

function updateFilterWrongBtn(){
  const btn = document.getElementById("filterWrongBtn");
  if (!btn) return;
  const wc = wrongCount();
  const label = (filterWrong ? ui("courseWrongOn") : ui("courseWrongOff")) + ` (${wc})`;
  btn.textContent = label;
  btn.classList.toggle("active", filterWrong);
  btn.disabled = !filterWrong && wc === 0;
}

function applyUiLabels(){
  document.getElementById("backLabel").textContent = ui("navMyTests");
  document.getElementById("restartLabel").textContent = ui("courseRestart");
  document.getElementById("resetProgressLabel").textContent = ui("courseResetProgress");
  updateFilterWrongBtn();
}

// ─── Events ───────────────────────────────────────────────────────────────────
document.getElementById("prevBtn").addEventListener("click", () => { if (currentQ > 0){ currentQ--; renderQ(); } });
document.getElementById("nextBtn").addEventListener("click", () => { currentQ++; renderQ(); });
document.getElementById("retryBtn").addEventListener("click", () => { resetOrder(); renderQ(); });
document.getElementById("restartBtn").addEventListener("click", () => { resetOrder(); renderQ(); });
document.getElementById("csBack").addEventListener("click", () => history.back());
document.getElementById("backBtn").addEventListener("click", () => { window.location.href = "app.html"; });
document.getElementById("filterWrongBtn").addEventListener("click", () => {
  filterWrong = !filterWrong;
  updateFilterWrongBtn();
  resetOrder(); renderQ();
});
document.getElementById("resetProgressBtn").addEventListener("click", resetAllProgress);

// ─── Guide (article) rendering ────────────────────────────────────────────────
// Guide-type courses carry prose, not questions. Content lives in
// js/guides/<id>.js → COURSE_GUIDE[id] = { en:[{t,h}], es:[...], ru:[...] }, where
// t = section title (plain text) and h = section body (trusted authored HTML).
let guideLang = "en";

function loadGuideData(id){
  if (window.COURSE_GUIDE && window.COURSE_GUIDE[id]) return Promise.resolve(true);
  return loadScript("js/guides/" + id + ".js");
}

function guideAvailLangs(){
  const g = (window.COURSE_GUIDE || {})[courseId] || {};
  return ["en","es","ru","hy","ar","zh","ko"].filter(l => Array.isArray(g[l]) && g[l].length);
}

function buildGuideLangSwitcher(){
  const wrap = document.getElementById("studyLangWrap");
  wrap.innerHTML = "";
  const langs = guideAvailLangs();
  if (langs.length <= 1) return;
  const seg = document.createElement("div");
  seg.className = "study-lang-seg";
  langs.forEach(l => {
    const btn = document.createElement("button");
    btn.textContent = LANG_LABEL[l] || l.toUpperCase();
    btn.setAttribute("aria-pressed", l === guideLang ? "true" : "false");
    btn.addEventListener("click", () => {
      guideLang = l;
      localStorage.setItem("lp:course_lang:" + courseId, guideLang);
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      renderGuide();
    });
    seg.appendChild(btn);
  });
  wrap.appendChild(seg);
}

function renderGuide(){
  const g    = (window.COURSE_GUIDE || {})[courseId] || {};
  const secs = (g[guideLang] && g[guideLang].length) ? g[guideLang] : (g.en || []);
  const view = document.getElementById("guideView");
  const cs   = document.getElementById("comingSoon");
  if (!secs.length){
    view.style.display = "none";
    cs.style.display = "block";
    document.getElementById("csTitle").textContent = courseMeta ? (courseMeta.name[uiLang] || courseMeta.name.en) : courseId;
    document.getElementById("csText").textContent = ui("courseSoon");
    return;
  }
  cs.style.display = "none";
  const toc  = secs.map((s, i) => `<a class="guide-toc-link" href="#gs-${i}">${esc(s.t)}</a>`).join("");
  const body = secs.map((s, i) => `<section class="guide-sec" id="gs-${i}"><h2>${esc(s.t)}</h2>${s.h}</section>`).join("");
  view.innerHTML = `<nav class="guide-toc">${toc}</nav><div class="guide-body">${body}</div>`;
  view.style.display = "block";
}

async function initGuideView(){
  await loadGuideData(courseId);
  const langs  = guideAvailLangs();
  const stored = localStorage.getItem("lp:course_lang:" + courseId);
  guideLang = (stored && langs.includes(stored)) ? stored
            : (langs.includes(uiLang) ? uiLang : (langs[0] || "en"));

  const name = courseMeta ? (courseMeta.name[uiLang] || courseMeta.name.en) : courseId;
  document.title = "LICENA — " + name;
  document.getElementById("courseTitle").textContent = name;
  document.getElementById("backLabel").textContent = ui("navMyTests");

  const st   = (typeof STATES !== "undefined") ? STATES.find(s => s.id === courseState) : null;
  const pill = document.getElementById("courseStatePill");
  if (st && pill) pill.textContent = `${st.flag} ${st.abbr}`;

  // Hide the quiz-only UI and switch the shell to a single, centered column.
  const side = document.querySelector(".course-side");
  if (side) side.style.display = "none";
  ["blockCards", "qCard", "resultsCard"].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = "none";
  });
  const shell = document.getElementById("courseShell");
  shell.classList.add("guide-mode");

  buildGuideLangSwitcher();
  renderGuide();
  shell.style.display = "grid";
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initCourse(){
  const { data: { session } } = await supa.auth.getSession();
  if (!session){ window.location.replace("index.html"); return; }

  const userId = session.user.id;
  const { data: owned } = await supa.from("user_courses").select("course_id").eq("user_id", userId).eq("course_id", courseId).single();
  if (!owned){ window.location.replace("app.html"); return; }

  // Resolve the account language first — it decides which translation overlay to load.
  const { data: prof } = await supa.from("profiles").select("lang").eq("id", userId).single();
  if (prof && prof.lang && TAPP[prof.lang]){
    uiLang = prof.lang;
    localStorage.setItem("lp:ui_lang", uiLang);
  }

  // Guide-type courses render an article instead of a quiz.
  if (courseMeta && courseMeta.type === "guide"){ await initGuideView(); return; }

  // Load this course's English base + the user-language overlay (only after ownership).
  await loadCourseData(courseId);
  QUESTIONS = (window.COURSE_REGISTRY && window.COURSE_REGISTRY[courseId]) || [];
  buildOverlay();

  // Default studyLang: if uiLang course has translations, default to bilingual (en+uiLang)
  if (!localStorage.getItem("lp:course_lang:" + courseId)){
    const modes = buildStudyLangModes();
    const preferred = modes.find(m => m.key === "en+" + uiLang) || modes[0];
    studyLang = preferred ? preferred.key : "en";
    localStorage.setItem("lp:course_lang:" + courseId, studyLang);
  }

  // Load persisted answers
  userAnswers = loadAnswers();

  const name = courseMeta ? (courseMeta.name[uiLang] || courseMeta.name.en) : courseId;
  document.title = "LICENA — " + name;
  document.getElementById("courseTitle").textContent = name;

  // State pill
  const st = (typeof STATES !== "undefined") ? STATES.find(s => s.id === courseState) : null;
  const pill = document.getElementById("courseStatePill");
  if (st && pill) pill.textContent = `${st.flag} ${st.abbr}`;

  applyUiLabels();
  buildStudyLangSwitcher();
  buildBlockCards();
  buildSections();
  buildSideResources();
  resetOrder();

  document.getElementById("courseShell").style.display = "grid";
  renderQ();
}

initCourse();
