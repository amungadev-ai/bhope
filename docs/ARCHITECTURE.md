# Architecture and current scope

## Three experiences, one API

The Expo app is optimized for daily reading and quick note capture. The React web studio presents editor and admin controls according to the signed-in account's role. Express enforces permissions independently of visible controls.

MySQL is the production database. Node's SQLite implementation supports a zero-configuration local API. On Android/iOS, Expo SQLite stores the Bible, notes, bookmarks, and reading preferences; the browser preview uses localStorage for notebook data. Browser and phone data are separate.

## Navigation

Direct React Navigation 7 combines a root native stack and five bottom tabs, with the drawer nested inside More. Root screens include devotional details, the note editor, and a Bible reader opened from a note. Opening the Bible over the editor keeps that editor mounted; returning a passage pops back to the same note. Expo Router has been removed. Native dependencies are selected for Expo SDK 58 and Expo Go.

Home and Notebook use navigator headers. The Bible uses a fixed header with breathing room around book, chapter, verse-range, language, text-size, and search controls. The range picker validates endpoints against the selected translation/chapter; explicit ranges filter the displayed verses and can return to the whole chapter. Verse rows use tighter padding and line spacing. More has a fixed drawer header; its other screens use a back action. The editor has a fixed navigation/status row, a prominent note title, inline note-details and formatting toggles, and a flex-height writing area in KeyboardAvoidingView. The toggle opens a local vertical sidebar; the writing area resizes without remounting the rich editor, preserving selection. Verse references remain blue inline text: a normal tap places the caret; a long press opens the passage. Native keyboard composition is allowed to finish before reference spans are rebuilt. Passage sheets expose actions directly; their Bible-reader preview is brief because the full passage is already behind the sheet. The editor has no Bible/footer bar. A floating AI action starts at the writing area’s bottom right and uses native responder events to distinguish a tap from a drag. Its normalized position stays inside the current writing bounds during sidebar/keyboard resizing. A temporary drag overlay keeps the embedded editor from intercepting an active drag. Movement opens no AI sheet and makes no AI request; a tap keeps the usual account/consent flow.

Notebook card long presses open rename/share/delete actions. Renaming reads the latest stored payload and updates only its title/time, preserving HTML, body, and sermon metadata. Deletion requires a confirmation. More uses real local notes/bookmarks for its personal reading corner rather than duplicating the drawer menu.

App language and Bible language have separate persisted preferences. The old language preference seeds the Bible language once during migration, after which they remain independent. Four light palettes cover navigation, screens, dialogs, and editor CSS variables. No Bible or note tables are replaced by theme/language changes.

## Scripture-aware notebook

The shared parser knows 66 canonical book IDs, English/Swahili names and common abbreviations. It recognizes chapters, individual verses, and within-chapter ranges, retaining the original text offsets. Spaces around colons and range separators are accepted. Aliases include English/Swahili names, abbreviations, selected common misspellings, and Roman numeral variants. Per the project's chosen alias policy, `jon` means John; use `Jonah` or `Yona` for Jonah. Reference detection never calls AI. Verse text is retrieved from the chosen library, preserving translation-specific numbering. Cross-chapter ranges, implicit verse quotations, handwriting, and audio transcription are not implemented.

Full XML imports are local and excluded from the public repository. Metro selects `.local/bible.json` when present and otherwise uses the clearly labelled development sample. A content fingerprint controls SQLite replacement during initialization. Verse inserts are batched inside a transaction, and Bible updates do not replace user notes or bookmarks.

The rich editor runs in a local offline WebView on native and an isolated iframe in the browser preview. Saved HTML is sanitized through an allowlist before loading. Paste uses plain text. Blue reference spans and passage long-press actions use the same shared parser as Bible search, without network calls. The runtime functions are compiled to source strings by `npm run editor:build` in Node; native Hermes does not stringify them at runtime. Both rich HTML and searchable/exportable plain text are stored in the existing note payload; old plain-text notes remain editable. Plain text is derived from DOM blocks, lists, line breaks, and checkbox state rather than hidden-clone innerText. Existing rich notes whose plain text was empty are repaired on opening. A ready/connect handshake recovers the initial snapshot in the browser preview.

## Notes and account privacy

