# Architecture and current scope

## Three experiences, one API

The Expo app is optimized for daily reading and quick note capture. The React web studio presents editor and admin controls according to the signed-in account's role. Express enforces permissions independently of visible controls.

MySQL is the production database. Node's SQLite implementation supports a zero-configuration local API. On Android/iOS, Expo SQLite stores the Bible, notes, bookmarks, and reading preferences; the browser preview uses localStorage for notebook data. Browser and phone data are separate.

## Scripture-aware notebook

The shared parser knows 66 canonical book IDs, English/Swahili names and common abbreviations. It recognizes chapters, individual verses, and within-chapter ranges, retaining the original text offsets. Reference detection never calls AI. Verse text is retrieved from the chosen library, preserving translation-specific numbering. Cross-chapter ranges, implicit verse quotations, handwriting, and audio transcription are not implemented.

Full XML imports are local and excluded from the public repository. Metro selects `.local/bible.json` when present and otherwise uses the clearly labelled development sample. A content fingerprint controls SQLite replacement during initialization. Verse inserts are batched inside a transaction, and Bible updates do not replace user notes or bookmarks.

## Notes and account privacy

The mobile notebook is currently device-local. Debounced saves are serialized and flushed when leaving the editor. Export uses the platform share sheet. There is no claim of end-to-end encryption; the current local SQLite notebook is not encrypted. SecureStore protects the native session token, not the entire notebook.

Protected API note endpoints are available for a later sync implementation. Records are scoped by both account ID and note ID; revision checks reject stale writes with 409 responses. The mobile app does not automatically upload notes. Editors and administrators have no notebook-browsing endpoint in the studio.

## Authentication and staff roles

Passwords use salted scrypt hashes. Sessions use random opaque tokens whose hashes are stored in the database; tokens expire after seven days. The studio uses an HttpOnly, SameSite cookie, with Secure enabled in production. Native sessions use SecureStore. API validation, CORS origin checks, login limits, and general request limits are enabled.

Reader registration always creates the `user` role. Editors can save their drafts and submit them for review. Administrators approve, publish, schedule, and update published work, and manage other accounts' roles. Role changes are audited. Editors cannot publish or alter someone else's draft. Published content is visible only after its UTC publication time; the studio accepts local date/time input and converts it to UTC.

## DeepSeek

The backend calls the configurable DeepSeek model using the documented chat-completions endpoint. Keys are read from server environment variables. Requests require authentication, explicit consent, a bounded text size, and a daily per-account allowance. Allowances count attempts, including failed requests, and reset by UTC date. Upstream timeouts and failures return readable errors without upstream payloads or secrets.

The mobile app sends selected note text, or the current note's text if no selection exists. The result is shown separately and inserted only by an explicit user action. The server does not inject Bible-library text into AI requests. Editors can request outlines and must review the output. Publisher permissions still govern any copyrighted text a user elects to submit.

## TikTok and giving

The supplied TikTok URL is configurable and opens through the platform's link handling. No automatic feed or embedded player is included in this milestone. Official creator-profile/video embeds are an option for a later screen using TikTok-supported markup/player behavior. Confirm the account is the intended ministry profile before release.

The optional giving link opens an HTTPS donation page. No payment secrets, M-Pesa integration, transaction processing, or donation reporting are implemented yet.

## Next milestones

1. Deploy and verify the API on the supplied DirectAdmin host with MySQL.
2. Confirm publisher permissions and the approved editions for release.
3. Add reviewed, scheduled devotional content and editorial guidelines.
4. Add email verification/password recovery and account deletion/export.
5. Build account-linked note synchronization, conflict copies, and backup/restore UI.
6. Add opt-in reminders, donation integration, and curated TikTok videos.
7. Test on physical Android devices, add accessibility/localization coverage, and prepare an EAS production build.

The current development version is intended for Expo Go evaluation. It is not a completed public-store release.
