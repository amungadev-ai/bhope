# DirectAdmin deployment

Target API: **https://bhope-api.billucsolutions.co.ke/api/v1**. Hosting directory supplied for the project: **/domains/bhope-api.billucsolutions.co.ke/hope_api**. DirectAdmin paths are often relative to the hosting account's home; verify the actual full path in File Manager or Terminal.

These instructions prepare the existing host. No live hosting account has been accessed or changed by this repository setup.

## 1. Build on your computer

```sh
npm run deploy:prepare
```

Run this from the repository root on your computer. For a fresh clone, install dependencies with `npm ci` first. An existing checkout with unchanged dependencies does not need another install.

Upload the **contents** of `.local/deploy-api/` into `hope_api`. The package contains compiled API code, the compiled studio, SQL migrations, staff tools, shared JavaScript, and a backend-only package.json. It contains no `.env`, local databases, or complete licensed Bible texts.

The preparation command also creates **`.local/bhope-api-portable.zip`** for File Manager upload. The archive uses forward slashes in its internal paths on Windows and Linux. It contains explicit folder entries, including `public/`, `public/console/`, `dist/`, and `migrations/`.

To zip an already prepared package again without rebuilding:

```powershell
npm run deploy:zip
```

Upload the archive through DirectAdmin File Manager and extract its contents into the application root. Check that `package.json`, `app.cjs`, `dist/`, and `public/` are directly inside `hope_api`, rather than inside an extra `deploy-api` directory. The settings are documented here; enter secrets in the Node manager instead of adding them to the archive.

If File Manager lists a name such as `public\console\index.html` as a single file, the archive used Windows backslashes and the extractor treated them as filename characters. This affects all subdirectories, including the API and SQL migrations. Move the incorrectly extracted files and old archives to Trash, upload the complete `bhope-api-portable.zip`, and extract it directly into `hope_api`. Confirm you can open the real folders `public` → `console` and see `index.html`. Repack the full deployment with the command above; creating an empty `public` folder would leave the compiled dashboard missing.

## 2. Configure the domain and Node application

| Setting              | Value                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| Application URL      | `https://bhope-api.billucsolutions.co.ke` at `/`                                 |
| Node version         | Node.js 24 LTS or a newer supported LTS                                          |
| Application mode     | Production                                                                       |
| Application root     | Actual account path ending in `domains/bhope-api.billucsolutions.co.ke/hope_api` |
| Startup file         | `app.cjs`                                                                        |
| Domain document root | The application's `hope_api/public` directory                                    |

The application root and document root are different. Only `public/` should be directly web-accessible. The `.env`, package files, migrations, and compiled backend belong outside the public document root. If your Node selector manages this mapping, use its supported mapping; otherwise ask the host to map the domain accordingly. Do not leave the whole application directory exposed as a static document root.

Enable the domain's HTTPS certificate and HTTPS redirection. Passenger manages the listener; the app uses `process.env.PORT` when supplied, with a local development fallback.

## 3. Install backend dependencies

Use the Node application's activated Terminal environment, or its Run npm install button:

```sh
npm install --omit=dev
```

Only the packaged backend dependencies are installed. Keep the generated package lock after installation for subsequent deployments. The full development monorepo should not be installed in the production public directory.

The prepared API loads shared JavaScript through relative imports from `packages/shared/src/`. Its production `package.json` deliberately has no `@bhope/shared` dependency: CloudLinux may place `node_modules` in a separate virtual environment, which can break local workspace links. If an older upload reports `Cannot find package '@bhope/shared'`, run `git pull --ff-only` and **`npm run deploy:prepare`** on your computer, upload/extract the new complete portable ZIP over the generated files, and run **Run npm install** again. Preserve the host's existing `.env` and the manager's `node_modules` link. Repacking the old build with `deploy:zip` alone does not update runtime imports.

## 4. Set environment variables

Create **`hope_api/.env`**, alongside `app.cjs` and `package.json`, with permissions `600`. The API, migration script, and account-creation script load this file automatically. The included `.env.example` documents all settings. Node manager environment-variable controls are also supported, but manually set panel values take precedence over the same names in `.env`; remove any conflicting duplicates.

```dotenv
NODE_ENV=production
APP_URL=https://bhope-api.billucsolutions.co.ke
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=jobready_bhope_db
DB_USER=jobready_bhope_db_admin
DB_PASSWORD="SET_THE_DATABASE_PASSWORD_PRIVATELY_ON_THE_HOST"
DB_POOL_SIZE=5
ALLOWED_ORIGINS=https://bhope-api.billucsolutions.co.ke
TRUST_PROXY=0
ALLOW_REGISTRATION=true
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
AI_DAILY_LIMIT=10
TIKTOK_URL=https://www.tiktok.com/@auramultipurposesoap
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
```

