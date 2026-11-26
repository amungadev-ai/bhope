const { getDefaultConfig } = require('expo/metro-config');
const fs = require('node:fs');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
const root = path.resolve(__dirname, '../..');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@bhope/bible-data') {
    const local = path.join(root, '.local/bible.json');
    return {
      type: 'sourceFile',
      filePath:
        process.env.BHOPE_BIBLE_MODE !== 'sample' && fs.existsSync(local)
          ? local
          : path.join(root, 'packages/shared/src/bible.demo.json'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
