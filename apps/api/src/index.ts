import { loadConfig } from './config.js';
import { openDatabase, migrate } from './db.js';
import { createApp } from './app.js';
const config = loadConfig();
const db = await openDatabase(config);
if (config.DB_DRIVER === 'sqlite') await migrate(db);
else await db.all('SELECT id FROM users LIMIT 1');
const server = createApp(config, db).listen(config.PORT, () =>
  console.log(`Beacon of Hope API ready on port ${config.PORT}`),
);
async function shutdown() {
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
