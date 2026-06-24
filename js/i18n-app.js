/* LICENA cabinet (/app) translations. */
const MAX_DEVICES = 3;

const TAPP = {
  en:{
    tag:"My cabinet", signOut:"Sign out",
    navMyTests:"My courses", navAdd:"Catalog", navAccount:"Account",
    myH:"My courses", myL:"Your active courses and study materials.",
    myEmpty:"You haven't added any courses yet. Go to the Catalog to add your first course.",
    examBadge:"Exam", guideBadge:"Guide", activeBadge:"Active", inactiveBadge:"Inactive",
    openCourse:"Open →",
    storeH:"Catalog", storeL:"Add courses to your account. Free while in beta.",
    addBtn:"Add", added:"Added ✓", soon:"Coming soon",
    acctH:"Account", acctName:"Name", acctEmail:"Email", acctPlan:"Access", planTest:"Beta access",
    cancel:"Cancel", chooseLang:"Choose your study language:",
    betaFree:"Free access during beta — no payment needed.", activateBtn:"Activate for free",
    removeBtn:"Remove", removeCourseConfirm:"Remove course", removeCourseText:"This will remove the course from your account. You can add it again anytime.", removeYes:"Remove",
    stateLabel:"State", chooseState:"Choose your state", stateSoon:"Coming soon", stateEmpty:"No courses for this state yet — coming soon.",
    /* Course player */
    courseAllSections:"All sections",
    courseRestart:"Restart", courseResetProgress:"Reset progress",
    courseResetConfirm:"Reset all progress for this course?",
    courseWrongOff:"✗ Wrong only", courseWrongOn:"✓ Wrong only",
    coursePrev:"← Prev", courseNext:"Next →", courseFinish:"Finish",
    coursePassed:"✓ Passed!", courseFail:"✗ Keep practicing",
    courseCorrect:"Correct:", courseOf:"of",
    courseRetry:"Try again",
    courseStudyIn:"Study in:",
    courseSoon:"Questions are coming soon."
  },
  es:{
    tag:"Mi panel", signOut:"Cerrar sesión",
    navMyTests:"Mis cursos", navAdd:"Catálogo", navAccount:"Cuenta",
    myH:"Mis cursos", myL:"Tus cursos activos y materiales de estudio.",
    myEmpty:"Aún no tienes cursos. Ve al Catálogo para añadir tu primer curso.",
    examBadge:"Examen", guideBadge:"Guía", activeBadge:"Activo", inactiveBadge:"Inactivo",
    openCourse:"Abrir →",
    storeH:"Catálogo", storeL:"Añade cursos a tu cuenta. Gratis durante las pruebas.",
    addBtn:"Añadir", added:"Añadido ✓", soon:"Próximamente",
    acctH:"Cuenta", acctName:"Nombre", acctEmail:"Correo", acctPlan:"Acceso", planTest:"Acceso beta",
    cancel:"Cancelar", chooseLang:"Elige el idioma de estudio:",
    betaFree:"Acceso gratuito durante la beta — sin pago.", activateBtn:"Activar gratis",
    removeBtn:"Eliminar", removeCourseConfirm:"Eliminar curso", removeCourseText:"Esto eliminará el curso de tu cuenta. Puedes volver a añadirlo en cualquier momento.", removeYes:"Eliminar",
    stateLabel:"Estado", chooseState:"Elige tu estado", stateSoon:"Próximamente", stateEmpty:"Aún no hay cursos para este estado — próximamente.",
    /* Course player */
    courseAllSections:"Todas las secciones",
    courseRestart:"Reiniciar", courseResetProgress:"Borrar progreso",
    courseResetConfirm:"¿Borrar todo el progreso de este curso?",
    courseWrongOff:"✗ Solo errores", courseWrongOn:"✓ Solo errores",
    coursePrev:"← Ant.", courseNext:"Sig. →", courseFinish:"Resultado",
    coursePassed:"✓ ¡Aprobado!", courseFail:"✗ Sigue practicando",
    courseCorrect:"Correctas:", courseOf:"de",
    courseRetry:"Reintentar",
    courseStudyIn:"Estudiar en:",
    courseSoon:"Las preguntas llegan pronto."
  },
  ru:{
    tag:"Кабинет", signOut:"Выйти",
    navMyTests:"Мои курсы", navAdd:"Каталог", navAccount:"Аккаунт",
    myH:"Мои курсы", myL:"Твои активные курсы и учебные материалы.",
    myEmpty:"Ты ещё не добавил курсы. Зайди в Каталог, чтобы добавить первый курс.",
    examBadge:"Экзамен", guideBadge:"Гайд", activeBadge:"Активен", inactiveBadge:"Неактивен",
    openCourse:"Открыть →",
    storeH:"Каталог", storeL:"Добавляй курсы к аккаунту. Бесплатно на период тестирования.",
    addBtn:"Добавить", added:"Добавлено ✓", soon:"Скоро",
    acctH:"Аккаунт", acctName:"Имя", acctEmail:"Эл. почта", acctPlan:"Доступ", planTest:"Бета-доступ",
    cancel:"Отмена", chooseLang:"Выбери язык для учёбы:",
    betaFree:"Бесплатный доступ в период бета-тестирования — оплата не нужна.", activateBtn:"Активировать бесплатно",
    removeBtn:"Удалить", removeCourseConfirm:"Удалить курс", removeCourseText:"Курс будет удалён из твоего аккаунта. Ты сможешь добавить его снова в любой момент.", removeYes:"Удалить",
    stateLabel:"Штат", chooseState:"Выбери свой штат", stateSoon:"Скоро", stateEmpty:"Для этого штата пока нет курсов — скоро добавим.",
    /* Course player */
    courseAllSections:"Все разделы",
    courseRestart:"Сначала", courseResetProgress:"Сбросить прогресс",
    courseResetConfirm:"Сбросить весь прогресс по этому курсу?",
    courseWrongOff:"✗ Показать ошибки", courseWrongOn:"✓ Только ошибки",
    coursePrev:"← Назад", courseNext:"Далее →", courseFinish:"Результат",
    coursePassed:"✓ Сдал!", courseFail:"✗ Продолжай практику",
    courseCorrect:"Правильно:", courseOf:"из",
    courseRetry:"Начать заново",
    courseStudyIn:"Язык:",
    courseSoon:"Вопросы скоро появятся."
  }
};
const SECTIONS = ["Licensing Requirements","Business Organization","Business Finances","Employment & Labor","Safety (Cal/OSHA)","Bonds & Insurance","Mechanics Liens","Contracts"];
