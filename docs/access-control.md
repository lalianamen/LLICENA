# Access control: one code, one device

The goal: stop people from buying one subscription and sharing it. The chosen
model avoids a shareable username/password entirely.

## The model

1. **Payment → code.** After a successful payment (Stripe), the backend creates
   a subscription record and generates a unique, one-time **activation code**
   (format `XXXX-XXXX-XXXX`).
2. **Activation → device binding.** The user enters the code on their device.
   The device holds a random **device token** (generated once, stored on the
   device). On activation the backend binds the code to that device token.
   One code = one active device.
3. **Every load is verified server-side.** The app sends its device token; the
   backend checks it matches the bound device for an active subscription.
   Mismatch → access denied.
4. **Move device, within limits.** Real users change phones. A self-service
   "move access to this device" re-binds to the new token, but is capped
   (e.g. 2× per month) so a code can't be rotated endlessly between people.

## Why not username + password?

A password is the thing that gets passed around. With a code that **consumes
itself into a device binding on first use**, sharing the code only helps
whoever activates it first — everyone else is locked out.

## Honest limitations

- **Client-side cannot enforce this.** Clearing storage or using a second
  browser defeats any browser-only check. Enforcement must live on the backend.
  The prototype simulates the binding so the UX can be reviewed.
- The device token is **not** a hardware fingerprint; it's a token the app
  stores. That's intentional — hardware fingerprinting is fragile and invasive.
  The server-side "one active token per subscription" rule is what does the work.

## Suggested implementation (Supabase example)

Tables (simplified):

```
subscriptions(id, email, plan, status, stripe_customer_id, current_period_end)
access_codes(code PK, subscription_id, used_at, bound_device_id, month_moves, month_anchor)
```

Flow:
- Stripe webhook `checkout.session.completed` → insert `subscriptions` row +
  generate `access_codes` row (unused).
- `POST /activate {code, device_id}` → if code unused OR (device matches), bind
  and return a session token; else return `409 device_conflict`.
- `POST /move {code, device_id}` → if `month_moves < limit`, rebind + increment;
  else `429 move_limit`.
- App startup: `POST /session {device_id}` validates before showing content.

## Hardening (optional)

- Limit concurrent sessions per subscription.
- Watermark on-screen content with the account email/code to discourage
  screen-recording and redistribution.
- Rate-limit `/activate` and `/move`.

## Course entitlements — what is actually built today (beta)

The code+device model above is the **future** anti-sharing design. What ships now
is simpler and account-based:

- A course you "own" is a row in `user_courses(user_id, course_id, status)`.
  The course player (`course.html?id=<id>`) checks for a session **and** a matching
  `user_courses` row before showing content; no row → redirect to the cabinet.
- Supabase **Row-Level Security** restricts each user to their own rows.
- All grants flow through one function, `grantCourseAccess()` in `js/app-cabinet.js`.

### What MUST change before charging money

1. **Move the grant server-side.** Today, during the free beta, the client writes
   the `active` row itself, and the RLS `courses: own insert` policy *allows* any
   authenticated user to self-grant any `course_id` — i.e. for free. That is correct
   for beta but is a hole once courses are paid. When payment goes live:
   - A Stripe webhook (`checkout.session.completed`) writes the `user_courses` row
     using the service role.
   - Drop the `courses: own insert` (and self-`update`) RLS policy so the client can
     no longer grant itself access. `grantCourseAccess()` becomes a call to that
     backend instead of a direct upsert — it is the only client code that changes.

2. **Decide on content protection.** The question banks are static files
   (`js/questions/<id>.js`) served publicly. The ownership check gates the *UI*, not
   the *data*: anyone who knows the URL can fetch a course file directly, paid or not.
   - Acceptable for beta / low-value content.
   - For real protection, serve questions through an authenticated endpoint
     (e.g. a Supabase Edge Function) that verifies the `user_courses` row before
     returning the data, instead of shipping them as public static files.
