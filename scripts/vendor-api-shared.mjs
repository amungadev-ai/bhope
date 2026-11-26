import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import ts from 'typescript';

export function rewriteSharedImports(source, specifier) {
  const parsed = ts.createSourceFile(
    'runtime.js',
    source,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS,
  );
  const edits = [];
  function visit(node) {
    let target;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) target = node.moduleSpecifier;
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
      target = node.arguments[0];
    if (target && ts.isStringLiteralLike(target) && target.text === '@bhope/shared')
      edits.push({ start: target.getStart(parsed), end: target.getEnd() });
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + JSON.stringify(specifier) + source.slice(edit.end);
  return source;
}

export async function vendorApiShared(directory) {
  const root = directory;
  const shared = join(directory, 'packages', 'shared', 'src', 'index.js');
  await access(shared);
  const changed = [];
  async function rewriteDirectory(directory) {
    for (const child of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, child.name);
      if (child.isDirectory()) await rewriteDirectory(path);
      else if (child.isFile() && /\.(?:[cm]?js)$/.test(child.name)) {
        let specifier = relative(dirname(path), shared).split(sep).join('/');
        if (!specifier.startsWith('.')) specifier = `./${specifier}`;
        const source = await readFile(path, 'utf8');
        const rewritten = rewriteSharedImports(source, specifier);
        if (rewritten !== source) {
          await writeFile(path, rewritten);
          changed.push(relative(root, path));
        }
      }
    }
  }
  await rewriteDirectory(join(directory, 'dist'));
  await rewriteDirectory(join(directory, 'scripts'));
  return changed;
}
