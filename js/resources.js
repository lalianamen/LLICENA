/* Official resources & articles for the landing + cabinet "Official resources" slot.
   Owned ONLY by the `resources` subagent (.claude/agents/resources.md): it re-validates
   these links monthly and adds official ones. Rendered by js/resources-render.js (design lane).
   Never invent a URL — confirmed official / primary sources only. */
window.OFFICIAL_RESOURCES = {
  updated: "2026-06",
  items: [
    { title: { en: "California Driver Handbook", es: "Manual del Conductor de California", ru: "Справочник водителя Калифорнии" },
      url: "https://www.dmv.ca.gov/portal/handbook/california-driver-handbook/", source: "California DMV", cat: "driving" },
    { title: { en: "California Commercial Driver Handbook (CDL)", es: "Manual del Conductor Comercial (CDL)", ru: "Коммерческий справочник водителя (CDL)" },
      url: "https://www.dmv.ca.gov/portal/handbook/commercial-driver-handbook/", source: "California DMV", cat: "driving" },
    { title: { en: "California Motorcycle Handbook", es: "Manual de Motociclistas de California", ru: "Справочник мотоциклиста Калифорнии" },
      url: "https://www.dmv.ca.gov/portal/file/motorcycle-driver-handbook-pdf/", source: "California DMV", cat: "driving" },
    { title: { en: "TSA — Hazmat Endorsement", es: "TSA — Endoso de Materiales Peligrosos", ru: "TSA — допуск Hazmat" },
      url: "https://www.tsa.gov/for-industry/hazmat-endorsement", source: "TSA", cat: "driving" },
    { title: { en: "CSLB — Contractors State License Board", es: "CSLB — Junta de Licencias de Contratistas", ru: "CSLB — лицензии подрядчиков" },
      url: "https://www.cslb.ca.gov", source: "CSLB", cat: "trades" },
    { title: { en: "CSLB Law Book (2026)", es: "Libro de Leyes CSLB (2026)", ru: "Свод законов CSLB (2026)" },
      url: "https://www.cslb.ca.gov/Resources/GuidesAndPublications/2026/2026_CSLB_Law_Book.pdf", source: "CSLB", cat: "trades" },
    { title: { en: "NFPA 70 — National Electrical Code", es: "NFPA 70 — Código Eléctrico Nacional", ru: "NFPA 70 — Национальный электротехнический кодекс" },
      url: "https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70", source: "NFPA", cat: "trades" },
    { title: { en: "California Business Registration (bizfile)", es: "Registro de Negocios de California (bizfile)", ru: "Регистрация бизнеса в Калифорнии (bizfile)" },
      url: "https://bizfileonline.sos.ca.gov", source: "CA Secretary of State", cat: "business" },
    { title: { en: "IRS — Apply for an EIN", es: "IRS — Solicitar un EIN", ru: "IRS — получить EIN" },
      url: "https://www.irs.gov/ein", source: "IRS", cat: "business" },
    { title: { en: "California EDD — Payroll Taxes", es: "EDD de California — Impuestos de Nómina", ru: "EDD Калифорнии — налоги с зарплат" },
      url: "https://edd.ca.gov", source: "California EDD", cat: "business" },
    { title: { en: "California CDTFA — Seller's Permit", es: "CDTFA de California — Permiso de Vendedor", ru: "CDTFA Калифорнии — разрешение продавца" },
      url: "https://www.cdtfa.ca.gov", source: "California CDTFA", cat: "business" }
  ]
};
