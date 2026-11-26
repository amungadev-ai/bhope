# Beacon of Hope API — hosting deployment (no SSH needed)

Everything here works from the hosting panel: File Manager, phpMyAdmin, and
the Node manager. The full reference lives in the repository at
`docs/DIRECTADMIN.md`; this guide is the short, click-by-click version.

## What is in this package

| File/folder              | Purpose |
| ------------------------ | ------- |
| `app.cjs`, `dist/`, `package.json` | The compiled API (startup file is `app.cjs`) |
| `public/console/`        | The editorial studio, served at `/console/` |
| `migrations/`            | SQL migrations (already applied by the file below) |
| `database/bhope-mariadb-schema.sql` | **Import this once in phpMyAdmin** |
| `.env`                   | Pre-filled config — you only add the DB name and password |
| `.env.example`           | Full settings reference |
| `node_modules/`          | Backend dependencies, already vendored |
| `.htaccess`              | Passenger template for the document root |
| `restart.php`            | One-click Passenger restart from the browser |
| `diag.php`               | One-off server info (delete after use) |
| `restart.sh`             | Restart helper, for SSH sessions if you ever have one |

## Deploy, step by step

### 1. Upload and extract

In the File Manager, open the application folder (`hope_api`). Delete any
older copy first, then upload this ZIP and use **Extract**. Check that
`app.cjs`, `package.json`, `dist/`, and `public/` sit directly inside
`hope_api` — not inside an extra nested folder.

### 2. Import the database schema (phpMyAdmin)

1. Open phpMyAdmin and select the application database in the left sidebar.
2. **Import** → choose `database/bhope-mariadb-schema.sql` → **Go**.
3. Success looks like: 12 statements executed, tables `users`, `sessions`,
   `devotionals`, `notes`, `daily_ai_usage`, `audit_events`, `inspirations`,
   `donations`, `ai_lifetime_usage`, `ai_access_audit` exist, and the
   `devotionals` table has 2 rows.
4. The import is idempotent — re-running it changes nothing.

### 3. Fill in `.env`

Open `.env` (inside `hope_api`) in the File Manager editor and set:

```dotenv
DB_NAME=<your database name, from the phpMyAdmin sidebar>
DB_PASSWORD=<your database password>
```

Everything else is pre-filled for `https://bhope-api.billucsolutions.co.ke`
with `DB_DRIVER=mysql`, `NODE_ENV=production`, `TRUST_PROXY=1`. If phpMyAdmin
shows the database only via a UNIX socket and connections fail, also set
`DB_SOCKET=/var/lib/mysql/mysql.sock` (check the phpMyAdmin home page for
the exact path). Save with permissions `600`.

### 4. Register the Node application

In the Node manager ("Setup Node.js App" / Node selector):

| Setting           | Value |
| ----------------- | ----- |
| Node version      | 24 LTS (any 22.13+ works; mysql needs only 18+) |
| Application root  | `hope_api` (the folder with `app.cjs`) |
| Application URL   | the domain root |
| Application mode  | Production |
| Startup file      | `app.cjs` |

If the panel has no Node manager, put the `.htaccess` from this package into
the document root (`hope_api/public/`) and fill in the two values explained
in its comments (`PassengerAppRoot`, `PassengerNodejs`). `diag.php` prints
both paths — upload it into `public/` and open it in the browser once.

### 5. Dependencies

`node_modules/` is already included. If the Node manager shows a
**Run npm install** button, run it anyway — some managers keep their own
dependency folder and this keeps both in sync.

### 6. Restart and verify

1. Open `restart.php` in the browser (copy it into `public/` first if your
   document root is `hope_api/public`) — or click **Restart** in the Node
   manager.
2. `https://bhope-api.billucsolutions.co.ke/api/v1/health` should return
   `{"status":"ok","db":"ok","service":"beacon-of-hope-api"}`.
3. `https://bhope-api.billucsolutions.co.ke/api/v1/devotionals` should list
   the two seeded devotionals.
4. `/console/` opens the editorial studio.
5. Delete `diag.php` (and `restart.php` if you prefer) once everything works.

### 7. Create the first admin account

If the Node manager offers **Run JS Script**: temporarily add to `.env`:

```dotenv
CREATE_USER_EMAIL=you@example.com
CREATE_USER_NAME=Your Name
CREATE_USER_ROLE=admin
CREATE_USER_PASSWORD=a-new-password-10-plus-chars
```

Run the `user:create` script, verify the sign-in works at `/console/`, then
**remove all four lines** from `.env` and restart. Without "Run JS Script",
ask the host to run it once, or use SSH if you get access later.

## Troubleshooting

- **`Can't acquire lock for app: .../hope_api`** and/or the Node manager shows
  **`Cannot read properties of null (reading 'details')`** — Passenger tried
  to start the app repeatedly and the process exited instantly every time
  (each dead spawn leaves a stale lock, and the manager UI cannot read a
  dead process's details). Fix the underlying crash, then Restart in the
  manager. In order:
  1. Read `hope_api/startup.log` in the File Manager — the app appends the
     exact failure there (secrets redacted).
  2. Confirm `app.cjs`, `package.json`, `dist/`, `.env`, `node_modules/`,
     and `public/` sit DIRECTLY inside `hope_api` — a nested folder from a
     zip extraction is the most common cause.
  3. Confirm the manager has only ONE app entry for `hope_api` (duplicates
     fight over the same lock) and no `.htaccess` with `PassengerAppRoot`
     sits in the document root while the manager is registering the app —
     use ONE registration path, never both.
  4. Restart. A lock older than ~10 minutes may need a second Restart, or
     ask the host to restart Apache/clear Passenger instance directories.
- **503 on every `/api` call** — the Node process is not booting. The exact
  reason is in `hope_api/startup.log` and the panel error log (DirectAdmin:
  File Manager → `~/domains/<domain>/logs/<domain>.error.log`).
- **200 with `{"status":"degraded","db":"error","code":"..."}`** — the
  backend IS running but the database is not ready. The `code` says which:
  `ER_BAD_DB_ERROR` → `DB_NAME` is wrong; `ER_ACCESS_DENIED_ERROR` →
  `DB_USER`/`DB_PASSWORD` are wrong; `ECONNREFUSED` → no TCP listener, set
  `DB_SOCKET=/var/lib/mysql/mysql.sock` (path from the phpMyAdmin home
  page); missing tables → import the schema (step 2). The API keeps serving
  so you can iterate without crash loops.
- **403 `This origin is not allowed.`** — a browser client from another
  domain is calling the API; add that origin to `ALLOWED_ORIGINS`.
- After ANY change: open `restart.php`, wait ~10 seconds, retry.

## Notes

- `health` answers 200 even when the database is down (`status: degraded`)
  so you can always tell a boot failure (503) from a database failure (200
  + degraded).
- The SQLite fallback in this build also works (needs Node 22.13+) and now
  writes to `.local/api.sqlite` inside the app root; `DB_SQLITE_PATH`
  overrides it. MySQL remains the production driver.
- Merchant keys (M-Pesa, Paystack) are intentionally blank; giving stays
  disabled until they are set — see `docs/GIVING.md` in the repository.
