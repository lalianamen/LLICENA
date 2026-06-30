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
// ui() with {placeholder} substitution, e.g. uiFmt("examLast", {pct:68, verdict:"…"})
function uiFmt(key, vars){ return ui(key).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars) ? vars[k] : "{" + k + "}"); }
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
      // Keep an open exam runner/review in sync with the study language.
      if (exam && !exam.submitted && document.getElementById("examRun").style.display !== "none") renderExamQ();
      else if (exam && document.getElementById("examReview").style.display !== "none") renderExamReview();
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
    const { total, answered, correct } = blockProgress(n);
    const pct = total ? Math.round(correct / total * 100) : 0;
    const tip = `${ui("blockTipAnswered")} ${answered}/${total} · ${ui("blockTipCorrect")} ${correct}`;

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
      </span>
      <span class="block-tip" role="tooltip">${esc(tip)}</span>`;
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
  updateOverallProgress();
}

// Course-WIDE progress (every question in the bank, never filtered by the active
// block/section) — a distinct indicator from the sidebar box above.
function updateOverallProgress(){
  const wrap = document.getElementById("overallProg");
  if (!wrap) return;
  const total   = QUESTIONS.length;
  if (!total){ wrap.style.display = "none"; return; }
  const correct = QUESTIONS.filter(q => userAnswers[q.id] === q.correct).length;
  const pct = Math.round(correct / total * 100);
  document.getElementById("opTitle").textContent   = ui("overallProg");
  document.getElementById("opWord").textContent    = ui("overallCorrect");
  document.getElementById("opCorrect").textContent = correct;
  document.getElementById("opTotal").textContent   = total;
  document.getElementById("opFill").style.width    = pct + "%";
  wrap.style.display = "block";
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

// ─── Final Exam ─────────────────────────────────────────────────────────────────
// A timed, exam-style test for big banks only. Picks 120 random questions, runs a
// wall-clock countdown to endsAt (closing the tab never pauses it), gives NO instant
// feedback, allows free navigation + a jump grid, then grades once on submit/timeout.
// Persisted so an interrupted attempt resumes the SAME set with the SAME timer.
const EXAM_COUNT     = 120;
const EXAM_PASS_PCT  = 75;
const EXAM_MIN_BANK  = 120;                 // only show the exam for banks this big
const EXAM_MINUTES   = { DEFAULT: 210 };    // per-course official times (owner fills later)

function examDurationMs(){
  const m = (courseId in EXAM_MINUTES) ? EXAM_MINUTES[courseId] : EXAM_MINUTES.DEFAULT;
  return m * 60 * 1000;
}

const examKey     = () => "lp:final:" + courseId;
const examLastKey = () => "lp:final_last:" + courseId;

let exam = null;          // active attempt: { qids, startedAt, endsAt, answers, flags, submitted }
let examCur = 0;          // index into exam.qids
let examTimerId = null;   // setInterval handle for the countdown
const examHasBank = () => QUESTIONS.length >= EXAM_MIN_BANK;

function loadExam(){
  try { return JSON.parse(localStorage.getItem(examKey()) || "null"); } catch(e){ return null; }
}
function saveExam(){ if (exam) localStorage.setItem(examKey(), JSON.stringify(exam)); }
function loadExamLast(){
  try { return JSON.parse(localStorage.getItem(examLastKey()) || "null"); } catch(e){ return null; }
}

// Build a fresh attempt: EXAM_COUNT unique random ids from the bank.
function buildExamAttempt(){
  const ids = QUESTIONS.map(q => q.id);
  for (let i = ids.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const qids = ids.slice(0, EXAM_COUNT);
  const startedAt = Date.now();
  return { qids, startedAt, endsAt: startedAt + examDurationMs(), answers:{}, flags:{}, submitted:false };
}

// id → question (exam ids reference the same QUESTIONS bank).
const examQ = id => QUESTIONS.find(q => q.id === id);

// ── Exam-entry card (near the block cards) + last-result line ──────────────────
function buildExamEntry(){
  const entry = document.getElementById("examEntry");
  if (!entry) return;
  if (!examHasBank()){ entry.style.display = "none"; return; }
  document.getElementById("eeTitle").textContent = ui("examTitle");
  document.getElementById("eeSub").textContent   = ui("examSub");
  document.getElementById("examStartBtn").textContent = ui("examStart");
  updateExamLastLine();
  entry.style.display = "flex";
}

function updateExamLastLine(){
  const el = document.getElementById("eeLast");
  if (!el) return;
  const last = loadExamLast();
  if (!last){ el.textContent = ui("examLastNever"); el.className = "ee-last"; return; }
  const verdict = last.pass ? ui("examLastPassed") : ui("examLastFailed");
  el.textContent = uiFmt("examLast", { pct: last.pct, verdict });
  el.className = "ee-last " + (last.pass ? "pass" : "fail");
}

// ── Show / hide the practice UI vs the exam shell ─────────────────────────────
function showExamShell(on){
  const shell = document.getElementById("examShell");
  ["overallProg","examEntry","blockCards","qCard","resultsCard","comingSoon","guideView"].forEach(id => {
    const el = document.getElementById(id); if (el && on) el.style.display = "none";
  });
  const side = document.querySelector(".course-side");
  if (side) side.style.display = on ? "none" : "";
  document.getElementById("courseShell").classList.toggle("exam-mode", on);
  shell.style.display = on ? "block" : "none";
  if (!on){
    if (examTimerId){ clearInterval(examTimerId); examTimerId = null; }
    // Restore the normal player view.
    document.getElementById("examEntry").style.display = examHasBank() ? "flex" : "none";
    updateOverallProgress();
    buildBlockCards();
    renderQ();
  }
}

// ── Warning modal (rules) ─────────────────────────────────────────────────────
function openExamWarn(){
  const ul = document.getElementById("ewRules");
  ul.innerHTML = "";
  ["examRule1","examRule2","examRule3","examRule4","examRule5"].forEach(k => {
    const li = document.createElement("li"); li.textContent = ui(k); ul.appendChild(li);
  });
  document.getElementById("ewTitle").textContent  = ui("examWarnTitle");
  document.getElementById("ewIntro").textContent  = ui("examWarnIntro");
  document.getElementById("examWarnStart").textContent  = ui("examWarnStart");
  document.getElementById("examWarnCancel").textContent = ui("examWarnCancel");
  document.getElementById("examWarnModal").style.display = "grid";
}
function closeExamWarn(){ document.getElementById("examWarnModal").style.display = "none"; }

// ── Start / resume ────────────────────────────────────────────────────────────
function startExam(){
  closeExamWarn();
  examPrevResult = loadExamLast();   // baseline the result comparison against the last attempt
  exam = buildExamAttempt();
  examCur = 0;
  saveExam();
  enterExamRun();
}

// Resume an in-progress attempt (or finalize it as a timeout if the clock ran out
// while the tab was closed). Never reshuffles or restarts an active attempt.
function resumeExamIfAny(){
  const saved = loadExam();
  if (!saved || saved.submitted) return false;
  exam = saved;
  if (!exam.flags) exam.flags = {};
  examCur = 0;
  examPrevResult = loadExamLast();   // compare a resumed attempt against the last stored result
  if (Date.now() >= exam.endsAt){ gradeExam(true); return true; }  // timed out while away → fail
  enterExamRun();
  return true;
}

function enterExamRun(){
  showExamShell(true);
  document.getElementById("examRun").style.display = "block";
  document.getElementById("examResultCard").style.display = "none";
  document.getElementById("examReview").style.display = "none";
  // Static labels
  document.getElementById("examQuitLabel").textContent  = ui("examQuit");
  document.getElementById("examGridHead").textContent   = ui("examGridHead");
  document.getElementById("examSubmitBtn").textContent  = ui("examSubmit");
  document.getElementById("examPrevBtn").textContent    = ui("coursePrev");
  document.getElementById("examNextBtn").textContent    = ui("courseNext");
  buildExamGridLegend();
  renderExamQ();
  buildExamGrid();
  startExamTimer();
}

// ── Countdown timer (wall-clock to endsAt) ────────────────────────────────────
function fmtClock(ms){
  if (ms < 0) ms = 0;
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}
function tickExamTimer(){
  if (!exam) return;
  const left = exam.endsAt - Date.now();
  const el = document.getElementById("examTimer");
  document.getElementById("examTimerVal").textContent = fmtClock(left);
  el.classList.toggle("low", left <= 10 * 60 * 1000);   // last 10 min: visual urgency
  if (left <= 0){ gradeExam(true); }                    // time's up → auto-submit as fail
}
function startExamTimer(){
  if (examTimerId) clearInterval(examTimerId);
  tickExamTimer();
  examTimerId = setInterval(tickExamTimer, 1000);
}

// ── Runner render (NO feedback — just record + highlight the pick) ─────────────
function renderExamQ(){
  if (!exam) return;
  const id = exam.qids[examCur];
  const q  = examQ(id);
  if (!q) return;
  const picked    = exam.answers[id];
  const bilingual = isBilingual();

  document.getElementById("examQNum").textContent = (examCur + 1) + " / " + exam.qids.length;
  updateExamAnswered();

  // Flag toggle state
  const flagBtn = document.getElementById("examFlagBtn");
  const flagged = !!exam.flags[id];
  flagBtn.setAttribute("aria-pressed", flagged ? "true" : "false");
  flagBtn.classList.toggle("on", flagged);
  document.getElementById("examFlagLabel").textContent = flagged ? ui("examFlagged") : ui("examFlag");

  // Question text (reuse bilingual stacking)
  const qTextEl = document.getElementById("examQText");
  if (bilingual){
    const t = TR[q.id]; const qTrans = t && t.q;
    qTextEl.innerHTML = `<span class="lx-en">${esc(q.q)}</span>${qTrans ? `<span class="lx-ru">${esc(qTrans)}</span>` : ""}`;
  } else {
    qTextEl.textContent = getQText(q);
  }

  // Options — selectable + highlighted, changeable, never revealing correctness.
  const optsWrap = document.getElementById("examQOpts");
  optsWrap.innerHTML = "";
  const enOpts = q.opts;
  const localOpts = getOpts(q);
  enOpts.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn" + (picked === i ? " picked" : "");
    if (bilingual){
      const t = TR[q.id]; const transOpts = t && t.opts;
      if (transOpts && transOpts[i]) btn.innerHTML = `<span class="lx-en">${esc(enOpts[i])}</span><span class="lx-ru">${esc(transOpts[i])}</span>`;
      else btn.textContent = enOpts[i];
    } else {
      btn.textContent = localOpts[i] !== undefined ? localOpts[i] : enOpts[i];
    }
    btn.addEventListener("click", () => pickExamAnswer(i));
    optsWrap.appendChild(btn);
  });

  document.getElementById("examPrevBtn").disabled = examCur === 0;
  const nextBtn = document.getElementById("examNextBtn");
  nextBtn.disabled = examCur === exam.qids.length - 1;
}

function pickExamAnswer(i){
  if (!exam || exam.submitted) return;
  const id = exam.qids[examCur];
  exam.answers[id] = i;
  saveExam();
  // Re-highlight without rebuilding the whole question.
  const opts = document.getElementById("examQOpts").querySelectorAll(".opt-btn");
  opts.forEach((b, idx) => b.classList.toggle("picked", idx === i));
  updateExamAnswered();
  markExamGridCell(examCur);
}

function updateExamAnswered(){
  const n = exam ? exam.qids.filter(id => exam.answers[id] !== undefined).length : 0;
  document.getElementById("examAnswered").textContent = uiFmt("examAnsweredOf", { n, total: EXAM_COUNT });
}

// ── Jump grid (1..120) ────────────────────────────────────────────────────────
function buildExamGrid(){
  const grid = document.getElementById("examGrid");
  grid.innerHTML = "";
  exam.qids.forEach((id, idx) => {
    const cell = document.createElement("button");
    cell.className = "egc";
    cell.textContent = idx + 1;
    cell.dataset.idx = idx;
    decorateExamCell(cell, idx);
    cell.addEventListener("click", () => { examCur = idx; renderExamQ(); buildExamGrid(); scrollExamTop(); });
    grid.appendChild(cell);
  });
}
function decorateExamCell(cell, idx){
  const id = exam.qids[idx];
  cell.classList.toggle("done", exam.answers[id] !== undefined);
  cell.classList.toggle("flag", !!exam.flags[id]);
  cell.classList.toggle("cur",  idx === examCur);
}
function markExamGridCell(idx){
  const cell = document.querySelector('#examGrid .egc[data-idx="' + idx + '"]');
  if (cell) decorateExamCell(cell, idx);
}
function buildExamGridLegend(){
  const wrap = document.getElementById("examGridLegend");
  wrap.innerHTML =
    `<span class="egl"><span class="egl-sw done"></span>${esc(ui("examLegendAnswered"))}</span>` +
    `<span class="egl"><span class="egl-sw flag"></span>${esc(ui("examLegendFlagged"))}</span>` +
    `<span class="egl"><span class="egl-sw cur"></span>${esc(ui("examLegendCurrent"))}</span>`;
}
function scrollExamTop(){
  const c = document.getElementById("examQCard");
  if (c) c.scrollIntoView({ block:"start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ── Submit (confirm) ──────────────────────────────────────────────────────────
function openExamSubmit(){
  const unanswered = EXAM_COUNT - exam.qids.filter(id => exam.answers[id] !== undefined).length;
  document.getElementById("esTitle").textContent = ui("examSubmitTitle");
  document.getElementById("esText").textContent  = ui("examSubmitText");
  const warn = document.getElementById("esUnanswered");
  if (unanswered > 0){ warn.textContent = uiFmt("examUnanswered", { n: unanswered }); warn.style.display = "block"; }
  else warn.style.display = "none";
  document.getElementById("examSubmitConfirm").textContent = ui("examSubmitConfirm");
  document.getElementById("examSubmitCancel").textContent  = ui("examSubmitCancel");
  document.getElementById("examSubmitModal").style.display = "grid";
}
function closeExamSubmit(){ document.getElementById("examSubmitModal").style.display = "none"; }

// ── Grade (on submit OR timeout) ──────────────────────────────────────────────
function gradeExam(timedOut){
  if (!exam) return;
  closeExamSubmit();
  if (examTimerId){ clearInterval(examTimerId); examTimerId = null; }

  const correct = exam.qids.filter(id => { const q = examQ(id); return q && exam.answers[id] === q.correct; }).length;
  const pct  = Math.round(correct / EXAM_COUNT * 100);
  const pass = !timedOut && pct >= EXAM_PASS_PCT;

  exam.submitted = true;
  saveExam();
  const result = { pct, pass, correct, total: EXAM_COUNT, timedOut: !!timedOut, at: Date.now() };
  localStorage.setItem(examLastKey(), JSON.stringify(result));

  renderExamResult(result);
}

function renderExamResult(r){
  showExamShell(true);
  document.getElementById("examRun").style.display = "none";
  document.getElementById("examReview").style.display = "none";
  const card = document.getElementById("examResultCard"); card.style.display = "block";

  document.getElementById("examResultScore").textContent = r.pct + "%";
  const labelEl = document.getElementById("examResultLabel");
  labelEl.textContent = r.timedOut ? ui("examResultTimeout") : (r.pass ? ui("examResultPass") : ui("examResultFail"));
  labelEl.className = "result-label " + (r.pass ? "pass" : "fail");
  document.getElementById("examResultStats").textContent =
    `${ui("examResultCorrect")} ${r.correct} ${ui("examResultOf")} ${EXAM_COUNT}`;

  // Compare to the previous-but-one result if we stored one before this attempt.
  const cmp = document.getElementById("examResultCompare");
  if (examPrevResult && typeof examPrevResult.pct === "number"){
    const d = r.pct - examPrevResult.pct;
    cmp.textContent = d > 0 ? uiFmt("examCompareBetter", { d, prev: examPrevResult.pct })
                    : d < 0 ? uiFmt("examCompareWorse",  { d, prev: examPrevResult.pct })
                            : uiFmt("examCompareSame",   { prev: examPrevResult.pct });
    cmp.className = "exam-result-compare " + (d > 0 ? "up" : d < 0 ? "down" : "same");
    cmp.style.display = "block";
  } else { cmp.style.display = "none"; }

  document.getElementById("examReviewBtn").textContent = ui("examReview");
  document.getElementById("examNewBtn").textContent    = ui("examNew");
}

// ── Review (read-only, reuse practice correct/wrong styling) ───────────────────
function renderExamReview(){
  document.getElementById("examRun").style.display = "none";
  document.getElementById("examResultCard").style.display = "none";
  const wrap = document.getElementById("examReview"); wrap.style.display = "block";
  document.getElementById("examReviewTitle").textContent    = ui("examReviewTitle");
  document.getElementById("examReviewBackBtn").textContent  = ui("examReviewBack");

  const list = document.getElementById("examReviewList");
  list.innerHTML = "";
  const bilingual = isBilingual();
  exam.qids.forEach((id, idx) => {
    const q = examQ(id); if (!q) return;
    const picked = exam.answers[id];

    const item = document.createElement("div");
    item.className = "q-card exam-review-q";

    const num = document.createElement("div");
    num.className = "q-meta";
    num.innerHTML = `<span class="q-num">${idx + 1} / ${EXAM_COUNT}</span><span class="q-section">${esc(secLabel(q.sec))}</span>`;
    item.appendChild(num);

    const qt = document.createElement("div");
    qt.className = "q-text";
    if (bilingual){
      const t = TR[q.id]; const qTrans = t && t.q;
      qt.innerHTML = `<span class="lx-en">${esc(q.q)}</span>${qTrans ? `<span class="lx-ru">${esc(qTrans)}</span>` : ""}`;
    } else { qt.textContent = getQText(q); }
    item.appendChild(qt);

    const opts = document.createElement("div");
    opts.className = "q-opts";
    const enOpts = q.opts, localOpts = getOpts(q);
    enOpts.forEach((_, i) => {
      const b = document.createElement("button");
      b.className = "opt-btn";
      b.disabled = true;
      if (bilingual){
        const t = TR[q.id]; const transOpts = t && t.opts;
        if (transOpts && transOpts[i]) b.innerHTML = `<span class="lx-en">${esc(enOpts[i])}</span><span class="lx-ru">${esc(transOpts[i])}</span>`;
        else b.textContent = enOpts[i];
      } else { b.textContent = localOpts[i] !== undefined ? localOpts[i] : enOpts[i]; }
      if (i === q.correct) b.classList.add("correct");
      else if (i === picked) b.classList.add("wrong");
      opts.appendChild(b);
    });
    item.appendChild(opts);

    // Explanation
    const exp = getExplanation(q);
    if (bilingual){
      const t = TR[q.id]; const rTrans = t && t.re;
      if (q.re || rTrans){
        const e = document.createElement("div"); e.className = "q-explanation";
        e.innerHTML = (q.re ? `<div class="lx-en">${esc(q.re)}</div>` : "") + (rTrans ? `<div class="lx-ru">${esc(rTrans)}</div>` : "");
        item.appendChild(e);
      }
    } else if (exp){
      const e = document.createElement("div"); e.className = "q-explanation"; e.textContent = exp; item.appendChild(e);
    }

    list.appendChild(item);
  });
  scrollExamTop();
}

// ── New attempt = fresh random set (keeps lp:final_last for comparison) ────────
function newExam(){
  examPrevResult = loadExamLast();     // remember the result we'll compare the next attempt against
  localStorage.removeItem(examKey());
  exam = null;
  openExamWarn();
}

// Leave the exam back to the course (timer keeps running; attempt stays active).
function quitExam(){
  if (!exam || exam.submitted){ showExamShell(false); return; }
  if (!confirm(ui("examQuitConfirm"))) return;
  showExamShell(false);
}

let examPrevResult = null;   // the lp:final_last value captured before the current attempt was graded

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

// Final Exam events
document.getElementById("examStartBtn").addEventListener("click", () => { examPrevResult = loadExamLast(); openExamWarn(); });
document.getElementById("examWarnCancel").addEventListener("click", closeExamWarn);
document.getElementById("examWarnStart").addEventListener("click", startExam);
document.getElementById("examPrevBtn").addEventListener("click", () => { if (examCur > 0){ examCur--; renderExamQ(); buildExamGrid(); } });
document.getElementById("examNextBtn").addEventListener("click", () => { if (exam && examCur < exam.qids.length - 1){ examCur++; renderExamQ(); buildExamGrid(); } });
document.getElementById("examFlagBtn").addEventListener("click", () => {
  if (!exam) return;
  const id = exam.qids[examCur];
  exam.flags[id] = !exam.flags[id];
  saveExam();
  renderExamQ();
  markExamGridCell(examCur);
});
document.getElementById("examQuitBtn").addEventListener("click", quitExam);
document.getElementById("examSubmitBtn").addEventListener("click", openExamSubmit);
document.getElementById("examSubmitCancel").addEventListener("click", closeExamSubmit);
document.getElementById("examSubmitConfirm").addEventListener("click", () => gradeExam(false));
document.getElementById("examReviewBtn").addEventListener("click", renderExamReview);
document.getElementById("examReviewBackBtn").addEventListener("click", () => renderExamResult(loadExamLast()));
document.getElementById("examNewBtn").addEventListener("click", newExam);

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
  // Defense-in-depth: only proceed for a course id that resolves in the catalog,
  // so an unknown or crafted ?id= never flows into a loaded script path.
  if (!courseMeta){ window.location.replace("app.html"); return; }
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
  buildExamEntry();
  resetOrder();

  document.getElementById("courseShell").style.display = "grid";
  renderQ();

  // Resume an in-progress final exam (or finalize it if its clock ran out while away).
  resumeExamIfAny();
}

initCourse();
