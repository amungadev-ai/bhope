import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createZip, readZipEntries } from './portable-zip.mjs';

export async function createDeploymentArchive() {
  const directory = fileURLToPath(new URL('../.local/deploy-api/', import.meta.url));
  const output = fileURLToPath(new URL('../.local/bhope-api-portable.zip', import.meta.url));
  const entries = await readZipEntries(directory);
  const names = new Set(entries.map((entry) => entry.name));
  for (const name of [
    'app.cjs',
    'package.json',
    'dist/index.js',
    'migrations/001_initial.sql',
    'packages/shared/package.json',
    'packages/shared/src/index.js',
    'public/console/index.html',
    'scripts/create-user.mjs',
    'scripts/migrate.mjs',
  ])
    if (!names.has(name))
      throw new Error(`Prepared package is missing ${name}. Run npm run deploy:prepare first.`);
  const manifest = JSON.parse(
    entries.find((entry) => entry.name === 'package.json').data.toString(),
  );
  if (manifest.dependencies?.['@bhope/shared'])
    throw new Error(
      'Prepared package still requires a workspace link. Run npm run deploy:prepare first.',
    );
  if (entries.some((entry) => /(^|\/)\.env$|\.(?:sqlite(?:-.*)?|db|xml)$/i.test(entry.name)))
    throw new Error(
      'Remove environment files, local databases, and Bible XMLs from the prepared package.',
    );
  await writeFile(output, createZip(entries));
  console.log(`Portable hosting ZIP ready: .local/bhope-api-portable.zip (${names.size} entries).`);
  console.log(
    'Upload this ZIP and extract it directly into hope_api. Folder paths use forward slashes.',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await createDeploymentArchive();
