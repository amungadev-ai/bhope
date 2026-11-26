const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../metro.config.js'), 'utf8');
function load(platform, hasBible = true, mode) {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const root =
    platform === 'win32'
      ? 'C:\\Users\\Reader\\My Projects\\bhope (test)'
      : '/projects/bhope (test)';
  const projectRoot = paths.join(root, 'apps/mobile');
  const bible = paths.join(root, '.local/bible.json');
  const sample = paths.join(root, 'packages/shared/src/bible.demo.json');
  const defaults = {
    projectRoot,
    watchFolders: [paths.join(root, 'node_modules'), paths.join(root, 'packages/shared')],
    resolver: { blockList: [/excluded-default/] },
  };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    __dirname: projectRoot,
    module,
    process: { platform, env: { BHOPE_BIBLE_MODE: mode } },
    require(name) {
      if (name === 'expo/metro-config') return { getDefaultConfig: () => defaults };
      if (name === 'node:path') return paths;
      if (name === 'node:fs') return { existsSync: (file) => hasBible && file === bible };
      throw Error(`Unexpected module: ${name}`);
    },
  });
  return { config: module.exports, paths, root, bible, sample };
}
function isWatched(config, paths, file) {
  return [config.projectRoot, ...config.watchFolders].some((folder) => {
    const relative = paths.relative(folder, file);
    return (
      relative !== '..' && !relative.startsWith(`..${paths.sep}`) && !paths.isAbsolute(relative)
    );
  });
}
function blocked(config, file) {
  return [].concat(config.resolver.blockList ?? []).some((pattern) => pattern.test(file));
}
for (const platform of ['win32', 'linux']) {
  test(`${platform}: a full Bible resolved by the custom module is visible to Metro`, () => {
    const { config, paths, bible } = load(platform);
    const resolution = config.resolver.resolveRequest({}, '@bhope/bible-data', 'android');
    assert.equal(resolution.filePath, bible);
    assert.ok(
      isWatched(config, paths, resolution.filePath),
      'the Bible must be inside a watched root for SHA-1 calculation',
    );
    assert.equal(blocked(config, bible), false);
  });
  test(`${platform}: watching the Bible does not expose unrelated local files`, () => {
    const { config, paths, root, bible } = load(platform);
    for (const suffix of [
      'api.sqlite',
      'bible.json.backup',
      'deploy-api/packages/shared/package.json',
      'tmp/cache.js',
    ])
      assert.equal(blocked(config, paths.join(root, '.local', suffix)), true, suffix);
    assert.equal(blocked(config, paths.join(root, 'packages/shared/src/index.js')), false);
    assert.equal(blocked(config, 'excluded-default'), true);
    if (platform === 'win32') {
      assert.equal(blocked(config, bible.replaceAll('\\', '/')), false);
      assert.equal(
        blocked(config, paths.join(root, '.local/tmp/cache.js').replaceAll('\\', '/')),
        true,
      );
    }
  });
  test(`${platform}: missing private data and explicit sample mode retain the sample fallback`, () => {
    for (const [hasBible, mode] of [
      [false, undefined],
      [true, 'sample'],
    ]) {
      const { config, paths, sample } = load(platform, hasBible, mode);
      const resolution = config.resolver.resolveRequest({}, '@bhope/bible-data', 'android');
      assert.equal(resolution.filePath, sample);
      assert.ok(isWatched(config, paths, sample));
      assert.equal(config.watchFolders.length, 2);
    }
  });
}
test('other imports delegate to Expo resolution without changing the request', () => {
  const { config } = load('win32');
  const fallback = { type: 'sourceFile', filePath: 'resolved-by-expo.js' };
  const context = {
    resolveRequest(...args) {
      assert.equal(args[0], context);
      assert.equal(args[1], 'react');
      assert.equal(args[2], 'android');
      return fallback;
    },
  };
  assert.equal(config.resolver.resolveRequest(context, 'react', 'android'), fallback);
});
