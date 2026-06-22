/* LICENA — course player
   uiLang   = cabinet language (button labels, Prev/Next/Restart etc.)
   studyLang = language the questions are displayed in (per-course choice) */

const params   = new URLSearchParams(location.search);
const courseId = params.get("id") || "";

// uiLang: read from cabinet profile lang stored in localStorage, else EN
let uiLang   = localStorage.getItem("lp:ui_lang") || "en";
let studyLang = localStorage.getItem("lp:course_lang:" + courseId) || "en";

// Question bank from registry
const QUESTIONS = (window.COURSE_REGISTRY && window.COURSE_REGISTRY[courseId]) || [];

// Find course metadata in CATALOG
let courseMeta = null;
for (const cat of CATALOG){
  for (const sub of (cat.subs || [])){
    const found = (sub.courses || []).find(c => c.id === courseId);
    if (found){ courseMeta = found; break; }
  }
  if (courseMeta) break;
}

const LANG_LABELS = { en:"EN", es:"ES", ru:"RU", vi:"VI" };
const LANG_FULL   = { en:"English", es:"Español", ru:"Русский", vi:"Tiếng Việt" };

// UI string helper (uses uiLang)
function ui(key){ return (TAPP[uiLang] && TAPP[uiLang][key]) || (TAPP.en[key]) || key; }

// ─── Study language ───────────────────────────────────────────────────────────
function buildStudyLangSwitcher(){
  const wrap = document.getElementById("studyLangWrap");
  wrap.innerHTML = "";
  if (!courseMeta || courseMeta.langs.length <= 1) return;

  const label = document.createElement("span");
  label.className = "study-lang-label";
  label.textContent = "Study in:";
  wrap.appendChild(label);

  const seg = document.createElement("div");
  seg.className = "study-lang-seg";
  courseMeta.langs.forEach(l => {
    const btn = document.createElement("button");
    btn.textContent = LANG_LABELS[l] || l.toUpperCase();
    btn.title = LANG_FULL[l] || l;
    btn.setAttribute("aria-pressed", l === studyLang ? "true" : "false");
    btn.addEventListener("click", () => {
      studyLang = l;
      localStorage.setItem("lp:course_lang:" + courseId, l);
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      buildHonestChances();
      renderQ();
    });
    seg.appendChild(btn);
  });
  wrap.appendChild(seg);
}

// ─── Question text helpers ────────────────────────────────────────────────────
function getQText(q){
  if (studyLang === "ru" && q.qr) return q.qr;
  if (studyLang === "es" && q.qs) return q.qs;
  if (studyLang === "vi" && q.qv) return q.qv;
  return q.q;
}
function getOpts(q){
  if (studyLang === "ru" && q.optsr && q.optsr.length) return q.optsr;
  if (studyLang === "es" && q.optss && q.optss.length) return q.optss;
  if (studyLang === "vi" && q.optsv && q.optsv.length) return q.optsv;
  return q.opts;
}
function getExplanation(q){
  if (studyLang === "ru" && q.rr) return q.rr;
  return q.re || "";
}

// ─── Honest-chances block ──────────────────────────────────────────────────────
function buildHonestChances(){
  const wrap = document.getElementById("honestChances");
  if (!wrap) return;
  const data = (window.HONEST_CHANCES || {})[courseId];
  if (!data){ wrap.style.display = "none"; return; }
  const l = data[studyLang] ? studyLang : (data.en ? "en" : Object.keys(data)[0]);
  const titles = window.HONEST_CHANCES_TITLE || {};
  document.getElementById("hcSummary").textContent = (titles[l] || titles.en || "Honest chances");
  document.getElementById("hcBody").innerHTML = data[l];
  wrap.style.display = "block";
}

// ─── Sections ─────────────────────────────────────────────────────────────────
let activeSection = null;

