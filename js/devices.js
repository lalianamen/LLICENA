/* LICENA — device gate (anti-sharing), client side.
   The real enforcement is the server-side register_device() RPC; this is the
   thin caller. It FAILS OPEN: if the RPC errors or isn't deployed yet, we treat
   it as 'ok' and let the user in — anti-sharing is best-effort and we never lock
   anyone out over a backend hiccup. */
(function () {
  function token() {
    var k = "lp:device", v = null;
    try { v = localStorage.getItem(k); } catch (_) {}
    if (!v) {
      v = (self.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
      try { localStorage.setItem(k, v); } catch (_) {}
    }
    return v;
  }

  // Dry run (confirm=false) → 'ok' | 'add' | 'swap' | 'blocked'. Fails open to 'ok'.
  async function check(supa) {
    try {
      var r = await supa.rpc("register_device", { p_token: token(), p_confirm: false });
      if (r.error) return "ok";
      return r.data || "ok";
    } catch (_) { return "ok"; }
  }

  // Commit (confirm=true) → 'ok' | 'blocked'. Fails open to 'ok'.
  async function commit(supa) {
    try {
      var r = await supa.rpc("register_device", { p_token: token(), p_confirm: true });
      if (r.error) return "ok";
      return r.data || "ok";
    } catch (_) { return "ok"; }
  }

  // Backstop for app.html / course.html: if this session's device isn't
  // registered (e.g. a copied session), sign out and bounce to the login gate.
  async function backstop(supa) {
    var s = await check(supa);
    if (s !== "ok") {
      try { await supa.auth.signOut(); } catch (_) {}
      location.href = "index.html";
      return false;
    }
    return true;
  }

  window.LICENA_devices = { token: token, check: check, commit: commit, backstop: backstop };
})();