The mobile notebook is currently device-local. Debounced saves are serialized and flushed when leaving the editor. Export uses the platform share sheet. There is no claim of end-to-end encryption; the current local SQLite notebook is not encrypted. SecureStore protects the native session token, not the entire notebook.

Protected API note endpoints are available for a later sync implementation. Records are scoped by both account ID and note ID; revision checks reject stale writes with 409 responses. The mobile app does not automatically upload notes. Editors and administrators have no notebook-browsing endpoint in the studio.

## Authentication and staff roles

Passwords use salted scrypt hashes. Sessions use random opaque tokens whose hashes are stored in the database; tokens expire after seven days. The studio uses an HttpOnly, SameSite cookie, with Secure enabled in production. Native sessions use SecureStore. API validation, CORS origin checks, login limits, and general request limits are enabled.

Reader registration always creates the `user` role. Editors can save their drafts and submit them for review. Administrators approve, publish, schedule, and update published work, and manage other accounts' roles. Role changes are audited. Editors cannot publish or alter someone else's draft. Published content is visible only after its UTC publication time; the studio accepts local date/time input and converts it to UTC.

## DeepSeek

The backend calls the configurable DeepSeek model using the documented chat-completions endpoint. Keys are read from server environment variables. Requests require authentication, explicit consent, a bounded text size, and a daily per-account allowance. The daily request limit counts attempts, including failed requests, and resets by UTC date. Reader accounts also receive five lifetime free successful uses, reserved atomically before an upstream request and restored when that request fails. Continued reader access requires an unexpired entitlement. Editorial staff retain assistance under the daily limit. The plan is KES 150/month, but store checkout is not configured. The admin studio lists usage and audited support adjustments; these never create payments or donations. See [AI access](AI_ACCESS.md). Upstream timeouts and failures return readable errors without upstream payloads or secrets.

The mobile app sends selected note text, or the current note's text if no selection exists. The result is shown separately and inserted only by an explicit user action. The server does not inject Bible-library text into AI requests. Editors can request outlines and must review the output. Publisher permissions still govern any copyrighted text a user elects to submit.

## TikTok and giving

Inspirations are curated records, separate from devotionals, with bilingual text, a full public TikTok video URL, editorial status, and publication time. Only published, due records enter the public feed. An individual official player loads after the reader chooses it; other cards stay unloaded. External playback has a fallback link. Private, removed, or region-restricted videos may not play. This is not an automatic TikTok account feed, and no demonstration video is seeded.

Giving uses server-only merchant credentials. M-Pesa STK creation is followed by a server-side STK query to confirm the result; a callback alone cannot mark a donation successful. Paystack checkout is initialized and verified on the server, checking reference, amount in minor units, currency, and status. Signed Paystack webhooks use the raw request body. Idempotency keys prevent repeated initialization for the same attempt, and receipt tokens protect guest status access. Pending, confirmed, failed, and reversed transactions remain distinct; reports total confirmed payments separately.

The native app keeps its latest payment identity/receipt token in SecureStore so interrupted requests can reuse the same key after restarting. Phone numbers and card details are not saved in that record. Browser preview recovery lasts for the current tab only. Guest gifts are not retroactively linked to an account; sign in before giving for account history. No payment PIN, card number, or CVV is accepted by this API. Hosted card checkout handles bank verification screens; an on-device validation remains required.

Daily devotionals, Bible reading, and notes are free. Paid articles/series are planned only; a future purchase module must distinguish products, store transactions, and entitlements from donations. Funding allocations need reviewed reports; the app currently describes an aim, not an audited allocation claim. See [giving setup](GIVING.md).

## Next milestones

1. Deploy and verify the API on the supplied DirectAdmin host with MySQL.
2. Confirm publisher permissions and the approved editions for release.
3. Add reviewed, scheduled devotional content and editorial guidelines.
4. Add email verification/password recovery and account deletion/export.
5. Build account-linked note synchronization, conflict copies, and backup/restore UI.
6. Verify M-Pesa sandbox/Paystack test payments and callbacks; curate approved TikTok videos.
7. Add opt-in reminders and reviewed public funding updates.
8. Configure store subscription products, receipt verification, renewal/refund notifications, and a development build for the AI plan.
9. Test on physical Android devices, add accessibility/localization coverage, and prepare an EAS production build.

The current development version is intended for Expo Go evaluation. It is not a completed public-store release.
