import { parseArgs } from 'node:util';
import { z } from 'zod';

type Field = 'email' | 'name' | 'password';
const fields: Field[] = ['email', 'name', 'password'];
const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().min(1).max(120),
  role: z.enum(['admin', 'editor', 'user']),
  password: z.string().min(10).max(128),
});

export async function readUserInput({
  args = process.argv.slice(2),
  env = process.env,
  prompt,
}: {
  args?: string[];
  env?: NodeJS.ProcessEnv;
  prompt?: (field: Field) => Promise<string>;
} = {}) {
  const { values } = parseArgs({
    args,
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string' },
    },
  });
  const input = {
    email: values.email ?? env.CREATE_USER_EMAIL,
    name: values.name ?? env.CREATE_USER_NAME,
    role: values.role ?? env.CREATE_USER_ROLE ?? 'admin',
    password: env.CREATE_USER_PASSWORD,
  };
  const missing = fields.filter((field) => !input[field]);
  if (missing.length && !prompt)
    throw new Error(
      `Missing account settings: ${missing.map((field) => `CREATE_USER_${field.toUpperCase()}`).join(', ')}. ` +
        'Set these environment variables in the Node.js manager, or run this command in an interactive terminal.',
    );
  for (const field of missing) input[field] = await prompt!(field);

  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid account settings: ${[...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', ')}. ` +
        'Use a valid email, a name of 1–120 characters, an admin/editor/user role, and a password of 10–128 characters.',
    );
  return result.data;
}
