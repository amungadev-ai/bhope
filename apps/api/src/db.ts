import { mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from './config.js';
import { devotionalSeeds } from '@bhope/shared';

export interface Database {
  driver: 'sqlite' | 'mysql';
  all<T = Record<string, unknown>>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  run(sql: string, params?: (string | number | null)[]): Promise<number>;
  close(): Promise<void>;
}
export async function openDatabase(config: Config, sqlitePath?: string): Promise<Database> {
  if (config.DB_DRIVER === 'mysql') {
    const { createPool } = await import('mysql2/promise');
    const pool = createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      // Some shared hosts expose MariaDB only through a UNIX socket
      // (e.g. /var/lib/mysql/mysql.sock); DB_SOCKET switches to it.
      ...(config.DB_SOCKET ? { socketPath: config.DB_SOCKET } : {}),
      connectionLimit: config.DB_POOL_SIZE,
      waitForConnections: true,
      queueLimit: 30,
      charset: 'utf8mb4',
      multipleStatements: false,
      connectTimeout: 10000,
    });
    return {
      driver: 'mysql',
      async all<T>(sql: string, params: (string | number | null)[] = []) {
        const [rows] = await pool.execute(sql, params);
        return rows as T[];
      },
      async run(sql, params = []) {
        const [result] = await pool.execute(sql, params);
        return (result as { affectedRows: number }).affectedRows;
      },
      async close() {
        await pool.end();
      },
    };
  }
  // The compiled file lives in dist/, so ../.local lands inside the app
  // root, which is writable on shared hosting. The old default resolved
  // three directories above this file, outside the account. DB_SQLITE_PATH
  // in .env overrides it (absolute path, or relative to dist/).
  const path =
    sqlitePath ??
    (config.DB_SQLITE_PATH
      ? fileURLToPath(new URL(config.DB_SQLITE_PATH, import.meta.url))
      : fileURLToPath(new URL('../.local/api.sqlite', import.meta.url)));
  if (path !== ':memory:') await mkdir(dirname(path), { recursive: true });
  const { DatabaseSync } = await import('node:sqlite');
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (path !== ':memory:') sqlite.exec('PRAGMA journal_mode = WAL;');
  return {
    driver: 'sqlite',
    async all<T>(sql: string, params: (string | number | null)[] = []) {
      return sqlite.prepare(sql).all(...(params as (string | number | null)[])) as T[];
    },
    async run(sql, params = []) {
      return Number(sqlite.prepare(sql).run(...(params as (string | number | null)[])).changes);
    },
    async close() {
      sqlite.close();
    },
  };
}
export async function migrate(db: Database) {
  const directory = new URL('../migrations/', import.meta.url);
  for (const filename of (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    const schema = await readFile(new URL(filename, directory), 'utf8');
    for (const statement of schema
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean))
      await db.run(
        db.driver === 'mysql'
          ? `${statement} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
          : statement,
      );
  }
  const [{ total }] = await db.all<{ total: number }>('SELECT COUNT(*) AS total FROM devotionals');
  if (!Number(total))
    for (const [index, devotional] of devotionalSeeds.entries()) {
      await db.run(
        'INSERT INTO devotionals (id, payload, status, publish_at, author_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          devotional.id,
          JSON.stringify(devotional),
          'published',
          new Date(Date.now() - (index + 1) * 86400000).toISOString(),
          null,
          new Date().toISOString(),
        ],
      );
    }
}
