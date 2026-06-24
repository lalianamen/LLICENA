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
          { id:"epa-608",   name:{ en:"EPA 608 Certification",    es:"Certificación EPA 608",    ru:"Сертификация EPA 608"        }, langs:["en","es","ru"], type:"exam"  },
          { id:"osha-hvac", name:{ en:"OSHA Safety (HVAC)",       es:"Seguridad OSHA (HVAC)",    ru:"Безопасность OSHA (HVAC)"    }, langs:["en","es","ru"], type:"exam"  },
          { id:"c20-guide", name:{ en:"Business Setup Guide A–Z", es:"Guía de Negocio A–Z",      ru:"Гайд открытия бизнеса A–Z"  }, langs:["en","es","ru"], type:"guide" }
        ]
      },
      {
        id: "c10",
        name: { en:"C-10 Electrical", es:"C-10 Eléctrico", ru:"C-10 Электрика" },
        courses: [
          { id:"c10-exam",  name:{ en:"C-10 Trade Exam",          es:"Examen Trade C-10",        ru:"Trade-экзамен C-10"          }, langs:["en","es","ru"], type:"exam"  }
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
    subs: [], soon: true
  }
]);
