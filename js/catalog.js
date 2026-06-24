/* LICENA — course catalog (registry).
   STATES lists every state (few, added rarely). Each state's courses live in their
   own file js/catalog/<state>.js, which calls registerState(...) to push its
   categories into CATALOG.

   Scaling rules:
   - Add a COURSE   → edit only that state's catalog file + drop js/questions/<id>.js.
                      (course.html is never touched — content is lazy-loaded by id.)
   - Add a STATE    → new js/catalog/<state>.js + a STATES entry here + one <script>
                      tag in app.html and course.html.
   Each course: id, name (3 langs: en/es/ru), langs[] (which study langs exist),
   type ("exam"|"guide"). The course id is the single key that ties together the
   catalog entry, js/questions/<id>.js, the user_courses access row and resources. */
const STATES = [
  { id:"ca", abbr:"CA", flag:"🌴", name:{ en:"California", es:"California", ru:"Калифорния" }, active:true  },
  { id:"tx", abbr:"TX", flag:"⭐", name:{ en:"Texas",      es:"Texas",      ru:"Техас"      }, active:false },
  { id:"fl", abbr:"FL", flag:"🌞", name:{ en:"Florida",    es:"Florida",    ru:"Флорида"    }, active:false },
  { id:"ny", abbr:"NY", flag:"🗽", name:{ en:"New York",   es:"Nueva York", ru:"Нью-Йорк"   }, active:false }
];

// Populated by js/catalog/<state>.js files, which load right after this script.
const CATALOG = [];

// A state file calls this with its category list; we stamp the state id onto every
// category so the rest of the app can resolve a course back to its state.
function registerState(stateId, categories){
  (categories || []).forEach(cat => { cat.state = stateId; CATALOG.push(cat); });
}
