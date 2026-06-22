/* LICENA — course player
   uiLang   = cabinet language (button labels, Prev/Next/Restart etc.)
   studyLang = question display mode: "en" | "en+ru" | "ru" | "es" | "vi" */

const params   = new URLSearchParams(location.search);
const courseId = params.get("id") || "";

let uiLang    = localStorage.getItem("lp:ui_lang") || "en";
let studyLang = localStorage.getItem("lp:course_lang:" + courseId) || "en";

const QUESTIONS = (window.COURSE_REGISTRY && window.COURSE_REGISTRY[courseId]) || [];

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
// Modes based on uiLang: if course has uiLang translations → EN / EN·LANG / LANG
// Otherwise just EN (no switcher shown).
const LANG_LABEL = { ru:"RU", es:"ES", vi:"VI", hy:"HY", ar:"AR", zh:"ZH", ko:"KO" };
const LANG_FIELD = { ru:"r",  es:"s",  vi:"v",  hy:"hy", ar:"ar", zh:"zh", ko:"ko" };

function buildStudyLangModes(){
  if (!courseMeta) return [{ key:"en", label:"EN" }];
  const avail = courseMeta.langs || ["en"];
  if (uiLang === "en" || !avail.includes(uiLang)){
    return [{ key:"en", label:"EN" }];
  }
  const ll = LANG_LABEL[uiLang] || uiLang.toUpperCase();
  return [
    { key:"en",              label:"EN" },
    { key:"en+" + uiLang,   label:`EN·${ll}` },
    { key:uiLang,           label:ll }
  ];
}

function buildStudyLangSwitcher(){
  const wrap = document.getElementById("studyLangWrap");
  wrap.innerHTML = "";
  const modes = buildStudyLangModes();
  if (modes.length <= 1) return;

  // Validate stored studyLang
  if (!modes.find(m => m.key === studyLang)){
    studyLang = modes[0].key;
    localStorage.setItem("lp:course_lang:" + courseId, studyLang);
  }

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
const isBilingual = () => studyLang.includes("+");
function secondaryLang(){ return studyLang.replace("en+","").replace("+en",""); }
function lf(lang){ return LANG_FIELD[lang] || lang; }

function getQText(q){
  const f = lf(studyLang);
  return q["q"+f] || q.q;
}
function getOpts(q){
  const f = lf(studyLang);
  const t = q["opts"+f];
  return (t && t.length) ? t : q.opts;
}
function getExplanation(q){
  const f = lf(studyLang);
  return q["r"+f] || q.re || "";
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
    btn.textContent = sec;
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
  document.getElementById("qSection").textContent = q.sec || "";

  // Question text
  const qTextEl = document.getElementById("qText");
  if (bilingual){
    const sf = lf(secondaryLang());
    const qTrans = q["q"+sf];
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
      const sf = lf(secondaryLang());
      const transOpts = q["opts"+sf];
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
      const sf = lf(secondaryLang());
      const rTrans = q["r"+sf];
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

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initCourse(){
  const { data: { session } } = await supa.auth.getSession();
  if (!session){ window.location.replace("index.html"); return; }

  const userId = session.user.id;
  const { data: owned } = await supa.from("user_courses").select("course_id").eq("user_id", userId).eq("course_id", courseId).single();
  if (!owned){ window.location.replace("app.html"); return; }

  const { data: prof } = await supa.from("profiles").select("lang").eq("id", userId).single();
  if (prof && prof.lang && TAPP[prof.lang]){
    uiLang = prof.lang;
    localStorage.setItem("lp:ui_lang", uiLang);
  }

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
