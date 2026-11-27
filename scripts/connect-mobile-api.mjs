import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../apps/mobile/.env', import.meta.url);
const line = 'EXPO_PUBLIC_API_URL=https://api.billucsolutions.co.ke/api/v1';
let original = '';
try {
  original = await readFile(file, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const newline = original.includes('\r\n') ? '\r\n' : '\n';
const entries = original.split(/\r?\n/);
let updated = false;
const result = entries.flatMap((entry) => {
  if (!/^\s*(?:export\s+)?EXPO_PUBLIC_API_URL\s*=/.test(entry)) return [entry];
  if (updated) return [];
  updated = true;
  return [line];
});
if (!updated) result.push(line);
await writeFile(file, result.join(newline).replace(/\r?\n?$/, newline), { mode: 0o600 });
console.log('Mobile API address updated. Other environment settings were preserved.');
console.log('Restart Expo with: npx expo start --clear');
