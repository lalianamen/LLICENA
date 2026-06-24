/* LICENA — course catalog.
   States: every category belongs to a state. California is live; others coming soon.
   Each course has: id, name (3 langs), langs[], type ("exam"|"guide"). */
const STATES = [
  { id:"ca", abbr:"CA", flag:"🌴", name:{ en:"California", es:"California", ru:"Калифорния" }, active:true  },
  { id:"tx", abbr:"TX", flag:"⭐", name:{ en:"Texas",      es:"Texas",      ru:"Техас"      }, active:false },
  { id:"fl", abbr:"FL", flag:"🌞", name:{ en:"Florida",    es:"Florida",    ru:"Флорида"    }, active:false },
  { id:"ny", abbr:"NY", flag:"🗽", name:{ en:"New York",   es:"Nueva York", ru:"Нью-Йорк"   }, active:false }
];

const CATALOG = [
  {
    id: "construction",
    icon: "🏗️",
    state: "ca",
    name: { en:"Construction", es:"Construcción", ru:"Строительство" },
    subs: [
      {
        id: "cslb-general",
        name: { en:"CSLB General", es:"CSLB General", ru:"CSLB Общее" },
        courses: [
          { id:"cslb-law",  name:{ en:"Law & Business Exam",      es:"Examen Ley y Negocios",    ru:"Экзамен Law & Business"      }, langs:["en","ru"], type:"exam"  },
          { id:"asbestos",  name:{ en:"Asbestos Open-Book Exam",  es:"Examen de Asbesto",        ru:"Экзамен по асбесту"                 }, langs:["en"], type:"exam"  }
        ]
      },
      {
        id: "c20",
        name: { en:"C-20 HVAC", es:"C-20 HVAC", ru:"C-20 HVAC" },
        courses: [
          { id:"c20-exam",  name:{ en:"C-20 Trade Exam",          es:"Examen Trade C-20",        ru:"Trade-экзамен C-20"             }, langs:["en","ru"], type:"exam"  },
          { id:"epa-608",   name:{ en:"EPA 608 Certification",    es:"Certificación EPA 608",    ru:"Сертификация EPA 608"          }, langs:["en","es","ru"], type:"exam"  },
          { id:"osha-hvac", name:{ en:"OSHA Safety (HVAC)",       es:"Seguridad OSHA (HVAC)",    ru:"Безопасность OSHA (HVAC)"        }, langs:["en","es","ru"], type:"exam"  },
          { id:"c20-guide", name:{ en:"Business Setup Guide A–Z", es:"Guía de Negocio A–Z",      ru:"Гайд открытия бизнеса A–Z"  }, langs:["en","es","ru"], type:"guide" }
        ]
      },
      {
        id: "c10",
        name: { en:"C-10 Electrical", es:"C-10 Eléctrico", ru:"C-10 Электрика" },
        courses: [
          { id:"c10-exam",  name:{ en:"C-10 Trade Exam",          es:"Examen Trade C-10",        ru:"Trade-экзамен C-10"             }, langs:["en","ru"], type:"exam"  }
        ]
      }
    ]
  },
  {
    id: "transportation",
    icon: "🚛",
    state: "ca",
    name: { en:"Transportation", es:"Transporte", ru:"Транспорт" },
    subs: [], soon: true
  },
  {
    id: "beauty",
    icon: "💅",
    state: "ca",
    name: { en:"Beauty", es:"Estética", ru:"Бьюти" },
    subs: [], soon: true
  }
];
