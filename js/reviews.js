/* LICENA — landing reviews. Pulls APPROVED reviews and shows a random few in the
   testimonials grid. If there are none (or anything fails), the testimonials
   section hides itself — so the page never shows placeholder/fake content. */
(function () {
  function esc(s) { var e = document.createElement("div"); e.textContent = s == null ? "" : s; return e.innerHTML; }
  function initials(name) {
    if (!name) return "★";
    var p = String(name).trim().split(/\s+/);
    var s = (p[0] ? p[0][0] : "") + (p[1] ? p[1][0] : "");
    return s.toUpperCase() || "★";
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function card(v) {
    var meta = [v.exam, v.city].filter(Boolean).map(esc).join(" · ");
    return '<div class="tcard">' +
      '<div class="tcard-body">“' + esc(v.body) + '”</div>' +
      '<div class="tcard-author"><div class="tcard-avatar">' + esc(initials(v.name)) + "</div><div>" +
      '<div class="tcard-name">' + esc(v.name || "") + "</div>" +
      (meta ? '<div class="tcard-meta">' + meta + "</div>" : "") +
      "</div></div></div>";
  }
  async function load() {
    var grid = document.getElementById("testiGrid");
    var section = document.getElementById("testiSection");
    var hide = function () { if (section) section.style.display = "none"; };
    if (!grid || typeof supa === "undefined") return hide();
    try {
      var r = await supa.from("reviews").select("name,exam,city,body").eq("status", "approved");
      var rows = (r && r.data) || [];
      if (!rows.length) return hide();
      grid.innerHTML = shuffle(rows.slice()).slice(0, 4).map(card).join("");
      if (section) section.style.display = "";   // reveal only when real reviews exist
    } catch (_) { hide(); }
  }
  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
})();
