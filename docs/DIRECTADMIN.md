# DirectAdmin deployment

Target API: **https://bhope-api.billucsolutions.co.ke/api/v1**. Hosting directory supplied for the project: **/domains/bhope-api.billucsolutions.co.ke/hope_api**. DirectAdmin paths are often relative to the hosting account's home; verify the actual full path in File Manager or Terminal.

These instructions prepare the existing host. No live hosting account has been accessed or changed by this repository setup.

## 1. Build on your computer

```sh
npm ci
npm run deploy:prepare
```

Upload the **contents** of `.local/deploy-api/` into `hope_api`. The package contains compiled API code, the compiled studio, SQL migrations, staff tools, shared JavaScript, and a backend-only package.json. It contains no `.env`, local databases, or complete licensed Bible texts.

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

## 4. Set environment variables

Use the Node manager's environment-variable controls. The included `.env.example` documents all settings; a private `.env` outside `public/` is also supported.

```dotenv
NODE_ENV=production
APP_URL=https://bhope-api.billucsolutions.co.ke
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=jobready_bhope_db
DB_USER=jobready_bhope_db_admin
DB_PASSWORD=SET_THE_ROTATED_PASSWORD_ON_THE_HOST
DB_POOL_SIZE=5
ALLOWED_ORIGINS=https://bhope-api.billucsolutions.co.ke
TRUST_PROXY=0
ALLOW_REGISTRATION=true
DEEPSEEK_API_KEY=SET_ON_THE_HOST
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

In the deployed application directory, with its environment loaded:

```sh
npm run db:migrate
npm run user:create -- --email you@example.com --name "Your Name" --role admin
```

The account tool prompts for a hidden password. It also supports `CREATE_USER_PASSWORD` for a temporary secure environment injection; do not put passwords in command-line arguments or source files. The schema contains users, hashed sessions, devotionals, private note records, daily AI usage counters, role-change audit events, curated inspirations, and donations. Migrations run in filename order; the new tables do not replace existing notes or accounts. Two original sample devotionals are seeded only when the library is empty.

## 6. Restart and verify

- `GET /api/v1/health` returns `{"status":"ok","service":"beacon-of-hope-api"}` after checking the database.
- `/console/` opens the editorial studio.
- Admin/editor sign-in works, and readers cannot access staff endpoints.
- `GET /api/v1/devotionals` returns published content whose publication time has arrived.
- The server can make outbound HTTPS requests to `api.deepseek.com`.
- `GET /api/v1/inspirations` returns an empty list until a real video is published.
- Admins can view Giving & reports; editors cannot access finance endpoints.
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
