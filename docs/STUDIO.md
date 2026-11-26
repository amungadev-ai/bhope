# Studio and connected mobile flows

The studio is at `/console/`. Readers continue using the Android app; the
web workspace is for editors and administrators.

## English first

Devotionals require an English title and reflection to publish. Swahili
is optional: choose **Add Swahili (optional)** in the writing room. Existing
translations are preserved. A reader using Swahili receives the English
devotional when a complete translation is unavailable; missing secondary
translated fields also fall back to English.

Inspirations require an English title, a full individual TikTok video URL,
and a publication date. Optional Swahili fields are in a collapsed section.
Publication and changes to published content still require an administrator.

## Writing assistant

Both editors have an optional **Writing assistant**:

- **Draft from a brief** generates a devotional's six text fields or an
  inspiration's title and introduction.
- **Refine my writing** works from the editor's existing text and optional
  instructions.
- Suggestions appear separately for review. **Use this suggestion** applies
  the text; saving and publishing remain separate. The previous writing can
  be restored after applying a suggestion.

Only staff can call `/api/v1/studio/ai/draft`. It uses the server's existing
DeepSeek settings, validates structured JSON, and shares the existing daily
AI limit. Staff do not spend readers' five-use allowance. Empty, truncated,
or invalid provider output cannot replace or publish a draft. The assistant
uses the editor's description of an inspiration; it does not watch TikTok
videos or send the app's licensed Bible library to DeepSeek.

## Team and AI access

Administrators can choose **People → Add editor**, supply a name, email, and
initial password, and share the sign-in details privately. The server hashes
the password and records the administrator and new editor in its audit log.
Existing accounts are promoted through their role selector. An administrator
cannot change their own role. Editors cannot add team members or access
financial and AI-plan administration.

**AI access & plans** includes plan summaries, account search and filtering,
free-use progress, staff access labels, and a dialog for dated support
adjustments. These adjustments are audited. They do not create payments,
donations, recurring charges, or reset the free allowance. Store checkout
remains disabled.

## Mobile updates and giving

The Inspirations tab refreshes on focus and foreground return, then every
20 seconds while visible. Today also refreshes published devotionals. Requests
stop in the background or when leaving the screen, do not overlap, and
preserve cached reading when offline. This uses foreground polling suitable
for shared hosting rather than requiring a persistent socket server.

Giving and its payment sheet avoid the keyboard, with scrollable controls
and a Done action for the amount input. Pending gifts verify automatically
every 15 seconds after the previous request completes. Polling pauses during
card checkout, when the app is backgrounded, or when leaving Giving. It stops
on a confirmed, failed, or reversed status. After 20 attempts, readers can
resume checks; the payment remains pending until the provider verifies it.
Refreshing never initiates another charge, and the existing idempotency key
and receipt recovery remain in place.

## Responsive PWA

Small screens use a fixed top bar and a navigation drawer with keyboard
focus handling and sign-out. Larger screens use the persistent sidebar.
Forms, plan cards, and account management adapt to the available width.

The studio includes a scoped web manifest, 192/512-pixel icons, a service
worker, installation help, an offline reconnect page, and an explicit update
button so a new worker does not reload unsaved writing automatically.
HTTPS is required for installation outside localhost. The worker caches only
static studio resources; authentication, staff data, API requests, and
mutations remain network-only. Working with drafts and publishing require
an internet connection.

## Deploy this update

This release changes the API, shared content helpers, dashboard, and mobile
app. It uses existing tables and dependencies; no SQL migration or new npm
installation is needed for an existing working host.

1. Pull `main` on your computer and run `npm run deploy:prepare`.
2. Upload `.local/bhope-api-portable.zip` and extract into `hope_api`, replacing
   generated files while preserving the private `.env` and managed dependency
   link. Keep the public document root at `hope_api/public`.
3. Restart through the Node manager. If its operation lock is still blocked,
   create or edit `hope_api/tmp/restart.txt` in File Manager to update its
   modification time and trigger Passenger's normal restart mechanism. This
   restarts the application; it does not clear the separate Selector lock.
4. Open `/api/v1/health` and `/console/`. Existing admin credentials still work.
5. Restart Expo from the updated checkout and reload the phone app.

See [DirectAdmin setup](DIRECTADMIN.md) for the existing hosting configuration.
The restart marker is documented by
[Passenger](https://www.phusionpassenger.com/library/admin/apache/restart_app.html).

Verification covers API authorization and publishing, structured AI output,
language fallback, poll lifecycle and limits, PWA cache boundaries, type
checking, mobile lint, builds, and the Android bundle. AI and payment tests
use mocked providers. The isolated workspace preview server was unavailable
to the browser, so actual phone/tablet visual review remains to be completed
on the deployed studio.
