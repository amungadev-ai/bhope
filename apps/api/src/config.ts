import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
export const apiRoot = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url().default('http://localhost:4000'),
  PAYSTACK_SECRET_KEY: z.string().default(''),
  PAYSTACK_WEBHOOK_SECRET: z.string().default(''),
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().default(''),
  MPESA_CONSUMER_SECRET: z.string().default(''),
  MPESA_SHORTCODE: z.string().default(''),
  MPESA_PASSKEY: z.string().default(''),
  MPESA_TRANSACTION_TYPE: z
    .enum(['CustomerPayBillOnline', 'CustomerBuyGoodsOnline'])
    .default('CustomerPayBillOnline'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DB_DRIVER: z.enum(['sqlite', 'mysql']).default('sqlite'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default('jobready_bhope_db'),
  DB_USER: z.string().default('jobready_bhope_db_admin'),
  DB_PASSWORD: z.string().default(''),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(20).default(5),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8081'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(3).default(0),
  ALLOW_REGISTRATION: z.enum(['true', 'false']).default('true'),
  DEEPSEEK_API_KEY: z.string().default(''),
  DEEPSEEK_BASE_URL: z.url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-flash'),
  AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
  DONATION_URL: z.string().default(''),
  TIKTOK_URL: z.url().default('https://www.tiktok.com/@auramultipurposesoap'),
});
export type Config = z.infer<typeof schema>;
export function loadConfig(): Config {
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      `Invalid environment settings: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  if (result.data.NODE_ENV === 'production' && result.data.DB_DRIVER !== 'mysql')
    throw new Error('Production requires DB_DRIVER=mysql.');
  if (result.data.NODE_ENV === 'production' && !result.data.DB_PASSWORD)
    throw new Error('Production requires DB_PASSWORD.');
  if (result.data.DONATION_URL && !result.data.DONATION_URL.startsWith('https://'))
    throw new Error('DONATION_URL must use HTTPS.');
  return result.data;
}
