import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { z } from 'zod';
import { loadConfig } from '../src/config.js';
import { openDatabase, migrate } from '../src/db.js';
import { createUser } from '../src/auth.js';
const args = process.argv.slice(2);
const arg = (name: string) => args[args.indexOf(name) + 1];
let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const prompt = createInterface({
  input: process.stdin,
  output,
  terminal: Boolean(process.stdin.isTTY),
});
try {
  const email = args.includes('--email') ? arg('--email') : await prompt.question('Email: ');
  const name = args.includes('--name') ? arg('--name') : await prompt.question('Name: ');
  const role = args.includes('--role') ? arg('--role') : 'admin';
  let password = process.env.CREATE_USER_PASSWORD;
  if (!password) {
    process.stdout.write('Password (hidden): ');
    muted = true;
    password = await prompt.question('');
    muted = false;
    process.stdout.write('\n');
  }
  const input = z
    .object({
      email: z.email(),
      name: z.string().trim().min(1).max(120),
      role: z.enum(['admin', 'editor', 'user']),
      password: z.string().min(10).max(128),
    })
    .parse({ email, name, role, password });
  const db = await openDatabase(loadConfig());
  try {
    await migrate(db);
    await createUser(db, input);
    console.log(`Created ${input.role} account for ${input.email}.`);
  } finally {
    await db.close();
  }
} finally {
  prompt.close();
}
