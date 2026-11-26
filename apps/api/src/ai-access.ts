import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from './db.js';
import type { Config } from './config.js';
import type { User } from './auth.js';
import { HttpError } from './errors.js';
export const FREE_AI_USES = 5;
export const AI_MONTHLY_KES = 150;
interface AccessRow {
  user_id: string;
  free_used: number;
  paid_until: string | null;
}
async function ensure(db: Database, userId: string) {
  const insert = db.driver === 'mysql' ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
  await db.run(
    `${insert} INTO ai_access (user_id, free_used, paid_until, updated_at) VALUES (?, 0, NULL, ?)`,
    [userId, new Date().toISOString()],
  );
  return (
    await db.all<AccessRow>(
      'SELECT user_id, free_used, paid_until FROM ai_access WHERE user_id = ?',
      [userId],
    )
  )[0];
}
export async function aiAccess(db: Database, config: Config, user: User) {
  const row = await ensure(db, user.id);
  const staff = user.role === 'admin' || user.role === 'editor';
  const paid = Boolean(row.paid_until && row.paid_until > new Date().toISOString());
  const day = new Date().toISOString().slice(0, 10);
  const used =
    (
      await db.all<{ calls: number }>(
        'SELECT calls FROM daily_ai_usage WHERE user_id = ? AND day = ?',
        [user.id, day],
      )
    )[0]?.calls ?? 0;
  return {
    freeTotal: FREE_AI_USES,
    freeUsed: Number(row.free_used),
    freeRemaining: Math.max(0, FREE_AI_USES - Number(row.free_used)),
    active: staff || paid,
    staff,
    paidUntil: row.paid_until,
    monthlyPrice: AI_MONTHLY_KES,
    currency: 'KES',
    dailyLimit: config.AI_DAILY_LIMIT,
    dailyRemaining: Math.max(0, config.AI_DAILY_LIMIT - Number(used)),
    billingAvailable: false,
    aiEnabled: Boolean(config.DEEPSEEK_API_KEY),
  };
}
export async function reserveAiRequest(db: Database, config: Config, user: User) {
  const access = await aiAccess(db, config, user);
  let freeReserved = false;
  if (!access.active) {
    freeReserved = Boolean(
      await db.run(
        'UPDATE ai_access SET free_used = free_used + 1, updated_at = ? WHERE user_id = ? AND free_used < ?',
        [new Date().toISOString(), user.id, FREE_AI_USES],
      ),
    );
    if (!freeReserved)
      throw new HttpError(
        402,
        'Your 5 free AI uses are complete. The AI plan is KES 150/month. Your notebook and Bible remain free.',
      );
  }
  const refund = async () => {
    if (freeReserved) {
      freeReserved = false;
      await db.run(
        'UPDATE ai_access SET free_used = free_used - 1, updated_at = ? WHERE user_id = ? AND free_used > 0',
        [new Date().toISOString(), user.id],
      );
    }
  };
  const day = new Date().toISOString().slice(0, 10);
  const insert = db.driver === 'mysql' ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
  try {
    await db.run(`${insert} INTO daily_ai_usage (user_id, day, calls) VALUES (?, ?, 0)`, [
      user.id,
      day,
    ]);
    if (
      !(await db.run(
        'UPDATE daily_ai_usage SET calls = calls + 1 WHERE user_id = ? AND day = ? AND calls < ?',
        [user.id, day, config.AI_DAILY_LIMIT],
      ))
    )
      throw new HttpError(
        429,
        'Your daily AI request limit has been reached. Please return tomorrow.',
      );
  } catch (error) {
    await refund();
    throw error;
  }
  return { refund };
}
export function aiAccessRoutes(db: Database, config: Config, authenticate: RequestHandler) {
  const router = Router();
  router.get('/ai/access', authenticate, async (_req, res) =>
    res.json(await aiAccess(db, config, res.locals.user as User)),
  );
  router.get('/studio/ai-access', authenticate, async (_req, res) => {
    if ((res.locals.user as User).role !== 'admin')
      throw new HttpError(403, 'Administrator access is required.');
    const items = await db.all(
      'SELECT u.id, u.name, u.email, u.role, COALESCE(a.free_used, 0) AS freeUsed, a.paid_until AS paidUntil FROM users u LEFT JOIN ai_access a ON a.user_id = u.id ORDER BY u.created_at DESC LIMIT 500',
    );
    res.json({
      items,
      freeUses: FREE_AI_USES,
      monthlyPrice: AI_MONTHLY_KES,
      dailyLimit: config.AI_DAILY_LIMIT,
      billingAvailable: false,
    });
  });
  // A support adjustment is auditable and does not create a paid transaction or donation.
  router.patch('/studio/ai-access/:id', authenticate, async (req, res) => {
    const actor = res.locals.user as User;
    if (actor.role !== 'admin') throw new HttpError(403, 'Administrator access is required.');
    const { paidUntil, reason } = z
      .object({
        paidUntil: z.iso.datetime().nullable(),
        reason: z.string().trim().min(10).max(500),
      })
      .parse(req.body);
    const userId = String(req.params.id);
    if (!(await db.all('SELECT id FROM users WHERE id = ?', [userId])).length)
      throw new HttpError(404, 'This account could not be found.');
    if (
      paidUntil &&
      (Date.parse(paidUntil) <= Date.now() || Date.parse(paidUntil) > Date.now() + 366 * 86400000)
    )
      throw new HttpError(400, 'Choose an expiry within the next year.');
    await ensure(db, userId);
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO ai_access_events (id, user_id, actor_id, paid_until, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [randomUUID(), userId, actor.id, paidUntil, reason, now],
    );
    await db.run('UPDATE ai_access SET paid_until = ?, updated_at = ? WHERE user_id = ?', [
      paidUntil,
      now,
      userId,
    ]);
    res.status(204).end();
  });
  return router;
}
