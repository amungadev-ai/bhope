# Connect the mobile app to the rebuilt API

The first rebuild connects Expo directly to
https://api.billucsolutions.co.ke/api/v1. It does not use a dashboard or Vercel
proxy. Reading the Bible and editing notes remain local and available offline.

Upload the separate beacon-mobile-api-1 hosting ZIP and verify these endpoints
before testing the phone:

- https://api.billucsolutions.co.ke/api/v1/health
- https://api.billucsolutions.co.ke/api/v1/health/database
- https://api.billucsolutions.co.ke/api/v1/health/ready

They must identify build beacon-mobile-api-1. Database and readiness should
report connected. Keep the existing private backend .env and MySQL database.
This mobile update does not require a migration or a fresh install.

In PowerShell, stop the running Expo process and run:

```powershell
Set-Location "$env:USERPROFILE\Projects\bhope"
git pull --ff-only
npm run mobile:connect
Set-Location .\apps\mobile
npx expo start --clear
```

The helper changes only EXPO_PUBLIC_API_URL in apps/mobile/.env. Other
environment settings are preserved. This is a public API address, so no
database password, DeepSeek key or payment credential belongs in that file.

Open the app in Expo Go. Go to More > Account > Test API connection. Expect
Connected · beacon-mobile-api-1, then sign in with an existing account or create
a reader account. The connection check is visible only in development builds.
Sign-in uses the existing secure token store and sends a bearer token directly
to the API. It does not rely on browser cookies.

Published devotionals and inspirations use the existing mobile refresh logic.
The notebook database, Bible data and note editor are unchanged. The backend
has private note endpoints, but automatic note synchronization is a later step.
AI generation and payment initiation remain disabled in this first rebuild.

For local backend development, EXPO_PUBLIC_API_URL can instead use a reachable
LAN address, such as http://192.168.1.20:3000/api/v1. Restart Expo after changing
it. On a physical phone, localhost points to the phone itself.
