# Beacon of Hope API — hosting deployment (no SSH needed)

Everything here works from the hosting panel: File Manager, phpMyAdmin, and
the Node manager. The full reference lives in the repository at
`docs/DIRECTADMIN.md`; this guide is the short, click-by-click version.

## What is in this package

| File/folder              | Purpose |
| ------------------------ | ------- |
| `app.cjs`, `dist/`, `package.json` | The compiled API (startup file is `app.cjs`) |
| `public/console/`        | The editorial studio, served at `/console/` |
| `migrations/`            | SQL migrations used by the migration and account tools |
| `database/bhope-mariadb-schema.sql` | Combined schema for manual phpMyAdmin setup |
| `.env.example`           | Full settings reference |
| `.htaccess`              | Passenger template for the document root |
| `restart.php`, `diag.php` | Optional maintenance helpers; keep outside `public/` |
| `restart.sh`             | Restart helper, for SSH sessions if you ever have one |

The repository's `npm run deploy:prepare` command excludes the real `.env`
and does not vendor `node_modules`. A separately prepared private bundle
may include them; do not assume that every generated ZIP does.

## Deploy, step by step

### 1. Upload and extract

In the File Manager, open the application folder (`hope_api`). Upload the
portable ZIP and use **Extract**, replacing the generated application files.
Preserve the existing private `.env` and the Node manager's `node_modules`
folder or link. Check that
`app.cjs`, `package.json`, `dist/`, and `public/` sit directly inside
`hope_api` — not inside an extra nested folder.

Keep the domain document root at `hope_api/public`, separate from the
application root. Remove uploaded ZIPs from the host once extraction is
verified.

### 2. Import the database schema (phpMyAdmin)

1. Open phpMyAdmin and select the application database in the left sidebar.
2. **Import** → choose `database/bhope-mariadb-schema.sql` → **Go**.
3. Success looks like: 12 statements executed, tables `users`, `sessions`,
   `devotionals`, `notes`, `daily_ai_usage`, `audit_events`, `inspirations`,
   `donations`, `ai_access`, `ai_access_events` exist. An empty devotional
   library receives two sample devotionals.
4. Existing tables and content are preserved. If the three original SQL
   migrations were already imported, there is no need to import them again.
   `CREATE TABLE IF NOT EXISTS` does not upgrade an existing table's columns.

### 3. Fill in `.env`

For an existing deployment, retain the working `.env`. For a fresh setup,
copy `.env.example` to `.env` inside `hope_api`, alongside `app.cjs`, and
configure at least:

```dotenv
NODE_ENV=production
APP_URL=https://bhope-api.billucsolutions.co.ke
ALLOWED_ORIGINS=https://bhope-api.billucsolutions.co.ke
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=jobready_bhope_db
DB_USER=jobready_bhope_db_admin
DB_PASSWORD="REPLACE_PRIVATELY_WITH_THE_DATABASE_PASSWORD"
```

Save with permissions `600`. The API and setup scripts load this file
automatically. Panel environment values override matching `.env` values;
remove conflicting duplicates. Set `TRUST_PROXY` only after confirming the
host's proxy configuration, as described in `docs/DIRECTADMIN.md`.

If TCP connections fail and the host confirms socket access, set
`DB_SOCKET=/var/lib/mysql/mysql.sock` using the host's actual socket path.
phpMyAdmin using a socket does not itself mean that TCP is unavailable.

### 4. Register the Node application

In the Node manager ("Setup Node.js App" / Node selector):

