# LICENA

Multilingual practice tool for U.S. licensing exams — starting with the
California **CSLB Law & Business** exam, with more trades and license types
(C-20 HVAC, cosmetology / barber / nails, etc.) planned.

> **LICENA is a practice tool, not a school.** It provides practice questions
> for studying. It is **not an accredited school**, is **not affiliated with
> the CSLB** or any state board, and **does not guarantee** that anyone will
> pass any exam.

`LICENA` is a working name — change it freely.

## Status

Live beta on a Supabase backend. Real accounts via Supabase Auth (hashed
passwords, required email confirmation, password reset), course data and
entitlements in Postgres behind row-level security, and a few Edge Functions
(support assistant, ticket status). Courses are free during the beta; payments
(Stripe) and a couple of pre-paywall hardening items are still to come.

## How it works

- `index.html` — **Log in / Register** (Supabase Auth). Registration requires
  email confirmation; there's also a password-reset flow. On success → cabinet.
- `app.html` — **the cabinet** (requires a session):
  - **My courses** — your active courses and study materials.
  - **Catalog** — add more courses. **Free during the beta — no payment yet**
    (Stripe comes later; "Add" just activates the course).
  - **Account** — name, email, study language, and "Leave a review".
- `course.html` — **the course player** — quiz with blocks/sections,
  explanations, and a study-language switch.

### Anti-sharing model

An account-level device limit, **server-enforced** by the `register_device()`
Postgres function (security definer): **5 devices per account**, bound by a
per-device token (**not** by IP). When the limit is reached, swapping in a new
device is allowed **at most once per 30 days**, and the most-dormant device is
auto-evicted to make room. The client (`js/devices.js`) is a thin caller that
**fails open** — a backend hiccup never locks anyone out. At login a new device
gets an "Add this device?" prompt; if no swap is allowed yet, a neutral "device
limit reached" screen is shown. See `docs/access-control.md`.

## Project structure

```
licena/
├── index.html            # log in / register (Supabase Auth)
├── app.html              # cabinet: practice / my tests / add test / account
├── css/
│   ├── styles.css        # base + tokens + auth page
│   └── cabinet.css       # cabinet styles
├── js/
│   ├── i18n.js           # auth-page translations (en/es/ru/vi)
│   ├── i18n-app.js       # cabinet translations (en/es/ru/vi)
│   ├── app.js            # auth logic (Supabase Auth)
│   └── app-cabinet.js    # cabinet logic
│   └── devices.js        # anti-sharing device gate (register_device RPC caller)
├── data/
│   └── questions.example.json   # question schema for the practice bank
├── docs/
│   └── access-control.md
└── .gitignore
```

## Run locally

Static site — open `index.html`, or serve it:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Register an account (or log in) → cabinet → add a course from the Catalog →
open it in the course player.

## Deploy

- **GitHub Pages:** Settings → Pages → deploy from `main` / root
- **Vercel / Netlify:** import the repo, no build step

## Roadmap

1. **Payments:** Stripe Checkout on "Add", with server-side entitlement.
2. **Protect question banks** behind an authenticated endpoint (they're public
   static files today).
3. **More verticals & languages.**

## Disclaimer

Practice questions are original, in the style of the exam — **not** copied from
any official exam. Verify all figures against the current CSLB study guide
before publishing, as the law changes.
