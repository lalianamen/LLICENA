/* LICENA — course catalog.
   Each course has: id, name (4 langs), langs[], type ("exam"|"guide"), soon (bool). */
const CATALOG = [
  {
    id: "construction",
    icon: "🏗️",
    name: { en:"Construction", es:"Construcción", ru:"Строительство", vi:"Xây dựng" },
    subs: [
      {
        id: "cslb-general",
        name: { en:"CSLB General", es:"CSLB General", ru:"CSLB Общее", vi:"CSLB Chung" },
        courses: [
          { id:"cslb-law",  name:{ en:"Law & Business Exam",      es:"Examen Ley y Negocios",    ru:"Экзамен Law & Business",        vi:"Thi Luật & Kinh Doanh"      }, langs:["en"], type:"exam"  },
          { id:"asbestos",  name:{ en:"Asbestos Open-Book Exam",  es:"Examen de Asbesto",        ru:"Экзамен по асбесту",            vi:"Thi Amiăng"                 }, langs:["en"], type:"exam"  }
        ]
      },
      {
        id: "c20",
        name: { en:"C-20 HVAC", es:"C-20 HVAC", ru:"C-20 HVAC", vi:"C-20 HVAC" },
        courses: [
          { id:"c20-exam",  name:{ en:"C-20 Trade Exam",          es:"Examen Trade C-20",        ru:"Trade-экзамен C-20",            vi:"Thi Trade C-20"             }, langs:["en","ru"], type:"exam"  },
          { id:"epa-608",   name:{ en:"EPA 608 Certification",    es:"Certificación EPA 608",    ru:"Сертификация EPA 608",          vi:"Chứng chỉ EPA 608"          }, langs:["en","es","ru","vi"], type:"exam"  },
          { id:"osha-hvac", name:{ en:"OSHA Safety (HVAC)",       es:"Seguridad OSHA (HVAC)",    ru:"Безопасность OSHA (HVAC)",      vi:"An toàn OSHA (HVAC)"        }, langs:["en","es","ru","vi"], type:"exam"  },
          { id:"c20-guide", name:{ en:"Business Setup Guide A–Z", es:"Guía de Negocio A–Z",      ru:"Гайд открытия бизнеса A–Z",    vi:"Hướng dẫn kinh doanh A–Z"  }, langs:["en","es","ru","vi"], type:"guide" }
        ]
      }
    ]
  },
  {
    id: "transportation",
    icon: "🚛",
    name: { en:"Transportation", es:"Transporte", ru:"Транспорт", vi:"Vận tải" },
    subs: [], soon: true
  },
  {
    id: "beauty",
    icon: "💅",
    name: { en:"Beauty", es:"Estética", ru:"Бьюти", vi:"Làm đẹp" },
    subs: [], soon: true
  }
];