| Setting           | Value |
| ----------------- | ----- |
| Node version      | Node.js 24 (the project's minimum supported version) |
| Application root  | `domains/bhope-api.billucsolutions.co.ke/hope_api` relative to the hosting account's home |
| Application URL   | the domain root |
| Application mode  | Production |
| Startup file      | `app.cjs` |

Use the Node manager's existing working mapping. The `.htaccess` template
is an alternative only when the host provides Passenger and requires manual
configuration. Confirm `PassengerAppRoot` and `PassengerNodejs` with the
host before using it; do not overwrite configuration managed by the panel.

### 5. Dependencies

Use **Run npm install** for a fresh installation or changed backend
dependencies. The standard generated package contains a backend-only
`package.json`; it does not contain `node_modules`. Shared project code is
included through relative imports, without a workspace package link.
Preserve any dependency folder or symlink managed by the host.

### 6. Restart and verify

1. Click **Restart** in the Node manager. Alternatively, use File Manager to
   create or update `hope_api/tmp/restart.txt`, Passenger's restart marker.
   Keep the PHP maintenance helpers outside the public document root.
2. `https://bhope-api.billucsolutions.co.ke/api/v1/health` should return
   `{"status":"ok","service":"beacon-of-hope-api"}`.
3. `https://bhope-api.billucsolutions.co.ke/api/v1/devotionals` should list
   published devotionals. A fresh, empty library is seeded with two samples.
4. `/console/` opens the editorial studio.
5. Confirm `/.env` and `/startup.log` cannot be downloaded.

### 7. Create the first admin account

If the Node manager offers **Run JS Script**: temporarily add to `.env`:

```dotenv
CREATE_USER_EMAIL=""
CREATE_USER_NAME=""
CREATE_USER_ROLE=admin
CREATE_USER_PASSWORD=""
```

Fill the empty values privately with your email, display name, and a new
password of 10–128 characters. Select **user:create** in **Run JS Script**
and leave **Arguments empty**. Success reports
`Created admin account for <your email>.` with return code `0`.

**Remove all four temporary lines** from `.env`, save, and restart. Sign in
at `https://bhope-api.billucsolutions.co.ke/console/`. An existing account is
not reset or promoted by re-running this command. Without **Run JS Script**,
ask the host to run it once, or use SSH if you get access later.

## Troubleshooting

- **`Can't acquire lock for app: .../hope_api`** or
  **`Cannot read properties of null (reading 'details')`** — these panel
  messages alone do not identify the cause. Check the application's startup
  diagnostics and the hosting manager's state:
  1. Read `hope_api/startup.log` in the File Manager — the app appends the
     exact failure there (secrets redacted).
  2. Confirm `app.cjs`, `package.json`, `dist/`, `.env`, `node_modules/`,
     and `public/` sit DIRECTLY inside `hope_api` — a nested folder from a
     zip extraction is the most common cause.
  3. Confirm there is one app registration for `hope_api` and its mapping
     matches the paths above. Avoid a conflicting manual Passenger template.
  4. Restart through the panel. If the manager remains locked, ask the host
     to inspect the lock and Passenger process state.
- **503 on `/api` calls** — check `hope_api/startup.log` and the panel's
  configured Passenger/error log. Startup failures, routing, or hosting
  resource limits can cause a 503; the response alone does not establish why.
- **200 with `{"status":"degraded","db":"error","code":"..."}`** — the
  backend IS running but the database is not ready. The `code` says which:
  `ER_BAD_DB_ERROR` → check `DB_NAME`; `ER_ACCESS_DENIED_ERROR` → check
  `DB_USER`, `DB_PASSWORD`, and account access; `ECONNREFUSED` → verify the
  host/port or confirmed socket path. The health check tests connectivity;
  if a content or staff route reports missing tables, check the schema
  separately. The server stays running during database connection failures.
- **403 `This origin is not allowed.`** — a browser client from another
  domain is calling the API; add that origin to `ALLOWED_ORIGINS`.
- Restart through the Node manager after code or `.env` changes, then retry.

## Notes

- `health` answers HTTP 200 even during a database failure. Monitoring must
  check the JSON `status` value, not only the HTTP response code.
- SQLite is for local development and tests; production requires MySQL.
  `DB_SQLITE_PATH` overrides the local SQLite file location.
- The standard `.env.example` has blank merchant keys. An existing private
  `.env` may already enable AI or giving. Configuration flags do not verify
  provider connectivity; follow `docs/GIVING.md` before enabling real charges.
