const { getDefaultConfig } = require('expo/metro-config');
const fs = require('node:fs');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
const root = path.resolve(__dirname, '../..');
const localBible = path.join(root, '.local/bible.json');
const useLocalBible = process.env.BHOPE_BIBLE_MODE !== 'sample' && fs.existsSync(localBible);

if (useLocalBible) {
  // Expo watches workspace packages automatically; this private data folder is
  // outside those packages and must also be visible to Metro's file hasher.
  const directory = path.dirname(localBible);
  config.watchFolders = [...new Set([...config.watchFolders, directory])];
  const pattern = directory
    .split(/[\\/]/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\\\/]');
  // Keep databases, deployment copies, logs, and other private files unwatched.
  config.resolver.blockList = [
    ...[].concat(config.resolver.blockList ?? []),
    new RegExp(`^${pattern}[\\\\/](?!bible\\.json$)`, process.platform === 'win32' ? 'i' : ''),
  ];
}
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@bhope/bible-data') {
    return {
      type: 'sourceFile',
      filePath: useLocalBible ? localBible : path.join(root, 'packages/shared/src/bible.demo.json'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
