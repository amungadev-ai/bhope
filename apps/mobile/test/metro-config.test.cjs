const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { getBiblePaths, prepareBible } = require('../config/prepare-bible.cjs');
const source = fs.readFileSync(path.join(__dirname, '../metro.config.js'), 'utf8');
function load(platform, sample = false) {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const root =
    platform === 'win32'
      ? 'C:\\Users\\Reader\\My Projects\\bhope (test)'
      : '/projects/bhope (test)';
  const projectRoot = paths.join(root, 'apps/mobile');
  const files = getBiblePaths(projectRoot, paths);
  const folders = [paths.join(root, 'node_modules'), paths.join(root, 'packages/shared')];
  const exclusions = [/excluded-default/];
  const defaults = { projectRoot, watchFolders: folders, resolver: { blockList: exclusions } };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    __dirname: projectRoot,
    module,
    require(name) {
      if (name === 'expo/metro-config') return { getDefaultConfig: () => defaults };
      if (name === './config/prepare-bible.cjs')
        return {
          prepareBible(directory) {
            assert.equal(directory, projectRoot);
            return sample ? files.sample : files.destination;
          },
        };
      throw Error(`Unexpected module: ${name}`);
    },
  });
  return { config: module.exports, files, paths, folders, exclusions };
}
for (const platform of ['win32', 'linux']) {
  test(`${platform}: the full Bible resolves normally inside the mobile project`, () => {
    const { config, files, paths } = load(platform);
    const relative = paths.relative(config.projectRoot, files.destination);
    assert.equal(relative.startsWith('..'), false);
    assert.equal(paths.isAbsolute(relative), false);
    const resolution = config.resolver.resolveRequest(
      {
        resolveRequest(context, filename, target) {
          assert.equal(filename, files.destination);
          assert.equal(target, 'android');
          return { type: 'sourceFile', filePath: filename };
        },
      },
      '@bhope/bible-data',
      'android',
    );
    assert.equal(resolution.filePath, files.destination);
    assert.notEqual(resolution.filePath, files.source);
  });
  test(`${platform}: Expo's watch folders and block-list flags remain unchanged`, () => {
    const { config, folders, exclusions } = load(platform);
    assert.equal(config.watchFolders, folders);
    assert.equal(config.resolver.blockList, exclusions);
    assert.equal(new Set(config.resolver.blockList.map((pattern) => pattern.flags)).size, 1);
  });
  test(`${platform}: the sample alias also delegates through normal Metro resolution`, () => {
    const { config, files } = load(platform, true);
    config.resolver.resolveRequest(
      {
        resolveRequest(context, filename) {
          assert.equal(filename, files.sample);
          return { type: 'sourceFile', filePath: filename };
        },
      },
      '@bhope/bible-data',
      'android',
    );
  });
}
test('other imports still delegate to Expo resolution unchanged', () => {
  const { config } = load('win32');
  const context = {
    resolveRequest(received, name, target) {
      assert.equal(received, context);
      assert.equal(name, 'react');
      assert.equal(target, 'android');
      return 'resolved';
    },
  };
  assert.equal(config.resolver.resolveRequest(context, 'react', 'android'), 'resolved');
});
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bhope bible (test)-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'apps/mobile');
  fs.mkdirSync(project, { recursive: true });
  const files = getBiblePaths(project);
  function write(data) {
    fs.mkdirSync(path.dirname(files.source), { recursive: true });
    fs.writeFileSync(files.source, data);
  }
  return { project, files, write };
}
test('the existing pack becomes an identical regular file inside the mobile project', (t) => {
  const { project, files, write } = fixture(t);
  const contents = JSON.stringify({
    fingerprint: 'full',
    versions: ['en', 'sw'],
    text: 'Neno · hope',
  });
  write(contents);
  assert.equal(prepareBible(project, 'full'), files.destination);
  assert.equal(fs.readFileSync(files.destination, 'utf8'), contents);
  assert.equal(fs.lstatSync(files.destination).isSymbolicLink(), false);
  assert.equal(fs.readFileSync(files.source, 'utf8'), contents);
});
test('an unchanged Bible keeps its timestamp while a replaced pack updates the prepared copy', (t) => {
  const { project, files, write } = fixture(t);
  write('{"fingerprint":"first"}');
  prepareBible(project, 'full');
  const old = new Date('2020-01-01T00:00:00Z');
  fs.utimesSync(files.destination, old, old);
  prepareBible(project, 'full');
  assert.equal(fs.statSync(files.destination).mtimeMs, old.getTime());
  write('{"fingerprint":"second"}');
  prepareBible(project, 'full');
  assert.equal(JSON.parse(fs.readFileSync(files.destination, 'utf8')).fingerprint, 'second');
  assert.deepEqual(fs.readdirSync(path.dirname(files.destination)), ['bible.json']);
});
test('fresh clones and explicit sample mode do not create private Bible assets', (t) => {
  const { project, files, write } = fixture(t);
  assert.equal(prepareBible(project, 'full'), files.sample);
  assert.equal(fs.existsSync(files.destination), false);
  write('{"fingerprint":"full"}');
  assert.equal(prepareBible(project, 'sample'), files.sample);
  assert.equal(fs.existsSync(files.destination), false);
});
test('removing the source pack selects the sample instead of using a stale prepared copy', (t) => {
  const { project, files, write } = fixture(t);
  write('{"fingerprint":"full"}');
  prepareBible(project, 'full');
  fs.unlinkSync(files.source);
  assert.equal(prepareBible(project, 'full'), files.sample);
});
