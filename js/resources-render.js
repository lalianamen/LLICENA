/* LICENA — "Official resources" slot renderer (presentational glue).
   Reads window.OFFICIAL_RESOURCES (js/resources.js, owned by the resources agent —
   read-only here) and fills a slot container (#resList) with grouped external links.

   Page-agnostic: works on the landing (data-t / T) and the cabinet (data-a / TAPP)
   without touching their JS. It tracks the current UI language via the <html lang>
   attribute — both pages set document.documentElement.lang when they switch language —
   and re-renders on change via a MutationObserver, with EN fallback throughout. */
(function () {
  // Heading/label strings, scoped here so the slot is self-contained per page.
  // Pulled from whichever page i18n table exists (T on landing, TAPP on cabinet),
  // with a built-in EN/ES/RU fallback so the slot never renders blank.
  var STR = {
    en: { updated: "Updated", driving: "Driving & CDL", trades: "Trades & code",
          safety: "Safety", business: "Business & licensing", general: "General" },
    es: { updated: "Actualizado", driving: "Conducir y CDL", trades: "Oficios y código",
          safety: "Seguridad", business: "Negocios y licencias", general: "General" },
    ru: { updated: "Обновлено", driving: "Вождение и CDL", trades: "Профессии и кодексы",
          safety: "Безопасность", business: "Бизнес и лицензии", general: "Общее" }
  };
  // Group display order (cats not present in the data are simply skipped).
  var ORDER = ["driving", "trades", "safety", "business", "general"];

  function curLang() {
    var l = (document.documentElement.lang || "en").toLowerCase();
    return STR[l] ? l : "en";
  }
  function pick(obj, l) {
    if (!obj) return "";
    return obj[l] || obj.en || "";
  }
  function catLabel(cat, l) {
    var s = STR[l] || STR.en;
    return s[cat] || (STR.en[cat] || cat);
  }

  // Small inline external-link glyph. Explicit size set in CSS (.res-ext-ic)
  // — anti-regression: a prior unsized icon shipped oversized.
  var EXT_SVG =
    '<svg class="res-ext-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/>' +
    '<path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>';

  function render() {
    var slot = document.getElementById("resList");
    var data = window.OFFICIAL_RESOURCES;
    if (!slot || !data || !Array.isArray(data.items)) return;
    var l = curLang();

    // Group items by cat, preserving source order within each group.
    var groups = {};
    data.items.forEach(function (it) {
      var cat = it && it.cat ? it.cat : "general";
      (groups[cat] = groups[cat] || []).push(it);
    });

    // Cats in defined order first, then any unexpected cat appended (defensive).
    var cats = ORDER.filter(function (c) { return groups[c]; });
    Object.keys(groups).forEach(function (c) {
      if (cats.indexOf(c) === -1) cats.push(c);
    });

    var html = "";
    cats.forEach(function (cat) {
      html += '<div class="res-group">';
      html += '<div class="res-group-hd">' + escapeHtml(catLabel(cat, l)) + '</div>';
      html += '<ul class="res-items">';
      groups[cat].forEach(function (it) {
        var title = escapeHtml(pick(it.title, l));
        var src = escapeHtml(it.source || "");
        var url = encodeURI(it.url || "#");
        html +=
          '<li><a class="res-link" href="' + url + '" target="_blank" rel="noopener">' +
            '<span class="res-link-main">' +
              '<span class="res-title">' + title + "</span>" +
              (src ? '<span class="res-src">' + src + "</span>" : "") +
            "</span>" + EXT_SVG +
          "</a></li>";
      });
      html += "</ul></div>";
    });

    slot.innerHTML = html;

    // "Updated YYYY-MM" line, rendered subtly under the list.
    var upWrap = document.getElementById("resUpdated");
    if (upWrap && data.updated) {
      var s = STR[l] || STR.en;
      upWrap.textContent = s.updated + " " + data.updated;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function init() {
    render();
    // Re-render when the page switches language (both pages update <html lang>).
    var obs = new MutationObserver(render);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
