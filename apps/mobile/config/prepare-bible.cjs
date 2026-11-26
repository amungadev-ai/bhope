const fs = require('node:fs');
const path = require('node:path');

function getBiblePaths(projectRoot, paths = path) {
  const root = paths.resolve(projectRoot, '../..');
  return {
    source: paths.join(root, '.local/bible.json'),
    destination: paths.join(projectRoot, 'assets/private-bible/bible.json'),
    sample: paths.join(root, 'packages/shared/src/bible.demo.json'),
  };
}

function prepareBible(projectRoot, mode = process.env.BHOPE_BIBLE_MODE) {
  const files = getBiblePaths(projectRoot);
  if (mode === 'sample' || !fs.existsSync(files.source)) return files.sample;
  const contents = fs.readFileSync(files.source);
  if (
    fs.existsSync(files.destination) &&
    !fs.lstatSync(files.destination).isSymbolicLink() &&
    fs.readFileSync(files.destination).equals(contents)
  )
    return files.destination;
  fs.mkdirSync(path.dirname(files.destination), { recursive: true });
  const temporary = `${files.destination}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, contents, { mode: 0o600 });
    fs.renameSync(temporary, files.destination);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  return files.destination;
}

module.exports = { getBiblePaths, prepareBible };
