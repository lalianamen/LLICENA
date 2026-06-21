/* LICENA — course player */

const params  = new URLSearchParams(location.search);
const courseId = params.get("id") || "";
const urlLang  = params.get("lang") || "en";

// Find course metadata in CATALOG
let courseMeta = null;
for (const cat of CATALOG){
  for (const sub of (cat.subs || [])){
    const found = (sub.courses || []).find(c => c.id === courseId);
    if (found){ courseMeta = found; break; }
  }
  if (courseMeta) break;
}

// Question data: each course file should define window.COURSE_DATA = { id, questions:[...] }
// question shape: { id, sec, q, opts:[], correct, re (EN explanation), rr (RU explanation) }
const QUESTIONS = (window.COURSE_DATA && window.COURSE_DATA.id === courseId)
  ? window.COURSE_DATA.questions : [];

const LABELS = { en:"English", es:"Español", ru:"Русский", vi:"Tiếng Việt" };

let lang = urlLang;
let currentQ = 0, answered = 0, correct = 0;
let order = [], shuffle = false;
let userAnswers = {}; // index → chosen option index

// ─── UI helpers ───────────────────────────────────────────────────────────────
function t(key){ return (TAPP[lang] && TAPP[lang][key]) || (TAPP.en[key]) || key; }

function setTitle(){
  const name = courseMeta ? (courseMeta.name[lang] || courseMeta.name.en) : courseId;
  document.title = "LICENA — " + name;
  document.getElementById("courseTitle").textContent = name;
}

function buildLangSwitcher(){
  const wrap = document.getElementById("langSwitcher");
  wrap.innerHTML = "";
  if (!courseMeta) return;
  courseMeta.langs.forEach(l => {
    const btn = document.createElement("button");
    btn.textContent = l.toUpperCase();
    btn.setAttribute("aria-pressed", l === lang ? "true" : "false");
    btn.addEventListener("click", () => switchLang(l));
    wrap.appendChild(btn);
  });
  document.getElementById("langTag").textContent = LABELS[lang] || lang.toUpperCase();
}

function switchLang(l){
  lang = l;
  localStorage.setItem("lp:course_lang:" + courseId, l);
  document.getElementById("langTag").textContent = LABELS[l] || l.toUpperCase();
  document.querySelectorAll("#langSwitcher button").forEach(b => b.setAttribute("aria-pressed", b.textContent === l.toUpperCase() ? "true" : "false"));
  setTitle();
  renderQ();
  buildSections();
}

// ─── Sections sidebar ─────────────────────────────────────────────────────────
function buildSections(){
  const wrap = document.getElementById("sideSections");
  wrap.innerHTML = "";
  const secs = [...new Set(QUESTIONS.map(q => q.sec))].filter(Boolean);
  if (!secs.length) return;
  const all = document.createElement("button"); all.className = "sec-btn active"; all.textContent = lang === "ru" ? "Все разделы" : "All sections";
  all.addEventListener("click", () => filterSection(null, all));
  wrap.appendChild(all);
  secs.forEach(sec => {
    const btn = document.createElement("button"); btn.className = "sec-btn"; btn.textContent = sec;
    btn.addEventListener("click", () => filterSection(sec, btn));
    wrap.appendChild(btn);
  });
}

