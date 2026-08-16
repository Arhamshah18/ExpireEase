# ExpireEase — Alert Engine & Notifications

**Owner:** Kriti Singh — Alert Engine & Notifications Lead

Implements synopsis Sections 6.3 ("Shelf-Life Percentage Formula") and 6.4
("Alert Stage Bands"), plus the WhatsApp-related rows of the Section 7
ambiguity table.

## What this module owns

| Requirement (from synopsis) | File |
|---|---|
| Shelf-life % formula, continuous recalculation | `src/shelfLifeCalculator.js`, `src/jobs/recalculateShelfLifeJob.js` |
| 7-stage exclusive alert bands | `src/config/alertThresholds.js`, `src/alertStageClassifier.js` |
| Persisted "alert sent" / send-once flag | `src/alertStateMachine.js`, `src/repositories/itemsRepository.js` |
| WhatsApp Business API integration | `src/notifications/whatsappService.js` |
| In-app fallback when no verified WhatsApp number | `src/notifications/pushService.js`, `src/notifications/notificationDispatcher.js` |

## Architecture

```
                  ┌───────────────────────────┐
  every 15 min →  │ recalculateShelfLifeJob.js│
                  └─────────────┬─────────────┘
                                │ for each active item
                                ▼
      shelfLifeCalculator.js  →  % remaining
                                ▼
      alertStageClassifier.js →  1 of 7 stages
                                ▼
      alertStateMachine.js    →  crossed into CRITICAL? already sent?
                                ▼
             ┌──────────────────┴───────────────────┐
             ▼                                       ▼
   itemsRepository.js                    notificationDispatcher.js
   (persist stage + flag)                 ├─ pushService.js (always)
                                           └─ whatsappService.js (if verified)
```

The classifier and state machine are pure functions with no I/O — they're
unit tested directly in `test/alertEngine.test.js` against the exact
boundary values and edge cases from the synopsis, so Arham's integration
test suite can import and reuse them rather than re-deriving the rules.

## Why the item-level fields are shaped this way

Each `inventory/{itemId}` Firestore document gains four fields this module
owns (in addition to whatever Anurag/Member1/Member3 already write):

- `alertStage` — last computed stage, one of `GREEN | PINK | YELLOW | ORANGE | RED | CRITICAL | EXPIRED`
- `criticalAlertSent` — boolean, flips true the first time the item crosses into CRITICAL
- `criticalAlertSentAt` — server timestamp, for auditing/debugging spam complaints
- `lastRecalculatedAt` — server timestamp, so you can tell a stale item (recalculation job broken) from a genuinely fresh GREEN item

And each `users/{userId}` document is *read* (not written, except for the
prompt flag) for:

- `whatsappNumber`, `whatsappVerified` — written by Anurag's auth module
- `fcmTokens` — written by whichever module registers the device for push
- `promptAddWhatsapp` — written by this module when a CRITICAL alert had to fall back to push-only

## Setup

```bash
npm install
```

Environment variables (set via `firebase functions:config:set` or `.env`
locally with `firebase emulators:start`):

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886      # Twilio sandbox number, or your approved WABA number
CRITICAL_ALERT_TEMPLATE_SID=HXxxxxxxxx...       # approved WhatsApp template SID (required outside sandbox)
RECALC_SCHEDULE_CRON=every 15 minutes           # optional override
```

WhatsApp Business API **requires an approved message template** for any
business-initiated message (which every CRITICAL alert is, since it's
outside a user-initiated 24h session). Register a template like:

> "{{1}} is at {{2}}% shelf life remaining and will expire soon. Open
> ExpireEase to take action."

in the Twilio console (or Meta Business Manager if going direct), and put
its SID in `CRITICAL_ALERT_TEMPLATE_SID`. Without it, `whatsappService.js`
falls back to a free-form `body` message, which works in the Twilio sandbox
for local testing but **will be rejected by WhatsApp in production**.

## Deploying

This module is written as a Firebase v2 scheduled Cloud Function (matches
the project's existing Firebase/Firestore stack — see Member 3's
`src/services/firebase.js`). Merge the export into the shared
`backend/functions/index.js`:

```js
exports.recalculateShelfLife = require('./alertEngine').recalculateShelfLife;
```

then:

```bash
firebase deploy --only functions:recalculateShelfLife
```

### If the team moves to plain Node/Express + PostgreSQL instead

`src/jobs/bullmqAlternative.js` is a drop-in replacement scheduler using
BullMQ + Redis instead of Firebase's scheduler. It calls the exact same
`runRecalculationPass()`, so none of the alert logic changes — only
`itemsRepository.js` / `usersRepository.js` would need Postgres
implementations swapped in behind the same function signatures.

## Testing

```bash
npm test
```

Covers every exact boundary value (50, 30, 25, 15, 10, 0 — inclusive on the
lower band per the synopsis's `>` / `<=` wording), send-once enforcement,
the "skipped a band between ticks" case, and the "don't alert on data
entered already expired" edge case.

## Open integration points for other leads

- **Anurag (Auth):** needs to write `whatsappVerified: true` only after
  actual OTP/verification, not just on number entry — this module trusts
  that flag completely.
- **Angel (Waste log):** should listen for `status` flipping to `expired`
  on an item this module writes, and move unused household items into the
  Waste log at that point (Section 6.6).
- **Arham (Backend/DB):** the Firestore field names above should match
  whatever the finalized schema calls them — repositories are the only
  files that would need touching if field names diverge.
