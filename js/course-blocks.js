/* LICENA — block metadata for courses split into question blocks, plus a localized
   display map for section names. Keyed by course id. */
window.COURSE_BLOCKS = window.COURSE_BLOCKS || {};

window.COURSE_BLOCKS["cslb-law"] = [
  { n:1, range:"1–100",   roman:"I",
    title:{ en:"Block 1 · Questions 1–100",   es:"Bloque 1 · Preguntas 1–100",   ru:"Блок 1 · Вопросы 1–100"   },
    sub:{   en:"Foundation across all 7 exam sections", es:"Base de las 7 secciones del examen", ru:"Основа по всем 7 разделам экзамена" } },
  { n:2, range:"101–200", roman:"II",
    title:{ en:"Block 2 · Questions 101–200", es:"Bloque 2 · Preguntas 101–200", ru:"Блок 2 · Вопросы 101–200" },
    sub:{   en:"Deep dive: liens · bidding · §7000s · employment", es:"A fondo: gravámenes · licitación · §7000s · empleo", ru:"Глубже: liens · торги · §7000s · трудоустройство" } },
  { n:3, range:"201–300", roman:"III",
    title:{ en:"Block 3 · Questions 201–300", es:"Bloque 3 · Preguntas 201–300", ru:"Блок 3 · Вопросы 201–300" },
    sub:{   en:"Payroll · prevailing wage · Title 24 · permits", es:"Nómina · prevailing wage · Title 24 · permisos", ru:"Зарплата · prevailing wage · Title 24 · разрешения" } },
  { n:4, range:"301–400", roman:"IV",
    title:{ en:"Block 4 · Questions 301–400", es:"Bloque 4 · Preguntas 301–400", ru:"Блок 4 · Вопросы 301–400" },
    sub:{   en:"Discipline §7090–7124 · asbestos/hazmat · advanced liens", es:"Disciplina §7090–7124 · asbesto/hazmat · gravámenes avanzados", ru:"Дисциплина §7090–7124 · asbestos/hazmat · сложные liens" } },
  { n:5, range:"401–500", roman:"V",
    title:{ en:"Block 5 · Questions 401–500", es:"Bloque 5 · Preguntas 401–500", ru:"Блок 5 · Вопросы 401–500" },
    sub:{   en:"Final review · exam-style traps · all sections", es:"Repaso final · trampas tipo examen · todas las secciones", ru:"Финальный обзор · ловушки экзамена · все разделы" } }
];

window.COURSE_BLOCKS["c10-exam"] = [
  { n:1, range:"1–100",   roman:"I",
    title:{ en:"Block 1 · Questions 1–100",   es:"Bloque 1 · Preguntas 1–100",   ru:"Блок 1 · Вопросы 1–100"   },
    sub:{   en:"Mixed practice · all five C-10 areas", es:"Práctica mixta · las cinco áreas del C-10", ru:"Смешанная практика · все пять разделов C-10" } },
  { n:2, range:"101–200", roman:"II",
    title:{ en:"Block 2 · Questions 101–200", es:"Bloque 2 · Preguntas 101–200", ru:"Блок 2 · Вопросы 101–200" },
    sub:{   en:"Mixed practice · all five C-10 areas", es:"Práctica mixta · las cinco áreas del C-10", ru:"Смешанная практика · все пять разделов C-10" } },
  { n:3, range:"201–300", roman:"III",
    title:{ en:"Block 3 · Questions 201–300", es:"Bloque 3 · Preguntas 201–300", ru:"Блок 3 · Вопросы 201–300" },
    sub:{   en:"Mixed practice · all five C-10 areas", es:"Práctica mixta · las cinco áreas del C-10", ru:"Смешанная практика · все пять разделов C-10" } },
  { n:4, range:"301–400", roman:"IV",
    title:{ en:"Block 4 · Questions 301–400", es:"Bloque 4 · Preguntas 301–400", ru:"Блок 4 · Вопросы 301–400" },
    sub:{   en:"Mixed practice · all five C-10 areas", es:"Práctica mixta · las cinco áreas del C-10", ru:"Смешанная практика · все пять разделов C-10" } },
  { n:5, range:"401–500", roman:"V",
    title:{ en:"Block 5 · Questions 401–500", es:"Bloque 5 · Preguntas 401–500", ru:"Блок 5 · Вопросы 401–500" },
    sub:{   en:"Final mixed review · all five C-10 areas", es:"Repaso final mixto · las cinco áreas del C-10", ru:"Финальный смешанный обзор · все пять разделов C-10" } }
];

/* Display labels for question sections (q.sec stays the English key; this only
   translates how it is shown). uiLang falls back to the English key when absent. */
window.SECTION_I18N = {
  // CSLB Law & Business
  "Org & Licensing":        { es:"Organización y Licencias",      ru:"Организация и лицензирование" },
  "Business Finances":      { es:"Finanzas del Negocio",          ru:"Финансы бизнеса" },
  "Employment":             { es:"Empleo",                        ru:"Трудоустройство" },
  "Insurance & Liens":      { es:"Seguros y Gravámenes",          ru:"Страхование и залоги (liens)" },
  "Contracts":              { es:"Contratos",                     ru:"Контракты" },
  "Public Works":           { es:"Obras Públicas",                ru:"Госработы (Public Works)" },
  "Safety":                 { es:"Seguridad",                     ru:"Безопасность" },
  // C-20 HVAC
  "Principles & Load Calculations": { es:"Principios y Cálculos de Carga", ru:"Принципы и расчёт нагрузок" },
  "Fabrication & Installation":     { es:"Fabricación e Instalación",      ru:"Изготовление и монтаж" },
  "Service & Troubleshooting":      { es:"Servicio y Diagnóstico",         ru:"Сервис и диагностика" },
  "Safety & Field Practices":       { es:"Seguridad y Prácticas de Campo", ru:"Безопасность и полевые практики" },
  // C-10 Electrical
  "Planning & Estimation":  { es:"Planificación y Estimación",    ru:"Планирование и оценка" },
  "Rough Wiring":           { es:"Cableado Rústico (Rough)",      ru:"Черновая проводка (rough)" },
  "Finish Wiring & Trim":   { es:"Cableado de Acabado y Trim",    ru:"Чистовая проводка и trim" },
  "Startup, Troubleshooting & Maintenance": { es:"Arranque, Diagnóstico y Mantenimiento", ru:"Запуск, диагностика и обслуживание" },
  // Asbestos
  "What Is Asbestos":       { es:"Qué es el Asbesto",             ru:"Что такое асбест" },
  "Health Effects":         { es:"Efectos en la Salud",           ru:"Влияние на здоровье" },
  "Where It's Found":       { es:"Dónde se Encuentra",            ru:"Где встречается" },
  "Regulations & Licensing":{ es:"Regulaciones y Licencias",      ru:"Нормы и лицензирование" },
  "Safe Handling & Procedures": { es:"Manejo Seguro y Procedimientos", ru:"Безопасное обращение и процедуры" }
};
