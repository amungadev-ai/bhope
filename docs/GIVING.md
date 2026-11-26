# Giving setup and validation

Giving is optional and never unlocks content. All amounts currently use whole Kenyan shillings, KES 10–50,000. The API stores integer minor units and sends Paystack minor units; M-Pesa receives whole shillings.

## Initial deployment

Deploy the API and run both SQL migrations. Keep all merchant credentials blank until HTTPS, account access, database backups, and the application domain work. Set `APP_URL=https://bhope-api.billucsolutions.co.ke` without an `/api/v1` suffix. Credentials belong in private server configuration. There are no live merchant credentials in Git.

## M-Pesa Daraja

Configure `MPESA_ENV=sandbox`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, and `MPESA_PASSKEY` using the Daraja sandbox credentials for the same app. `MPESA_TRANSACTION_TYPE` defaults to `CustomerPayBillOnline`; use the transaction type approved for your shortcode. The API chooses the sandbox or production Safaricom base URL from `MPESA_ENV`.

The API supplies the HTTPS callback URL per request:

```text
https://bhope-api.billucsolutions.co.ke/api/v1/payments/mpesa/callback/{donation-id}/{receipt-token}
```

The callback checks the transaction ID and confirms the outcome using STK query with Safaricom credentials. It does not trust the callback result alone. Treat callback URLs/tokens as private; avoid logging request paths containing receipt tokens. Never request an M-Pesa PIN inside the app.

Use the official [Daraja portal](https://developer.safaricom.co.ke/) to create/configure the merchant application and verify the current onboarding requirements. Move to production only after sandbox success, cancellation, timeout, and repeated-callback checks, and production shortcode approval.

## Paystack cards

Set a test `PAYSTACK_SECRET_KEY` for the Kenyan merchant account. If the Paystack dashboard provides a webhook signing secret, set the complete `PAYSTACK_WEBHOOK_SECRET` on the server. Configure this webhook URL in Paystack:

```text
https://bhope-api.billucsolutions.co.ke/api/v1/payments/paystack/webhook
```

The callback URL supplied when initializing checkout is:

```text
https://bhope-api.billucsolutions.co.ke/api/v1/payments/paystack/return
```

Current signing uses `Paystack-Signature` with timestamp and v1 signatures over `timestamp.raw-body`, HMAC-SHA512, and a five-minute tolerance. When no signing secret is configured, legacy `x-paystack-signature` verification uses the API secret and the raw body. Once a signing secret is set, a legacy-only signature is rejected. See [official webhook documentation](https://paystack.com/docs/payments/webhooks/).

The server initializes hosted checkout and checks the checkout host. The native bottom sheet uses Paystack's hosted page with HTTPS bank/3-D Secure redirects and popup handling. Card data stays within the provider's flow. The browser preview opens a separate secure checkout page. Completion of a browser redirect never marks a gift successful: the backend [verifies the transaction](https://paystack.com/docs/payments/verify-payments/) and checks the exact reference, amount, currency, and status. See [Paystack's mobile WebView guidance](https://paystack.com/docs/guides/using_the_paystack_checkout_in_a_mobile_webview/).

## Records and recovery

The same attempt key is reused on retries. Native SecureStore saves the latest retry identity and receipt token, without phone or card details; web preview recovery is limited to the current tab. A failed or completed attempt can start a new gift. An uncertain provider response stays pending to avoid implying failure when a payment might have started; check the provider/account record before trying another payment. There is no background reconciliation worker yet, so admin reconciliation of unresolved records remains a deployment requirement.

Signed-in users see only gifts linked to their account when the payment began. Guest receipts use a random token; guest gifts are not automatically attached to a later account. Editors cannot access finance reports. The admin report distinguishes pending, confirmed, failed, and reversed amounts. It shows at most the most recent 500 rows; its CSV exports that displayed set, while status totals cover all records. This is a transaction view, not an accounting ledger or a payout statement.

## Required checks before live giving

- Test successful, cancelled, declined, timed-out, and interrupted payments with provider test credentials.
- Confirm callback delivery, repeated events, exact amount checks, and transaction lookup after app restart.
- Validate hosted checkout and bank redirects on physical Android, including back/cancel and network interruption.
- Reconcile provider statements against confirmed API records. Plan reconciliation jobs and refund handling before scale.
- Confirm ministry ownership, provider onboarding, refund/contact details, and store requirements for the actual distribution channel.

Paid digital articles/series are not donations. A later purchase flow needs catalog pricing, store receipts, entitlement checks, restore/refund handling, and applicable store billing. Google Play generally requires its billing for digital content unless an exception/program applies; its donation exclusion specifically includes tax-exempt donations. See [Google's policy](https://support.google.com/googleplay/android-developer/answer/9858738) and [Apple's guidelines](https://developer.apple.com/app-store/review/guidelines/). No eligibility or tax-exempt status is assumed here.