function buildSections(){
  const wrap = document.getElementById("sideSections");
  wrap.innerHTML = "";
  const secs = [...new Set(QUESTIONS.map(q => q.sec))].filter(Boolean);
  if (!secs.length) return;

  const all = document.createElement("button");
  all.className = "sec-btn active";
  all.textContent = uiLang === "ru" ? "Все разделы" : uiLang === "es" ? "Todos" : uiLang === "vi" ? "Tất cả" : "All sections";
  all.addEventListener("click", () => { activeSection = null; resetOrder(); renderQ(); wrap.querySelectorAll(".sec-btn").forEach(b => b.classList.remove("active")); all.classList.add("active"); });
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

// ─── Order / progress ─────────────────────────────────────────────────────────
let order = [], shuffle = false, userAnswers = {};

function resetOrder(){
  let pool = QUESTIONS.map((_, i) => i);
  if (activeSection) pool = pool.filter(i => QUESTIONS[i].sec === activeSection);
  if (shuffle) pool = pool.sort(() => Math.random() - .5);
  order = pool;
  currentQ = 0;
  userAnswers = {};
  updateProgress();
}

let currentQ = 0;

function updateProgress(){
  const total = order.length, done = Object.keys(userAnswers).length;
  document.getElementById("progCount").textContent = done;
  document.getElementById("progTotal").textContent = total;
  document.getElementById("progFill").style.width = total ? (done / total * 100) + "%" : "0%";
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderQ(){
  const qCard = document.getElementById("qCard");
  const resultsCard = document.getElementById("resultsCard");
  const cs = document.getElementById("comingSoon");

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

  const qi = order[currentQ];
  const q = QUESTIONS[qi];
  const picked = userAnswers[currentQ];
  const isAnswered = picked !== undefined;

  document.getElementById("qNum").textContent = (currentQ + 1) + " / " + order.length;
  document.getElementById("qSection").textContent = q.sec || "";
  document.getElementById("qText").textContent = getQText(q);

  const optsWrap = document.getElementById("qOpts");
  optsWrap.innerHTML = "";
  getOpts(q).forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = opt;
    if (isAnswered){
      if (i === q.correct) btn.classList.add("correct");
      else if (i === picked) btn.classList.add("wrong");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => pickAnswer(i));
    }
    optsWrap.appendChild(btn);
  });

  const expEl = document.getElementById("qExplanation");
  const exp = getExplanation(q);
  if (isAnswered && exp){ expEl.textContent = exp; expEl.style.display = "block"; }
  else { expEl.style.display = "none"; }

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  prevBtn.disabled = currentQ === 0;
  prevBtn.textContent = uiLang === "ru" ? "← Назад" : uiLang === "es" ? "← Ant." : uiLang === "vi" ? "← Trước" : "← Prev";
  nextBtn.textContent = currentQ === order.length - 1
    ? (uiLang === "ru" ? "Результат" : uiLang === "es" ? "Resultado" : uiLang === "vi" ? "Kết quả" : "Finish")
    : (uiLang === "ru" ? "Далее →" : uiLang === "es" ? "Sig. →" : uiLang === "vi" ? "Tiếp →" : "Next →");
}

function pickAnswer(i){
  if (userAnswers[currentQ] !== undefined) return;
  userAnswers[currentQ] = i;
  updateProgress();
  renderQ();
}

function showResults(){
  document.getElementById("qCard").style.display = "none";
  document.getElementById("comingSoon").style.display = "none";
  const card = document.getElementById("resultsCard"); card.style.display = "block";
  const total = order.length;
  const correct = Object.entries(userAnswers).filter(([idx, pick]) => QUESTIONS[order[+idx]]?.correct === pick).length;
  const pct = total ? Math.round(correct / total * 100) : 0;
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
  document.getElementById("shuffleLabel").textContent = uiLang === "ru" ? "Перемешать" : uiLang === "es" ? "Mezclar" : uiLang === "vi" ? "Xáo trộn" : "Shuffle";
  document.getElementById("restartLabel").textContent = uiLang === "ru" ? "Сначала" : uiLang === "es" ? "Reiniciar" : uiLang === "vi" ? "Bắt đầu lại" : "Restart";
}

// ─── Events ───────────────────────────────────────────────────────────────────
document.getElementById("prevBtn").addEventListener("click", () => { if (currentQ > 0){ currentQ--; renderQ(); } });
document.getElementById("nextBtn").addEventListener("click", () => { currentQ++; renderQ(); });
document.getElementById("retryBtn").addEventListener("click", () => { resetOrder(); renderQ(); });
document.getElementById("restartBtn").addEventListener("click", () => { resetOrder(); renderQ(); });
document.getElementById("csBack").addEventListener("click", () => history.back());
document.getElementById("backBtn").addEventListener("click", () => { window.location.href = "app.html"; });
document.getElementById("shuffleToggle").addEventListener("change", e => { shuffle = e.target.checked; resetOrder(); renderQ(); });

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initCourse(){
  const { data: { session } } = await supa.auth.getSession();
  if (!session){ window.location.replace("index.html"); return; }

  const userId = session.user.id;
  // Check ownership
  const { data: owned } = await supa.from("user_courses").select("course_id").eq("user_id", userId).eq("course_id", courseId).single();
  if (!owned){ window.location.replace("app.html"); return; }

  // Load uiLang from profile
  const { data: prof } = await supa.from("profiles").select("lang").eq("id", userId).single();
  if (prof && prof.lang && TAPP[prof.lang]){
    uiLang = prof.lang;
    localStorage.setItem("lp:ui_lang", uiLang);
  }

  // If studyLang not saved yet for this course, default to uiLang if available for course, else first available
  if (!localStorage.getItem("lp:course_lang:" + courseId)){
    const available = courseMeta ? courseMeta.langs : ["en"];
    studyLang = available.includes(uiLang) ? uiLang : available[0];
    localStorage.setItem("lp:course_lang:" + courseId, studyLang);
  }

  const name = courseMeta ? (courseMeta.name[uiLang] || courseMeta.name.en) : courseId;
  document.title = "LICENA — " + name;
  document.getElementById("courseTitle").textContent = name;

  applyUiLabels();
  buildStudyLangSwitcher();
  buildHonestChances();
  buildSections();
  resetOrder();

  document.getElementById("courseShell").style.display = "grid";
  renderQ();
}

initCourse();
