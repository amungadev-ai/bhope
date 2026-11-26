# Beacon of Hope

An Android-first Christian devotional app with an offline Bible reader and a Scripture-aware notebook. Built with **Expo SDK 58**, React Native, TypeScript, Node.js, Express, and MySQL. The app opens in **Expo Go** without running the API.

## Run on your phone

Install Node.js 24 LTS and the current Expo Go app on Android. In the VS Code terminal:

```sh
git clone https://github.com/amungadev-ai/bhope.git
cd bhope
npm ci
npm start
```

Connect the computer and phone to the same Wi-Fi, then scan the terminal QR code with Expo Go. Allow Node.js through the computer's firewall on your private network. If LAN discovery fails, try `npm start -- --tunnel` (Expo may ask to install its tunnel helper).

After the first clone, get updates with `git pull` followed by `npm ci`. Use `npm start -- --clear` after changing Bible imports or environment settings. Development on a physical Android phone does not require Android Studio.

## What works in version 0.5

- English/Swahili devotional screens, devotional details, reflection prompts, and locally saved reading completion.
- Direct React Navigation 7 with five tabs: Today, Bible, Notebook, Inspiration, and More. The drawer is nested under More; Home also offers a shortcut. Fixed headers leave reading content scrollable underneath.
- App language lives in Preferences. Bible language is independent and stays in the reader. Four persisted color themes: Evergreen, Ocean, Plum, and Warm Sand.
- Offline Bible book/chapter/range selection, text/reference search, reading-size controls, and explicit bookmarks. The roomier header includes a dedicated verse-range picker; tighter verse spacing leaves more room for reading. Tap to focus a verse; long press for copy, share, save, or add-to-note actions.
- Sermon and reflection notebooks with headings, paragraphs, bold, italic, underline, numbered/bullet lists, checkboxes, undo/redo, autosave, and share/export. The editor fills the available space and adapts to the keyboard. A small Format toggle at the top left opens a vertical formatting sidebar beside the writing area; collapsing it restores the full writing width. Sermon details remain optional. Long press a note card to rename, share, or delete it. Existing notes remain editable.
- Automatic English/Swahili Scripture references, including aliases (`John`, `jhon`, `joh`, `jhn`, `jon`, `jn`, `Yohana`) and spaced verse ranges such as `John 1: 1-10`. Tap blue references to place the cursor and edit their characters. Long press opens a passage preview with save/copy/share and note actions already visible. There are no duplicate verse chips or Bible footer shortcut. Bible reading can return a passage to the current note without losing its title or content. Detection works offline.
- More is a personal reading corner: a reflection prompt, real notebook/saved-verse counts, the latest note, and a saved Scripture. Account, preferences, AI plans, and giving remain in its drawer.
- Optional DeepSeek summaries and reflection questions under a floating reflection-tools button. It starts at the bottom right of the editor, can be dragged within the writing area, and stays within bounds when the keyboard or layout changes. Dragging does not open tools or send a request. Sign-in and consent are requested at that point; suggestions are reviewed before insertion. Daily reading and local notes do not require an account. AI has five free uses once per reader account; failed provider responses restore the free credit. The continued-access plan is KES 150/month with a daily request limit. Store checkout is not configured and no recurring charges are started. See [AI access](docs/AI_ACCESS.md).
- Separate editor/admin views in the web studio: bilingual drafts, live preview, submission for review, admin publication/scheduling, and admin role management.
- Curated Inspirations with individual TikTok players, editor drafts/review and admin publication/scheduling. The feed starts empty until real videos are selected; the ministry profile link remains in the drawer.
- Optional KES donations: M-Pesa STK prompts and hosted Paystack card checkout in a bottom sheet, account-linked donation history, and admin finance reports. Payment methods stay disabled until server credentials and public HTTPS callbacks are configured. No live payment has been tested. See [giving setup](docs/GIVING.md).

## Load your complete NIV and Swahili Bibles

The public repository includes a small development Bible sample so a fresh clone runs immediately. The English sample is KJV; Swahili development renderings are clearly labelled and **are not SRUV**.

Keep the original uploaded XML files on your computer, then run from the repository root:

```sh
npm run bible:import -- --english "/path/to/EnglishNIVBible.xml" --swahili "/path/to/SwahiliBible.xml"
npm start -- --clear
```

On Windows, supply your own quoted paths, for example `"C:\Users\YourName\Downloads\EnglishNIVBible.xml"`.

The importer validates XML, rejects custom entities, checks reference ranges and duplicates, preserves the translation's own verse numbering, and writes `.local/bible.json`. The supplied files were tested: **31,102 verses per language, 66 books per language**. The app automatically bundles the local library and prepares its SQLite database on first launch. Preparation may take a moment. Importing a new library preserves notebook entries and bookmarks.

Full Bible texts, generated imports, environment files, and databases are excluded from Git. Confirm the appropriate edition and publisher permissions for app distribution, offline access, and AI use before distributing a build containing licensed translations. NIV AI use requires specific permission from Biblica: https://www.biblica.com/permissions/ . The uploaded Swahili file identifies itself as SRUV, © 2005 Bible Society of Kenya and Bible Society of Tanzania.

## Run the API and studio locally

In a second terminal:

```sh
npm run api
```

The development API uses SQLite automatically; it does not need MySQL for local testing. Check `http://localhost:4000/api/v1/health`.

Create your first administrator (the command prompts for a hidden password):

```sh
npm run user:create -- --email you@example.com --name "Your Name" --role admin
```

In another terminal:

```sh
npm run dashboard
```

Open **http://localhost:5173/console/** and sign in. An admin can promote registered readers to editors in People, or create another staff account with `--role editor`. No default passwords are included.

### Connect your phone to the API

Create `apps/mobile/.env` using `apps/mobile/.env.example` as a guide:

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:4000/api/v1
```

Restart Expo. `localhost` on a physical phone points to the phone, so use the computer's Wi-Fi IPv4 address. Local HTTP is for development; production uses HTTPS. The optional web preview uses the API's CORS allowlist.

To connect DeepSeek, create `apps/api/.env` from its `.env.example`, set `DEEPSEEK_API_KEY`, and restart the API. The model is configured using `DEEPSEEK_MODEL`; the current default is `deepseek-flash`. API keys and database passwords belong only on the backend. `EXPO_PUBLIC_*` values are visible in the mobile bundle.

## Verify and prepare for hosting

```sh
npm run check
npm run deploy:prepare
```

The first command runs typechecks, mobile lint, reference/parser tests, API authorization and privacy tests, and production API/studio builds. The second creates a minimal shared-hosting package in `.local/deploy-api/`, without requiring Expo on the server. See [DirectAdmin setup](docs/DIRECTADMIN.md) and [architecture and current scope](docs/ARCHITECTURE.md).

## Project layout

```text
apps/mobile       Expo Go app
apps/api          Express API, SQL schema, staff-account tools
apps/dashboard    React editor/admin studio
packages/shared   Book names, reference parser, devotional content, types
scripts           Local Bible importer and hosting package builder
docs              Setup and architecture
```

Daily devotionals, the Bible, and the notebook remain free. Paid extras are a later phase, with a separate purchase/entitlement design and store-billing review. Donations never unlock app content.

This is a development version for Expo Go evaluation. Notes currently stay on the device; the API's protected note endpoints are prepared for a later synchronization UI. Live hosting/provider verification, password recovery/email verification, account deletion, push reminders, and production release builds remain later milestones. Export important notes before clearing app data or reinstalling Expo Go. See the [version 0.5 notes](docs/V0.5.md).
