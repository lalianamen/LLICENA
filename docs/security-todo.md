# Security TODO / audit notes

> Self-note to come back to. Audit done 2026-06-24 on the static front-end +
> Supabase backend. Nothing here is on fire for the **free beta** — user data is
> protected by Supabase Auth + RLS, and no secrets are committed. The items below
> are what to do before (a) charging money and (b) having a real user base.
>
> How to read the "Defer?" line: the *code change* is easy later in almost every
> case. What matters is whether **waiting itself causes damage that a later fix
> can't undo** (an exposure clock) or whether the item is **coupled to turning on
> payments** (a hard blocker, not background debt).

---

## 🔴 Blockers — MUST ship in the same release as payments (Stripe)

- [ ] **1. Client can self-grant any course for free.**
  - Where: RLS policy `courses: own insert` (+ `own update`) in `docs/schema.sql`
    and `docs/migration-2026-06-22-course-status.sql`; grant happens in
    `grantCourseAccess()` at `js/app-cabinet.js:273` (already flagged as the
    SINGLE change point in the comment at `:266`).
  - Fix: a Stripe webhook (`checkout.session.completed`) writes the `user_courses`
    row via the **service_role** key (server-side); then **drop** the
    `courses: own insert` / `own update` RLS policies so the client can no longer
    self-grant. `grantCourseAccess()` becomes a call to that backend — only client
    code that changes.
  - Defer? Yes, but it is **coupled to payments**. Zero risk while courses are
    free (nothing to steal). Never let a paid transaction go live without it.

- [ ] **2. Question banks are public static files.**
  - Where: `js/questions/<id>.js` served as public static; loaded by
    `loadCourseData()` / `loadScript()` at `js/app-course.js:32-43`. Ownership
    check at `js/app-course.js:472-473` only gates the **UI**, not the data —
    anyone with the URL fetches the content, paid or not.
  - Fix: serve questions through an authenticated endpoint (Supabase Edge
    Function) that verifies the `user_courses` row before returning data, instead
    of shipping them as public static files.
  - Defer? Code is deferrable, but **the exposure clock is already running** —
    content is copyable *right now*, and locking it later does not un-leak what was
    already scraped. If the question bank is the core asset, treat this as urgent.

---

## 🟠 Hardening — cheap; do before a real user base (blast radius scales with users)

- [ ] **3. No CSP, no SRI on the CDN script.**
  - Where: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">`
    in `index.html:238`, `app.html:95`, `course.html:75` — floating major `@2`,
    no `integrity` hash.
  - Fix: pin an exact version (e.g. `@2.39.x`) + add an SRI `integrity` attribute;
    add a Content-Security-Policy (meta tag or host header). Optionally self-host
    supabase-js.
  - Defer? Trivial to add anytime. Risk is low-probability / high-impact (CDN or
    package compromise → full session takeover) and grows with user count. So
    cheap there's little reason to wait.

- [ ] **4. `courseId` from URL flows into a script path.**
  - Where: `courseId = params.get("id")` at `js/app-course.js:6`, used raw in
    `loadScript("js/questions/" + id + ".js")` at `js/app-course.js:35,40`.
  - Fix: only `loadScript` when the catalog lookup (`courseMeta`,
    `js/app-course.js:52-59`) actually resolves the id — i.e. validate against
    known course ids before building the path. Same-origin only today, so low
    practical risk; defense-in-depth.
  - Defer? Fire-and-forget — one-line guard, no coupling, safe anytime.

- [ ] **5. No client-side password policy.**
  - Where: `doRegister()` at `js/app.js:60-77` only checks the password is
    non-empty; relies on Supabase default (min 6 chars).
  - Fix: enforce a stronger minimum length / strength hint client-side and in
    Supabase Auth settings.
  - Defer? Code is easy later, but weak passwords created in the meantime persist
    until the user resets — so the longer it waits, the more weak passwords
    accumulate.

---

## 🟡 Docs & hygiene — fire-and-forget, no rot, do whenever

- [ ] **6. Docs describe security that isn't built.** `README.md` (anti-sharing
  section) and `docs/access-control.md` describe device binding (max 3 devices,
  email-code device removal). Not implemented: the `devices` table is unused and
  there is no device UI in `app.html` / `js/app-cabinet.js`. Actual anti-sharing
  today = login + RLS only; whoever has the email+password gets in from any
  device. Either build it or correct the docs so the posture isn't overstated.

- [ ] **7. Stale demo-login note in README.** `README.md` (~lines 20-26) still
  documents a hardcoded demo login `test@licena.app` / `test1234`, but it no
  longer exists in `js/app.js` (real Supabase auth now). Remove the block so it
  doesn't imply a backdoor.

- [ ] **8. No `.gitignore`.** Repo root has none (README references one). Add it —
  covering `.env*` and similar — **before** any `.env` is ever created. It only
  protects *future* commits; it cannot undo a secret that was already committed.

- [ ] **9. Delete leftover test user.** `armenlalian+llicena-dbtest@gmail.com`
  (auth.users id `4ae54328-517f-43b8-91df-74c4303ac5bf`) was created during the
  DB-connection test. Remove via Supabase Dashboard → Authentication → Users
  (cascades to `profiles` / `user_courses` via `on delete cascade`).

---

## What's already solid (verified, don't re-litigate)

- RLS enabled on all 3 tables with owner-scoped policies; anonymous reads return
  `[]` (verified against the live REST API).
- Only the publishable/anon key is in the client (`js/supabase-client.js`); no
  `service_role` key anywhere in the repo or git history (verified).
- Email confirmation required (`mailer_autoconfirm: false`, verified live).
- XSS discipline is good: user-controlled values (`profile.name` / `email`) use
  `textContent`; question content is escaped via `esc()` before `innerHTML` in
  `js/app-course.js`. No user-controlled XSS sink found.
