const { getDefaultConfig } = require('expo/metro-config');
const { prepareBible } = require('./config/prepare-bible.cjs');
const config = getDefaultConfig(__dirname);
// Prepare a regular file inside projectRoot before Metro builds its file map.
// Keep Expo's default watch folders and exclusions intact.
const bibleFile = prepareBible(__dirname);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@bhope/bible-data') {
    return context.resolveRequest(context, bibleFile, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
