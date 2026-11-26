import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}/.local/deploy-api`;
await rm(output, { recursive: true, force: true });
await mkdir(`${output}/scripts`, { recursive: true });
await mkdir(`${output}/public/console`, { recursive: true });
await cp(`${root}/apps/api/dist`, `${output}/dist`, { recursive: true });
await cp(`${root}/apps/api/migrations`, `${output}/migrations`, { recursive: true });
await cp(`${root}/apps/api/app.cjs`, `${output}/app.cjs`);
await cp(`${root}/apps/api/.env.example`, `${output}/.env.example`);
await cp(`${root}/apps/dashboard/dist`, `${output}/public/console`, { recursive: true });
await cp(`${root}/packages/shared`, `${output}/packages/shared`, { recursive: true });
const packageJson = JSON.parse(await readFile(`${root}/apps/api/package.json`, 'utf8'));
packageJson.dependencies['@bhope/shared'] = 'file:./packages/shared';
delete packageJson.devDependencies;
packageJson.scripts = {
  start: 'node app.cjs',
  'db:migrate': 'node scripts/migrate.mjs',
  'user:create': 'node scripts/create-user.mjs',
};
await writeFile(`${output}/package.json`, JSON.stringify(packageJson, null, 2));
for (const name of ['migrate', 'create-user']) {
  const source = (await readFile(`${root}/apps/api/scripts/${name}.ts`, 'utf8')).replaceAll(
    '../src/',
    '../dist/',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  await writeFile(`${output}/scripts/${name}.mjs`, compiled);
}
console.log('Hosting package prepared in .local/deploy-api/');
console.log(
  'Upload this directory’s contents into hope_api. Set the domain document root to hope_api/public.',
);
console.log(
  'No credentials, private Bible data, or local databases are included. See docs/DIRECTADMIN.md.',
);
