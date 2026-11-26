import { loadConfig } from './config.js';
import { openDatabase, migrate } from './db.js';
import { createApp } from './app.js';
const config = loadConfig();
// The built-in node:sqlite module is only usable without a flag from Node
// 22.13 / 23.4 onward. The mysql driver never loads it, so shared hosts on
// older Node must use DB_DRIVER=mysql. The repo targets Node 24 (see .nvmrc).
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const sqliteReady =
  nodeMajor > 23 || (nodeMajor === 23 && nodeMinor >= 4) || (nodeMajor === 22 && nodeMinor >= 13);
if (config.DB_DRIVER === 'sqlite' && !sqliteReady) {
  console.error(
    `DB_DRIVER=sqlite requires Node 22.13+ or 23.4+ (found v${process.versions.node}). ` +
      'Select a newer Node version in the hosting Node manager, or switch DB_DRIVER to mysql in .env.',
  );
  process.exit(1);
}
let db: Awaited<ReturnType<typeof openDatabase>>;
try {
  db = await openDatabase(config);
  if (config.DB_DRIVER === 'sqlite') await migrate(db);
} catch (error) {
  // Fatal: without a usable SQLite file the API cannot serve at all.
  const err = error as { code?: string; sqlMessage?: string; message?: string };
  const reason = [err.code, err.sqlMessage || err.message].filter(Boolean).join(': ') || String(error);
  console.error(
    `Database startup failed: ${reason}. Check the DB_* settings in .env, then restart the app.`,
  );
  process.exit(1);
}
if (config.DB_DRIVER !== 'sqlite') {
  try {
    await db.all('SELECT id FROM users LIMIT 1');
    console.log('Database connection verified.');
  } catch (error) {
    // NOT fatal: an instant exit crash-loops Passenger (stale app locks, a
    // blind Node-manager UI) and hides the cause. Booting anyway lets
    // /api/v1/health report the live database status and error code, so the
    // remaining fix stays visible over HTTP.
    const err = error as { code?: string; sqlMessage?: string; message?: string };
    const reason = [err.code, err.sqlMessage || err.message].filter(Boolean).join(': ') || String(error);
    console.error(
      `WARNING: the database is not ready (${reason}). The API is still starting. ` +
        'Import database/bhope-mariadb-schema.sql via phpMyAdmin (once), verify the DB_* settings in .env, then restart.',
    );
  }
}
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
