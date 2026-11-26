import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { loadConfig } from '../src/config.js';
import { openDatabase, migrate } from '../src/db.js';
import { createUser } from '../src/auth.js';
import { readUserInput } from '../src/user-input.js';

let muted = false;
let prompt: ReturnType<typeof createInterface> | undefined;
try {
  const input = await readUserInput({
    prompt: process.stdin.isTTY
      ? async (field) => {
          prompt ??= createInterface({
            input: process.stdin,
            output: new Writable({
              write(chunk, _encoding, callback) {
                if (!muted) process.stdout.write(chunk);
                callback();
              },
            }),
            terminal: true,
          });
          if (field !== 'password')
            return prompt.question(field === 'email' ? 'Email: ' : 'Name: ');
          process.stdout.write('Password (hidden): ');
          muted = true;
          try {
            return await prompt.question('');
          } finally {
            muted = false;
            process.stdout.write('\n');
          }
        }
      : undefined,
  });
  const db = await openDatabase(loadConfig());
  try {
    await migrate(db);
    await createUser(db, input);
    console.log(`Created ${input.role} account for ${input.email}.`);
  } finally {
    await db.close();
  }
} catch (error) {
  console.error(
    'Account setup failed:',
    error instanceof Error ? error.message : 'Unexpected error.',
  );
  process.exitCode = 1;
} finally {
  prompt?.close();
}