let activeSection = null;
function filterSection(sec, btn){
  activeSection = sec;
  document.querySelectorAll(".sec-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  resetOrder();
  renderQ();
}

// ─── Order / shuffle ──────────────────────────────────────────────────────────
function resetOrder(){
  let pool = QUESTIONS.map((_, i) => i);
  if (activeSection) pool = pool.filter(i => QUESTIONS[i].sec === activeSection);
  if (shuffle) pool = pool.sort(() => Math.random() - .5);
  order = pool;
  currentQ = 0;
  userAnswers = {};
  answered = 0; correct = 0;
  updateProgress();
}

function updateProgress(){
  const total = order.length;
  const done = Object.keys(userAnswers).length;
  document.getElementById("progCount").textContent = done;
  document.getElementById("progTotal").textContent = total;
  document.getElementById("progFill").style.width = total ? (done / total * 100) + "%" : "0%";
}

// ─── Render question ──────────────────────────────────────────────────────────
function renderQ(){
  const card = document.getElementById("qCard");
  const results = document.getElementById("resultsCard");
  const cs = document.getElementById("comingSoon");

  if (!QUESTIONS.length){
    card.style.display = "none"; results.style.display = "none";
    cs.style.display = "block";
    document.getElementById("csTitle").textContent = courseMeta ? (courseMeta.name[lang] || courseMeta.name.en) : courseId;
    document.getElementById("csText").textContent = lang === "ru"
      ? "Вопросы для этого курса скоро появятся."
      : lang === "es" ? "Las preguntas para este curso llegan pronto."
      : lang === "vi" ? "Câu hỏi cho khóa học này sắp ra mắt."
      : "Questions for this course are coming soon.";
    return;
  }

  if (currentQ >= order.length){
    showResults(); return;
  }

  cs.style.display = "none"; results.style.display = "none";
  card.style.display = "block";

  const qi = order[currentQ];
  const q = QUESTIONS[qi];
  const userPick = userAnswers[currentQ];
  const answered = userPick !== undefined;

  document.getElementById("qNum").textContent = (currentQ + 1) + " / " + order.length;
  document.getElementById("qSection").textContent = q.sec || "";

  // Question text: use translated if available
  const qText = (lang === "ru" && q.qr) ? q.qr : (lang === "es" && q.qs) ? q.qs : (lang === "vi" && q.qv) ? q.qv : q.q;
  document.getElementById("qText").textContent = qText;

  const optsWrap = document.getElementById("qOpts");
  optsWrap.innerHTML = "";
  const opts = (lang === "ru" && q.optsr) ? q.optsr : (lang === "es" && q.optss) ? q.optss : (lang === "vi" && q.optsv) ? q.optsv : q.opts;
  opts.forEach((opt, i) => {
    const btn = document.createElement("button"); btn.className = "opt-btn";
    btn.textContent = opt;
    if (answered){
      if (i === q.correct) btn.classList.add("correct");
      else if (i === userPick) btn.classList.add("wrong");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => pickAnswer(i));
    }
    optsWrap.appendChild(btn);
  });

  // Explanation
  const expEl = document.getElementById("qExplanation");
  if (answered && (q.re || q.rr)){
    const exp = (lang === "ru" && q.rr) ? q.rr : q.re;
    expEl.textContent = exp; expEl.style.display = "block";
  } else { expEl.style.display = "none"; }

  document.getElementById("prevBtn").disabled = currentQ === 0;
  document.getElementById("nextBtn").textContent = currentQ === order.length - 1
    ? (lang === "ru" ? "Результат" : lang === "es" ? "Resultado" : lang === "vi" ? "Kết quả" : "Finish")
    : (lang === "ru" ? "Далее →" : "Next →");
}

function pickAnswer(i){
  if (userAnswers[currentQ] !== undefined) return;
  userAnswers[currentQ] = i;
  const q = QUESTIONS[order[currentQ]];
  if (i === q.correct) correct++;
  answered++;
  updateProgress();
  renderQ();
}

function showResults(){
  document.getElementById("qCard").style.display = "none";
  document.getElementById("comingSoon").style.display = "none";
  const card = document.getElementById("resultsCard"); card.style.display = "block";
  const total = order.length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  document.getElementById("resultScore").textContent = pct + "%";
  const pass = pct >= 70;
  document.getElementById("resultLabel").textContent = pass
    ? (lang === "ru" ? "✓ Сдал!" : "✓ Passed!")
    : (lang === "ru" ? "✗ Попробуй ещё" : "✗ Keep practicing");
  document.getElementById("resultLabel").className = "result-label " + (pass ? "pass" : "fail");
  document.getElementById("resultStats").textContent =
    (lang === "ru" ? `Правильно: ${correct} из ${total}` : `Correct: ${correct} of ${total}`);
  document.getElementById("retryBtn").textContent = lang === "ru" ? "Начать заново" : lang === "es" ? "Reintentar" : "Try again";
}

// ─── Events ───────────────────────────────────────────────────────────────────
document.getElementById("prevBtn").addEventListener("click", () => { if (currentQ > 0){ currentQ--; renderQ(); } });
document.getElementById("nextBtn").addEventListener("click", () => { currentQ++; renderQ(); });
document.getElementById("retryBtn").addEventListener("click", () => { resetOrder(); renderQ(); });
document.getElementById("restartBtn").addEventListener("click", () => { resetOrder(); renderQ(); });
document.getElementById("csBack").addEventListener("click", () => history.back());
document.getElementById("backBtn").addEventListener("click", () => { window.location.href = "app.html"; });
document.getElementById("shuffleToggle").addEventListener("change", e => {
  shuffle = e.target.checked; resetOrder(); renderQ();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initCourse(){
  const { data: { session } } = await supa.auth.getSession();
  if (!session){ window.location.replace("index.html"); return; }

  // Check user owns this course
  const userId = session.user.id;
  const { data: owned } = await supa.from("user_courses").select("course_id").eq("user_id", userId).eq("course_id", courseId).single();
  if (!owned){ window.location.replace("app.html"); return; }

  setTitle();
  buildLangSwitcher();
  buildSections();
  resetOrder();

  document.getElementById("courseShell").style.display = "grid";
  document.getElementById("backLabel").textContent = TAPP[lang]?.navMyTests || "My courses";
  renderQ();
}

initCourse();
