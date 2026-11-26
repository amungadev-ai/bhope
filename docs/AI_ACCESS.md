# AI access and the monthly plan

Each reader account receives five free AI uses once, not five per month or per device. The backend owns the counter. Reinstalling the app, signing out, changing the date, or switching phones does not reset it. The allowance begins with this release; pre-existing daily request rows are not treated as successful historical trial uses.

A request reserves a free use atomically before contacting DeepSeek. Concurrent requests cannot exceed five. Provider errors, timeouts, and empty responses restore that free use. The existing daily request limit is independent: it counts attempts for abuse/cost control and resets by UTC date. The default is ten per day, configured with `AI_DAILY_LIMIT` on the server. An absent AI key or missing consent does not consume a free use.

After the trial, continued reader access is priced at KES 150 per month. Access is allowed only when a server entitlement has not expired. Unused trial credits are not replenished when an entitlement expires. Editorial staff retain access within the daily request limit for their content work.

## Current implementation

- `GET /api/v1/ai/access` returns remaining trial uses, entitlement expiry, daily allowance, and price for the signed-in account.
- The note's reflection sheet shows remaining uses and opens the plan screen when the trial is exhausted.
- More → AI access & plan explains the allowance, price, limits, and availability.
- Admin → AI access & plans shows usage and expiry. Administrators can make a documented support/complimentary adjustment, with an audit event. Editors and readers cannot change entitlements or inspect other accounts' usage.
- Subscription payments and donations remain separate. Giving does not unlock AI, and a manual access adjustment never creates a successful payment.
- Store checkout remains unavailable. The app does not claim a subscription has been purchased, charge KES 150, or start recurring payments.

## Enable purchases in a later deployment step

Keep Expo Go working for the current review. Real native in-app purchase libraries require a development build according to [Expo's guidance](https://docs.expo.dev/guides/in-app-purchases/).

For the Android store release, configure an AI monthly subscription product and its KES pricing in Google Play, then connect a supported billing integration. [Google Play's policy](https://support.google.com/googleplay/android-developer/answer/9858738) generally requires Play billing for paid digital app features unless an applicable program/exception is used. Donation merchant keys are not subscription credentials.

Before opening checkout, implement authenticated purchase initiation, server receipt verification, transaction ownership, idempotent entitlement updates, restore purchases, cancellation/expiry, renewal and refund notifications, and reconciliation. Query the store's localized price for the actual purchase button. Google Play/Apple configuration, merchant accounts, and a device development build are required to test real billing; none is configured in this repository setup.

Daily devotionals, Bible reading, reference detection, local notes, formatting, themes, and verse actions remain free. AI always requires an explicit user action and disclosure before sending note text to DeepSeek.
