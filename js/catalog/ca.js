/* California catalog.
   Add a CA course = add it to the right category's courses[] below, then drop
   js/questions/<id>.js. Nothing else to wire. */
registerState("ca", [
  {
    id: "construction",
    icon: "🏗️",
    name: { en:"Construction", es:"Construcción", ru:"Строительство" },
    subs: [
      {
        id: "general",
        name: { en:"General — All Trades", es:"General — Todos los oficios", ru:"Общее — для всех трейдов" },
        courses: [
          { id:"contractor-business", name:{ en:"Business Setup Guide A–Z", es:"Guía de Negocio A–Z", ru:"Гайд открытия бизнеса A–Z" }, langs:["en","es","ru"], type:"guide" },
          { id:"osha-construction",   name:{ en:"OSHA Construction Safety", es:"Seguridad OSHA (Construcción)", ru:"OSHA — безопасность на стройке" }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "cslb-general",
        name: { en:"CSLB General", es:"CSLB General", ru:"CSLB Общее" },
        courses: [
          { id:"cslb-law",  name:{ en:"Law & Business Exam",      es:"Examen Ley y Negocios",    ru:"Экзамен Law & Business"      }, langs:["en","es","ru"], type:"exam"  },
          { id:"asbestos",  name:{ en:"Asbestos Open-Book Exam",  es:"Examen de Asbesto",        ru:"Экзамен по асбесту"          }, langs:["en","es"], type:"exam"  }
        ]
      },
      {
        id: "c20",
        name: { en:"C-20 HVAC", es:"C-20 HVAC", ru:"C-20 HVAC" },
        courses: [
          { id:"c20-exam",  name:{ en:"C-20 Trade Exam",          es:"Examen Trade C-20",        ru:"Trade-экзамен C-20"          }, langs:["en","es","ru"], type:"exam"  },
          { id:"epa-608",   name:{ en:"EPA 608 Certification",    es:"Certificación EPA 608",    ru:"Сертификация EPA 608"        }, langs:["en","es","ru"], type:"exam"  }
        ]
      },
      {
        id: "c10",
        name: { en:"C-10 Electrical", es:"C-10 Eléctrico", ru:"C-10 Электрика" },
        courses: [
          { id:"c10-exam",  name:{ en:"C-10 Trade Exam",          es:"Examen Trade C-10",        ru:"Trade-экзамен C-10"          }, langs:["en","es","ru"], type:"exam"  }
        ]
      },
      {
        id: "c36",
        name: { en:"C-36 Plumbing", es:"C-36 Plomería", ru:"C-36 Сантехника" },
        courses: [
          { id:"c36-plumbing", name:{ en:"Plumbing Trade Exam", es:"Examen Trade de Plomería", ru:"Trade-экзамен сантехника (C-36)" }, langs:["en","es","ru"], type:"exam" },
          { id:"backflow", name:{ en:"Backflow Prevention Tester", es:"Probador de Prevención de Reflujo", ru:"Тестировщик защиты от обратного потока" }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "c7",
        name: { en:"C-7 Low Voltage Systems", es:"C-7 Sistemas de Bajo Voltaje", ru:"C-7 Слаботочные системы" },
        courses: [
          { id:"c7-low-voltage", name:{ en:"Low Voltage Trade Exam", es:"Examen Trade de Bajo Voltaje", ru:"Trade-экзамен слаботочки (C-7)" }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "c16",
        name: { en:"C-16 Fire Protection", es:"C-16 Protección Contra Incendios", ru:"C-16 Пожарная защита" },
        courses: [
          { id:"c16-fire-sprinkler", name:{ en:"Fire Sprinkler Trade Exam", es:"Examen Trade de Rociadores", ru:"Trade-экзамен пожарных спринклеров (C-16)" }, langs:["en","es","ru"], type:"exam" }
        ]
      }
    ]
  },
  {
    id: "transportation",
    icon: "🚛",
    name: { en:"Transportation", es:"Transporte", ru:"Транспорт" },
    subs: [
      {
        id: "dmv-noncommercial",
        name: { en:"Non-Commercial · Car & Motorcycle", es:"No comercial · Auto y Moto", ru:"Некоммерческие · авто и мото" },
        courses: [
          { id:"dmv-car",        name:{ en:"Car — Class C Knowledge Test", es:"Auto — Examen Clase C",        ru:"Авто — тест Class C"          }, langs:["en","es","ru"], type:"exam" },
          { id:"dmv-motorcycle", name:{ en:"Motorcycle — Class M1/M2",      es:"Motocicleta — Clase M1/M2",     ru:"Мотоцикл — Class M1/M2"       }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "cdl",
        name: { en:"Commercial · CDL", es:"Comercial · CDL", ru:"Коммерческие · CDL" },
        courses: [
          { id:"cdl-general",         name:{ en:"CDL General Knowledge",   es:"CDL Conocimientos Generales", ru:"CDL Общие знания"            }, langs:["en","es","ru"], type:"exam" },
          { id:"cdl-air-brakes",      name:{ en:"Air Brakes",              es:"Frenos de Aire",              ru:"Пневмотормоза (Air Brakes)"  }, langs:["en","es","ru"], type:"exam" },
          { id:"cdl-combination",     name:{ en:"Combination Vehicles",    es:"Vehículos Combinados",        ru:"Сцепка (Combination)"        }, langs:["en","es","ru"], type:"exam" },
          { id:"cdl-hazmat",          name:{ en:"Hazardous Materials (H)", es:"Materiales Peligrosos (H)",   ru:"Опасные грузы (Hazmat, H)"   }, langs:["en","es","ru"], type:"exam" },
          { id:"cdl-tanker",          name:{ en:"Tank Vehicles (N)",       es:"Vehículos Cisterna (N)",      ru:"Цистерны (Tanker, N)"        }, langs:["en","es","ru"], type:"exam" },
          { id:"cdl-doubles-triples", name:{ en:"Doubles / Triples (T)",   es:"Dobles / Triples (T)",        ru:"Двойные/тройные прицепы (T)" }, langs:["en","es","ru"], type:"exam" },
          { id:"cdl-passenger",       name:{ en:"Passenger (P)",           es:"Pasajeros (P)",               ru:"Пассажирские (P)"            }, langs:["en","es","ru"], type:"exam" },
          { id:"cdl-school-bus",      name:{ en:"School Bus (S)",          es:"Autobús Escolar (S)",         ru:"Школьный автобус (S)"        }, langs:["en","es","ru"], type:"exam" }
        ]
      }
    ]
  },
  {
    id: "beauty",
    icon: "💅",
    name: { en:"Beauty", es:"Estética", ru:"Бьюти" },
    subs: [
      {
        id: "beauty-general",
        name: { en:"General — Health & Safety", es:"General — Salud y Seguridad", ru:"Общее — здоровье и безопасность" },
        courses: [
          { id:"beauty-health-safety", name:{ en:"Health, Safety & Infection Control", es:"Salud, Seguridad y Control de Infecciones", ru:"Здоровье, безопасность и инфекционный контроль" }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "cosmetology",
        name: { en:"Cosmetology", es:"Cosmetología", ru:"Косметология" },
        courses: [
          { id:"cosmetology", name:{ en:"Cosmetologist Exam", es:"Examen de Cosmetología", ru:"Экзамен косметолога" }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "barbering",
        name: { en:"Barbering", es:"Barbería", ru:"Барбер" },
        courses: [
          { id:"barbering", name:{ en:"Barber Exam", es:"Examen de Barbero", ru:"Экзамен барбера" }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "esthetics",
        name: { en:"Esthetics (Skin Care)", es:"Estética (Cuidado de la Piel)", ru:"Эстетика (уход за кожей)" },
        courses: [
          { id:"esthetician", name:{ en:"Esthetician Exam", es:"Examen de Esteticista", ru:"Экзамен эстетиста" }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "nailcare",
        name: { en:"Nail Care (Manicurist)", es:"Cuidado de Uñas (Manicurista)", ru:"Маникюр (Nail-мастер)" },
        courses: [
          { id:"manicurist", name:{ en:"Manicurist Exam", es:"Examen de Manicurista", ru:"Экзамен мастера маникюра" }, langs:["en","es","ru"], type:"exam" }
        ]
      },
      {
        id: "electrology",
        name: { en:"Electrology", es:"Electrología", ru:"Электрология" },
        courses: [
          { id:"electrology", name:{ en:"Electrologist Exam", es:"Examen de Electrólogo", ru:"Экзамен электролога" }, langs:["en","es","ru"], type:"exam" }
        ]
      }
    ]
  }
]);
