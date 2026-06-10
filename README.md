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

Front-end prototype (no backend yet). Accounts, passwords, device binding and
the email code are **simulated in the browser** so the whole flow can be
clicked through. None of it is real security — that arrives with the backend.

> **DEMO ONLY — remove before production:** a static test login is hardcoded in
> `js/app.js`:
>
> ```
> Email:    test@licena.app
> Password: test1234
> ```

## How it works

- `index.html` — **Log in / Register**. Login accepts the demo credentials
  above (or a locally-registered account). On success → opens the cabinet.
- `app.html` — **the cabinet** (requires a session):
  - **Practice** — study modes + topics. The questions open **only on an added
    device** (up to 3). First time on a new device → "Use this device" adds it.
  - **My tests** — your unlocked courses.
  - **Add a test** — unlock more courses. **Free while testing — no payment yet**
    (Stripe comes later; the "Add" button just activates the course).
  - **Account** — your devices, with **Remove** gated by an email code
    (simulated — the code is shown on screen instead of emailed).

### Anti-sharing model

The password opens the **cabinet shell** on any device, but the **questions**
open only on devices added to the account (max 3, bound by a device token —
**not** by IP). Removing a device requires an email code, which blocks the
"unbind / rebind on a loop" trick. There is no password that unlocks content by
itself. See `docs/access-control.md`. Real enforcement belongs on the backend.

## Project structure

```
licena/
├── index.html            # log in / register (static demo login)
├── app.html              # cabinet: practice / my tests / add test / account
├── css/
│   ├── styles.css        # base + tokens + auth page
│   └── cabinet.css       # cabinet + device list + remove modal
├── js/
│   ├── i18n.js           # auth-page translations (en/es/ru/vi)
│   ├── i18n-app.js       # cabinet translations (en/es/ru/vi)
│   ├── app.js            # auth logic (DEMO static login)
│   └── app-cabinet.js    # cabinet logic + device gate + email-code removal
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

Log in with the demo credentials → cabinet → "Use this device" in Practice to
unlock topics. Try "Add a test" and the device "Remove" flow in Account.

## Deploy

- **GitHub Pages:** Settings → Pages → deploy from `main` / root
- **Vercel / Netlify:** import the repo, no build step

## Roadmap

1. **Backend** (Supabase): real accounts + hashed passwords, server-side device
   binding, real email codes. Remove the hardcoded demo login.
2. **Payments:** Stripe Checkout on "Add a test".
3. **Practice engine:** quiz UI reading the question bank, feedback + explanations.
4. **More verticals & full i18n** (incl. VI/KO/ZH question content).
5. **2FA** (optional) on device removal.

## Disclaimer

Practice questions are original, in the style of the exam — **not** copied from
any official exam. Verify all figures against the current CSLB study guide
before publishing, as the law changes.
