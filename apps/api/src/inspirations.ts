import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { getTikTokVideoId } from '@bhope/shared';
import type { Database } from './db.js';
import type { User } from './auth.js';
import { HttpError } from './errors.js';
type Row = {
  id: string;
  payload: string;
  status: string;
  publish_at: string | null;
  author_id: string;
  updated_at: string;
};
const unpack = (row: Row) => ({
  ...JSON.parse(row.payload),
  status: row.status,
  publishAt: row.publish_at,
  updatedAt: row.updated_at,
});
const schema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  title: z.string().trim().max(180),
  titleSw: z.string().trim().max(180),
  description: z.string().max(2000),
  descriptionSw: z.string().max(2000),
  category: z.string().trim().min(1).max(40),
  url: z
    .string()
    .refine(
      (value) => Boolean(getTikTokVideoId(value)),
      'Use a full public TikTok video URL, not a profile or shortened link.',
    ),
  status: z.enum(['draft', 'review', 'published']),
  publishAt: z.iso.datetime().nullable(),
});
export function inspirationRoutes(
  db: Database,
  authenticate: RequestHandler,
  staff: RequestHandler,
) {
  const router = Router();
  router.get('/inspirations', async (_req, res) =>
    res.json(
      (
        await db.all<Row>(
          'SELECT * FROM inspirations WHERE status = ? AND publish_at <= ? ORDER BY publish_at DESC LIMIT 60',
          ['published', new Date().toISOString()],
        )
      ).map(unpack),
    ),
  );
  router.get('/studio/inspirations', authenticate, staff, async (_req, res) =>
    res.json(
      (await db.all<Row>('SELECT * FROM inspirations ORDER BY updated_at DESC')).map(unpack),
    ),
  );
  router.put('/studio/inspirations/:id', authenticate, staff, async (req, res) => {
    const input = schema.parse(req.body);
    if (input.id !== req.params.id) throw new HttpError(400, 'Video ID does not match.');
    const user = res.locals.user as User;
    const [existing] = await db.all<Row>('SELECT * FROM inspirations WHERE id = ?', [input.id]);
    if (
      user.role !== 'admin' &&
      (input.status === 'published' ||
        existing?.status === 'published' ||
        (existing && existing.author_id !== user.id))
    )
      throw new HttpError(
        403,
        'An administrator must approve published videos and changes to them.',
      );
    if (input.status === 'published' && (!input.publishAt || !input.title || !input.titleSw))
      throw new HttpError(400, 'Publishing requires both titles and a publication date.');
    const { status, publishAt, ...payload } = input;
    const values = [JSON.stringify(payload), status, publishAt, new Date().toISOString()];
    if (existing)
      await db.run(
        'UPDATE inspirations SET payload = ?, status = ?, publish_at = ?, updated_at = ? WHERE id = ?',
        [...values, input.id],
      );
    else
      await db.run(
        'INSERT INTO inspirations (payload, status, publish_at, updated_at, id, author_id) VALUES (?, ?, ?, ?, ?, ?)',
        [...values, input.id, user.id],
      );
    res.json({ ...input, updatedAt: values[3] });
  });
  return router;
}
