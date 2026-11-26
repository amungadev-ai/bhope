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

## What works in this first version

- English/Swahili devotional screens, devotional details, reflection prompts, and locally saved reading completion.
- Offline Bible book/chapter selection, text/reference search, reading-size controls, and bookmarks.
- Sermon and reflection notebooks, speaker/church/date fields, autosave, local search, export through the phone share sheet, and deletion.
- Automatic English/Swahili Scripture references, including abbreviations and verse ranges. Tap a reference to read or insert its passage. Detection works offline.
- Optional DeepSeek note summaries and reflection questions after sign-in and explicit consent. Suggestions are reviewed before insertion.
- Separate editor/admin views in the web studio: bilingual drafts, live preview, submission for review, admin publication/scheduling, and admin role management.
- An optional TikTok profile link in More, configured with the account supplied for this project. Donations open an HTTPS giving page when configured.

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

This is a working first development version. Notes currently stay on the device; the API's protected note endpoints are prepared for a later synchronization UI. Password recovery/email verification, push reminders, payment processing, TikTok video embeds, and production release builds are later milestones. Export important notes before clearing app data or reinstalling Expo Go.
