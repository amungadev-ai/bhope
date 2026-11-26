import { Router, type Request, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Config } from './config.js';
import type { Database } from './db.js';
import { requestToken, tokenHash, type User } from './auth.js';
import { HttpError } from './errors.js';
export type DonationRow = {
  id: string;
  user_id: string | null;
  idempotency_key: string;
  token_hash: string;
  amount_minor: number;
  currency: string;
  method: 'mpesa' | 'card';
  status: string;
  reference: string;
  provider_ref: string | null;
  checkout_url: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};
const publicDonation = (row: DonationRow) => ({
  id: row.id,
  amount: Number(row.amount_minor) / 100,
  currency: row.currency,
  method: row.method,
  status: row.status,
  reference: row.reference,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
export const normalizePhone = (value: string) => {
  const digits = value.replace(/[\s()+-]/g, '');
  const phone = digits.startsWith('0')
    ? `254${digits.slice(1)}`
    : /^[17]\d{8}$/.test(digits)
      ? `254${digits}`
      : digits;
  return /^254[17]\d{8}$/.test(phone) ? phone : null;
};
export function givingCapabilities(config: Config) {
  return {
    mpesa: Boolean(
      config.MPESA_CONSUMER_KEY &&
      config.MPESA_CONSUMER_SECRET &&
      config.MPESA_SHORTCODE &&
      config.MPESA_PASSKEY &&
      config.APP_URL.startsWith('https://'),
    ),
    card: Boolean(config.PAYSTACK_SECRET_KEY && config.APP_URL.startsWith('https://')),
    currency: 'KES',
    minimum: 10,
    maximum: 50000,
  };
}
export function verifyPaystackSignature(
  raw: Buffer,
  primary: string | undefined,
  legacy: string | undefined,
  config: Config,
  now = Math.floor(Date.now() / 1000),
) {
  if (config.PAYSTACK_WEBHOOK_SECRET) {
    if (!primary) return false;
    let timestamp: number | undefined;
    const signatures: string[] = [];
    for (const part of primary.split(',')) {
      const [key, ...rest] = part.split('=');
      const value = rest.join('=').trim();
      if (key.trim() === 't') {
        if (timestamp !== undefined || !/^\d+$/.test(value)) return false;
        timestamp = Number(value);
      } else if (key.trim() === 'v1') {
        const separator = value.indexOf(':');
        if (separator > 0) signatures.push(value.slice(separator + 1));
      }
    }
    if (timestamp === undefined || !Number.isFinite(timestamp) || Math.abs(now - timestamp) > 300)
      return false;
    const expected = createHmac('sha512', config.PAYSTACK_WEBHOOK_SECRET)
      .update(`${timestamp}.`)
      .update(raw)
      .digest();
    return signatures.some(
      (signature) =>
        /^[0-9a-f]{128}$/.test(signature) &&
        timingSafeEqual(expected, Buffer.from(signature, 'hex')),
    );
  }
  if (!config.PAYSTACK_SECRET_KEY || !legacy || !/^[0-9a-f]{128}$/.test(legacy)) return false;
  return timingSafeEqual(
    createHmac('sha512', config.PAYSTACK_SECRET_KEY).update(raw).digest(),
    Buffer.from(legacy, 'hex'),
  );
}
export function paymentRoutes(
  config: Config,
  db: Database,
  authenticate: RequestHandler,
  providerFetch: typeof fetch = fetch,
) {
  const router = Router();
  const limits = rateLimit({
    windowMs: 15 * 60000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Please wait before starting another gift.' },
  });
  async function optionalUser(req: Request): Promise<User | undefined> {
    const token = requestToken(req);
    if (!token) {
      if (req.get('authorization'))
        throw new HttpError(401, 'Please sign in again before continuing.');
      return undefined;
    }
    const user = (
      await db.all<User>(
        'SELECT u.id, u.email, u.name, u.role FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ?',
        [tokenHash(token), new Date().toISOString()],
      )
    )[0];
    if (!user) throw new HttpError(401, 'Please sign in again before continuing.');
    return user;
  }
  async function providerJson(url: string, options: RequestInit = {}) {
    let response: globalThis.Response;
    try {
      response = await providerFetch(url, { ...options, signal: AbortSignal.timeout(18000) });
    } catch {
      throw new HttpError(
        502,
        'The payment provider did not respond. Check the current payment before trying again.',
      );
    }
    if (!response.ok) throw new HttpError(502, 'The payment provider is temporarily unavailable.');
    return response.json() as Promise<Record<string, any>>;
  }
  const mpesaBase =
    config.MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  async function mpesaCredentials() {
    const result = await providerJson(
      `${mpesaBase}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.MPESA_CONSUMER_KEY}:${config.MPESA_CONSUMER_SECRET}`).toString('base64')}`,
        },
      },
    );
    if (!result.access_token) throw new HttpError(502, 'M-Pesa authorization is unavailable.');
    const timestamp = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]);
    const parts = Object.fromEntries(timestamp);
    const time = `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
    return {
      token: String(result.access_token),
      timestamp: time,
      password: Buffer.from(`${config.MPESA_SHORTCODE}${config.MPESA_PASSKEY}${time}`).toString(
        'base64',
      ),
    };
  }
  async function authorized(req: Request, id: string) {
    const [row] = await db.all<DonationRow>('SELECT * FROM donations WHERE id = ?', [id]);
    if (!row) throw new HttpError(404, 'This donation could not be found.');
    const user = await optionalUser(req);
    const token = typeof req.query.token === 'string' ? req.query.token : req.params.token;
    if (
      user?.id === row.user_id ||
      (typeof token === 'string' &&
        /^[a-f0-9]{64}$/.test(token) &&
        timingSafeEqual(Buffer.from(row.token_hash), Buffer.from(tokenHash(token))))
    )
      return row;
    throw new HttpError(404, 'This donation could not be found.');
  }
  async function refresh(row: DonationRow, force = false) {
    if (!force && row.status !== 'pending') return row;
    const now = new Date().toISOString();
    const cutoff = new Date(Date.now() - 12000).toISOString();
    if (
      !force &&
      !(await db.run(
        'UPDATE donations SET last_checked_at = ? WHERE id = ? AND (last_checked_at IS NULL OR last_checked_at < ?)',
        [now, row.id, cutoff],
      ))
    )
      return row;
    let status = row.status;
    if (row.method === 'card') {
      const result = await providerJson(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(row.reference)}`,
        { headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}` } },
      );
      const data = result.data;
      if (
        !result.status ||
        !data ||
        data.reference !== row.reference ||
        Number(data.amount) !== Number(row.amount_minor) ||
        data.currency !== row.currency
      )
        throw new HttpError(502, 'The payment details could not be verified.');
      if (data.status === 'success') status = 'success';
      else if (['failed', 'abandoned'].includes(data.status) && row.status !== 'success')
        status = 'failed';
      else if (data.status === 'reversed') status = 'reversed';
    } else if (row.provider_ref) {
      const auth = await mpesaCredentials();
      const result = await providerJson(`${mpesaBase}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BusinessShortCode: config.MPESA_SHORTCODE,
          Password: auth.password,
          Timestamp: auth.timestamp,
          CheckoutRequestID: row.provider_ref,
        }),
      });
      if (result.CheckoutRequestID && result.CheckoutRequestID !== row.provider_ref)
        throw new HttpError(502, 'M-Pesa returned a different transaction.');
      if (result.ResultCode !== undefined && String(result.ResultCode) === '0') status = 'success';
      else if (
        [1, 1032, 1037, 2001].includes(Number(result.ResultCode)) &&
        row.status !== 'success'
      )
        status = 'failed';
    }
    if (status !== row.status)
      await db.run(
        "UPDATE donations SET status = ?, updated_at = ? WHERE id = ? AND status <> 'reversed' AND (status <> 'success' OR ? = 'reversed')",
        [status, now, row.id, status],
      );
    // A callback may have confirmed the gift while this verification was in flight.
    // Return the latest stored state and never let an older failure undo success.
    const [latest] = await db.all<DonationRow>('SELECT * FROM donations WHERE id = ?', [row.id]);
    return latest ?? row;
  }
  router.post('/donations', limits, async (req, res) => {
    const input = z
      .object({
        amount: z.number().int().min(10).max(50000),
        method: z.enum(['mpesa', 'card']),
        phone: z.string().max(30).optional(),
        email: z.email().max(254).optional(),
        idempotencyKey: z.string().regex(/^[a-zA-Z0-9-]{10,80}$/),
        clientToken: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .parse(req.body);
    const capability = givingCapabilities(config);
    if (!capability[input.method])
      throw new HttpError(503, 'This giving method is not available yet. Please return later.');
    if (input.method === 'mpesa' && !normalizePhone(input.phone ?? ''))
      throw new HttpError(400, 'Enter a valid Kenyan M-Pesa mobile number.');
    if (input.method === 'card' && !input.email)
      throw new HttpError(400, 'An email address is needed for your card receipt.');
    const user = await optionalUser(req);
    const [existing] = await db.all<DonationRow>(
      'SELECT * FROM donations WHERE idempotency_key = ?',
      [input.idempotencyKey],
    );
    if (existing) {
      if (
        (user && existing.user_id === user.id) ||
        (input.clientToken && tokenHash(input.clientToken) === existing.token_hash)
      )
        return void res.json({
          donation: publicDonation(existing),
          checkoutUrl: existing.checkout_url,
          token: input.clientToken,
        });
      throw new HttpError(
        409,
        'This gift was already started. Check its current status before trying again.',
      );
    }
    const id = randomUUID(),
      token = input.clientToken ?? randomBytes(32).toString('hex'),
      reference = `bhope-${id}`,
      now = new Date().toISOString();
    const row: DonationRow = {
      id,
      user_id: user?.id ?? null,
      idempotency_key: input.idempotencyKey,
      token_hash: tokenHash(token),
      amount_minor: input.amount * 100,
      currency: 'KES',
      method: input.method,
      status: 'pending',
      reference,
      provider_ref: null,
      checkout_url: null,
      last_checked_at: null,
      created_at: now,
      updated_at: now,
    };
    await db.run(
      'INSERT INTO donations (id, user_id, idempotency_key, token_hash, amount_minor, currency, method, status, reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        row.user_id,
        input.idempotencyKey,
        row.token_hash,
        row.amount_minor,
        row.currency,
        row.method,
        row.status,
        reference,
        now,
        now,
      ],
    );
    try {
      if (input.method === 'card') {
        const result = await providerJson('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: input.email,
            amount: row.amount_minor,
            currency: 'KES',
            reference,
            channels: ['card'],
            callback_url: `${config.APP_URL}/api/v1/payments/paystack/return`,
            metadata: { donation_id: id },
          }),
        });
        if (
          !result.status ||
          !result.data?.authorization_url ||
          (result.data.reference && result.data.reference !== reference)
        )
          throw new HttpError(502, 'The card checkout could not be created.');
        const url = new URL(result.data.authorization_url);
        if (
          url.protocol !== 'https:' ||
          !['checkout.paystack.com', 'checkout.paystack.co'].includes(url.hostname) ||
          url.port ||
          url.username
        )
          throw new HttpError(502, 'The checkout address could not be verified.');
        row.checkout_url = url.toString();
        row.provider_ref = reference;
      } else {
        const auth = await mpesaCredentials();
        const phone = normalizePhone(input.phone!)!;
        const result = await providerJson(`${mpesaBase}/mpesa/stkpush/v1/processrequest`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            BusinessShortCode: config.MPESA_SHORTCODE,
            Password: auth.password,
            Timestamp: auth.timestamp,
            TransactionType: config.MPESA_TRANSACTION_TYPE,
            Amount: input.amount,
            PartyA: phone,
            PartyB: config.MPESA_SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: `${config.APP_URL}/api/v1/payments/mpesa/callback/${id}/${token}`,
            AccountReference: 'BeaconHope',
            TransactionDesc: 'Hope donation',
          }),
        });
        if (String(result.ResponseCode) !== '0' || !result.CheckoutRequestID)
          throw new HttpError(502, 'M-Pesa did not accept the prompt request.');
        row.provider_ref = String(result.CheckoutRequestID);
      }
      await db.run('UPDATE donations SET provider_ref = ?, checkout_url = ? WHERE id = ?', [
        row.provider_ref,
        row.checkout_url,
        id,
      ]);
      res.status(201).json({ donation: publicDonation(row), token, checkoutUrl: row.checkout_url });
    } catch {
      res.status(202).json({
        donation: publicDonation(row),
        token,
        checkoutUrl: null,
        message:
          'The provider response could not be confirmed. Check this gift before starting another payment.',
      });
    }
  });
  router.get('/donations/history', authenticate, async (_req, res) =>
    res.json(
      (
        await db.all<DonationRow>(
          'SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC LIMIT 200',
          [(res.locals.user as User).id],
        )
      ).map(publicDonation),
    ),
  );
  router.get('/donations/:id', async (req, res) =>
    res.json(publicDonation(await authorized(req, String(req.params.id)))),
  );
  router.post('/donations/:id/refresh', async (req, res) =>
    res.json(publicDonation(await refresh(await authorized(req, String(req.params.id))))),
  );
  router.post('/payments/mpesa/callback/:id/:token', async (req, res) => {
    const row = await authorized(req, String(req.params.id));
    const body = req.body?.Body?.stkCallback;
    if (row.method !== 'mpesa' || !row.provider_ref || body?.CheckoutRequestID !== row.provider_ref)
      throw new HttpError(400, 'The M-Pesa callback does not match this gift.');
    await refresh(row, true);
    res.json({ ResultCode: 0, ResultDesc: 'Received' });
  });
  router.post('/payments/paystack/webhook', async (req, res) => {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (
      !raw ||
      !verifyPaystackSignature(
        raw,
        req.get('paystack-signature'),
        req.get('x-paystack-signature'),
        config,
      )
    )
      throw new HttpError(401, 'The webhook signature is invalid.');
    if (req.body?.event !== 'charge.success' && !String(req.body?.event).startsWith('refund.'))
      return void res.status(200).end();
    const reference = req.body?.data?.reference ?? req.body?.data?.transaction_reference;
    if (typeof reference === 'string') {
      const [row] = await db.all<DonationRow>(
        'SELECT * FROM donations WHERE reference = ? AND method = ?',
        [reference, 'card'],
      );
      if (row) await refresh(row, true);
    }
    res.status(200).end();
  });
  router.get('/payments/paystack/return', (_req, res) =>
    res
      .type('html')
      .send(
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beacon of Hope</title></head><body style="background:#f7f7f0;color:#193b32;font-family:system-ui;padding:40px"><h1>Thank you for a little hope.</h1><p>Return to Beacon of Hope. Your payment status updates automatically.</p></body></html>',
      ),
  );
  router.get('/studio/donations', authenticate, async (_req, res) => {
    if ((res.locals.user as User).role !== 'admin')
      throw new HttpError(403, 'Administrator access is required.');
    const rows = await db.all<DonationRow>(
      'SELECT * FROM donations ORDER BY created_at DESC LIMIT 500',
    );
    const totals = await db.all<{ status: string; amount: number; count: number }>(
      'SELECT status, SUM(amount_minor) AS amount, COUNT(*) AS count FROM donations GROUP BY status',
    );
    res.json({
      items: rows.map(publicDonation),
      totals: totals.map((item) => ({
        ...item,
        amount: Number(item.amount) / 100,
        count: Number(item.count),
      })),
      capabilities: givingCapabilities(config),
      mode: config.MPESA_ENV,
    });
  });
  return router;
}
