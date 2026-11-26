import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request } from 'express';
import type { Database } from './db.js';
const derive = promisify(scrypt);
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'editor' | 'admin';
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [salt, hex] = encoded.split(':');
  if (!salt || !hex) return false;
  const derived = (await derive(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function requestToken(req: Request) {
  const bearer = req.get('authorization');
  const cookie = req
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('bhope_session='))
    ?.slice(14);
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : cookie;
  return token && /^[a-f0-9]{64}$/.test(token) ? token : undefined;
}
export async function createSession(db: Database, userId: string) {
  const token = randomBytes(32).toString('hex');
  await db.run('DELETE FROM sessions WHERE expires_at < ?', [new Date().toISOString()]);
  await db.run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [
    tokenHash(token),
    userId,
    new Date(Date.now() + 7 * 86400000).toISOString(),
  ]);
  return token;
}
export async function createUser(
  db: Database,
  input: { email: string; name: string; password: string; role: User['role'] },
): Promise<User> {
  const user = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
  };
  await db.run(
    'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      user.id,
      user.email,
      user.name,
      await hashPassword(input.password),
      user.role,
      new Date().toISOString(),
    ],
  );
  return user;
}