Set `TRUST_PROXY` only after confirming the host's reverse-proxy topology. If it is a single trusted proxy, use `1`. This affects accurate rate limiting. Add the exact origin of any separately hosted studio to `ALLOWED_ORIGINS`; native phone requests do not use browser CORS.

Leave merchant keys blank during initial deployment. The mobile app shows giving as unavailable until the relevant credentials and HTTPS `APP_URL` are configured. Configure test/sandbox accounts first and follow [giving setup](GIVING.md) before real charges. Never put merchant secrets in the mobile environment. `DONATION_URL` is a legacy optional configuration field; the new giving screen uses the API.

The database account should be restricted to this app's database. Use `utf8mb4` for Unicode. The migrations explicitly create InnoDB/utf8mb4 tables on MySQL. No production password is stored in this repository.

## 5. Initialize the database and staff account

Choose the route supported by your hosting account. The account tool creates a new account only; running it again with the same email does not reset a password or change an existing user's role.

### With Terminal or SSH

In the deployed application directory, with its environment loaded:

```sh
npm run db:migrate
npm run user:create -- --email you@example.com --name "Your Name" --role admin
```

The account tool prompts for a hidden password in an interactive terminal. It also supports `CREATE_USER_PASSWORD` for a temporary secure environment injection; do not put passwords in command-line arguments or source files.

### With File Manager and the Node.js manager

When the Node.js application page offers **Run npm install**, **Run JS Script**, and environment-variable controls, SSH is not required for these setup steps. Upload and extract the compiled package, configure the application and database settings above, and run the dependency installation from the panel.

Temporarily add these settings to the host's private `hope_api/.env` (or to the Node manager if that is your chosen configuration method):

| Variable               | Value                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `CREATE_USER_EMAIL`    | Your staff email address                                           |
| `CREATE_USER_NAME`     | Your display name                                                  |
| `CREATE_USER_ROLE`     | `admin` for the first account; `editor` for a later editor account |
| `CREATE_USER_PASSWORD` | A new password of 10–128 characters, entered privately in the file |

Save the file, quoting passwords so special characters are preserved. Use **Run JS Script** to select `db:migrate`, then `user:create`, leaving their **arguments** fields empty. These are script names from the packaged `package.json`; do not put the password into the script command or its arguments. The command reads the temporary settings and reports the created account's email and role. If a required setting is missing, it exits with the missing variable names rather than waiting for input the panel cannot provide.

After the account is created, remove all four `CREATE_USER_*` settings from `.env` (or the panel) and save. Restart the application, then sign into `/console/` with that email and password. The temporary setup settings are not needed for normal operation. There is no public account-bootstrap endpoint.

If the panel does not provide **Run JS Script**, ask the hosting provider to enable that capability, provide an account Terminal, or confirm SSH access. A connection timeout or refusal before authentication requires checking the SSH hostname/IP, port, firewall/IP restrictions, and account access. Creating or authorizing a new key does not make a closed or unreachable port accessible. DirectAdmin's SSH-key screen and its separate Login Keys feature are not a browser terminal.

The schema contains users, hashed sessions, devotionals, private note records, daily AI usage counters, role-change audit events, curated inspirations, donations, lifetime AI usage, and access-adjustment audit records. Migrations run in filename order; the new tables do not replace existing notes or accounts. Two original sample devotionals are seeded only when the library is empty.

## 6. Restart and verify

- `GET /api/v1/health` returns `{"status":"ok","service":"beacon-of-hope-api"}` after checking the database.
- `/console/` opens the editorial studio.
- Admin/editor sign-in works, and readers cannot access staff endpoints.
- `GET /api/v1/devotionals` returns published content whose publication time has arrived.
- The server can make outbound HTTPS requests to `api.deepseek.com`.
- `GET /api/v1/inspirations` returns an empty list until a real video is published.
- `/api/v1/ai/access` shows five lifetime free uses and the KES 150 plan for authenticated readers; no store purchase endpoint is enabled.
- Admins can view AI access & plans and Giving & reports; editors cannot access finance endpoints.
- `GET /api/v1/config` keeps payment methods disabled while merchant keys are blank.
- Requests for `/.env`, `/package.json`, `/migrations/001_initial.sql`, and `/dist/config.js` do not expose files.

Configure encrypted off-host database backups with a restore check and watch the host's CPU, memory, process, disk, and database-connection limits. Add external health monitoring before public launch. Scheduled devotional visibility is evaluated when requested, so it does not rely on an always-running timer. Future push delivery should use host cron or a managed scheduler.

## 7. Connect the mobile app

On your development computer set `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL=https://bhope-api.billucsolutions.co.ke/api/v1
```

Restart Expo with `npm start -- --clear`. The app still opens cached devotionals, the local Bible, and the notebook without an internet connection.

Live MySQL, DNS, TLS, Passenger mapping, real DeepSeek calls, and actual payment-provider callbacks need verification on your host. Automated API tests use an isolated SQLite database and mocked external services. No real payment has been initiated by this repository setup.
