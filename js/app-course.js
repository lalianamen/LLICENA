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
// For courses with RU: EN / EN·RU / RU
// For single-lang courses: no switcher
function buildStudyLangModes(){
  if (!courseMeta) return [];
  const avail = courseMeta.langs;
  if (avail.length <= 1) return [];
  const modes = [{ key:"en", label:"EN" }];
  if (avail.includes("ru")) modes.push({ key:"en+ru", label:"EN·RU" });
  avail.filter(l => l !== "en").forEach(l => modes.push({ key:l, label:l.toUpperCase() }));
  return modes;
}

function buildStudyLangSwitcher(){
  const wrap = document.getElementById("studyLangWrap");
  wrap.innerHTML = "";
  const modes = buildStudyLangModes();
  if (!modes.length) return;

  // Validate stored studyLang
  if (!modes.find(m => m.key === studyLang)){
    studyLang = modes[0].key;
    localStorage.setItem("lp:course_lang:" + courseId, studyLang);
  }

  const label = document.createElement("span");
  label.className = "study-lang-label";
  label.textContent = uiLang === "ru" ? "Язык:" : "Study in:";
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
const isBilingual = () => studyLang === "en+ru";

function getQText(q){
  if (studyLang === "ru") return q.qr || q.q;
  if (studyLang === "es") return q.qs || q.q;
  if (studyLang === "vi") return q.qv || q.q;
  return q.q;
}
function getOpts(q){
  if (studyLang === "ru" && q.optsr && q.optsr.length) return q.optsr;
  if (studyLang === "es" && q.optss && q.optss.length) return q.optss;
  if (studyLang === "vi" && q.optsv && q.optsv.length) return q.optsv;
  return q.opts;
}
function getExplanation(q){
  if (studyLang === "ru") return q.rr || q.re || "";
  return q.re || "";
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
  const msg = uiLang === "ru" ? "Сбросить весь прогресс по этому курсу?" : "Reset all progress for this course?";
  if (!confirm(msg)) return;
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
  const sl = m => (m && (m[studyLang === "en+ru" ? "en" : studyLang] || m.en)) || "";

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

  const allLbl = uiLang === "ru" ? "Все разделы" : uiLang === "es" ? "Todos" : uiLang === "vi" ? "Tất cả" : "All sections";
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
  const lang = uiLang === "ru" ? "ru" : "en";
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
let order = [], shuffle = false, filterWrong = false;

function resetOrder(){
  let pool = QUESTIONS.map((_, i) => i);
  if (activeBlock !== null) pool = pool.filter(i => QUESTIONS[i].block === activeBlock);
  if (activeSection) pool = pool.filter(i => QUESTIONS[i].sec === activeSection);
  if (filterWrong) pool = pool.filter(i => {
    const q = QUESTIONS[i];
    const picked = userAnswers[q.id];
    return picked === undefined || picked !== q.correct;
  });
  if (shuffle) pool = pool.sort(() => Math.random() - .5);
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
    document.getElementById("csText").textContent =
      uiLang === "ru" ? "Вопросы скоро появятся." :
      uiLang === "es" ? "Las preguntas llegan pronto." :
      uiLang === "vi" ? "Câu hỏi sắp ra mắt." : "Questions are coming soon.";
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
    qTextEl.innerHTML = `<span class="lx-en">${esc(q.q)}</span>${q.qr ? `<span class="lx-ru">${esc(q.qr)}</span>` : ""}`;
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
    if (bilingual && q.optsr && q.optsr[i]){
      btn.innerHTML = `<span class="lx-en">${esc(enOpts[i])}</span><span class="lx-ru">${esc(q.optsr[i])}</span>`;
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
    if (bilingual && (q.re || q.rr)){
      expEl.innerHTML = (q.re ? `<div class="lx-en">${esc(q.re)}</div>` : "") +
                        (q.rr ? `<div class="lx-ru">${esc(q.rr)}</div>` : "");
      expEl.style.display = "block";
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
  prevBtn.textContent = uiLang === "ru" ? "← Назад" : uiLang === "es" ? "← Ant." : uiLang === "vi" ? "← Trước" : "← Prev";
  nextBtn.textContent = currentQ === order.length - 1
    ? (uiLang === "ru" ? "Результат" : uiLang === "es" ? "Resultado" : uiLang === "vi" ? "Kết quả" : "Finish")
    : (uiLang === "ru" ? "Далее →" : uiLang === "es" ? "Sig. →" : uiLang === "vi" ? "Tiếp →" : "Next →");
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
  document.getElementById("resultLabel").textContent = pass
    ? (uiLang === "ru" ? "✓ Сдал!" : "✓ Passed!")
    : (uiLang === "ru" ? "✗ Продолжай практику" : "✗ Keep practicing");
  document.getElementById("resultLabel").className = "result-label " + (pass ? "pass" : "fail");
  document.getElementById("resultStats").textContent =
    uiLang === "ru" ? `Правильно: ${correct} из ${total}` : `Correct: ${correct} of ${total}`;
  document.getElementById("retryBtn").textContent =
    uiLang === "ru" ? "Начать заново" : uiLang === "es" ? "Reintentar" : uiLang === "vi" ? "Thử lại" : "Try again";
}

// ─── Static UI labels ─────────────────────────────────────────────────────────
function applyUiLabels(){
  document.getElementById("backLabel").textContent = ui("navMyTests") || "My courses";
  document.getElementById("shuffleLabel").textContent      = uiLang === "ru" ? "Перемешать"     : uiLang === "es" ? "Mezclar"     : "Shuffle";
  document.getElementById("filterWrongLabel").textContent  = uiLang === "ru" ? "Только ошибки/новые" : uiLang === "es" ? "Sólo errores"   : "Wrong/new only";
  document.getElementById("restartLabel").textContent      = uiLang === "ru" ? "Сначала"        : uiLang === "es" ? "Reiniciar"   : "Restart";
  document.getElementById("resetProgressLabel").textContent = uiLang === "ru" ? "Сбросить прогресс" : uiLang === "es" ? "Borrar progreso" : "Reset progress";
}

// ─── Events ───────────────────────────────────────────────────────────────────
document.getElementById("prevBtn").addEventListener("click", () => { if (currentQ > 0){ currentQ--; renderQ(); } });
document.getElementById("nextBtn").addEventListener("click", () => { currentQ++; renderQ(); });
document.getElementById("retryBtn").addEventListener("click", () => { resetOrder(); renderQ(); });
document.getElementById("restartBtn").addEventListener("click", () => { resetOrder(); renderQ(); });
document.getElementById("csBack").addEventListener("click", () => history.back());
document.getElementById("backBtn").addEventListener("click", () => { window.location.href = "app.html"; });
document.getElementById("shuffleToggle").addEventListener("change", e => { shuffle = e.target.checked; resetOrder(); renderQ(); });
document.getElementById("filterWrongToggle").addEventListener("change", e => { filterWrong = e.target.checked; resetOrder(); renderQ(); });
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

  // Default studyLang if not stored: prefer matching uiLang if available, else "en"
  if (!localStorage.getItem("lp:course_lang:" + courseId)){
    const modes = buildStudyLangModes();
    const preferred = modes.find(m => m.key === uiLang || m.key === uiLang + "+en" || m.key === "en+" + uiLang);
    studyLang = preferred ? preferred.key : (modes[0] ? modes[0].key : "en");
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
