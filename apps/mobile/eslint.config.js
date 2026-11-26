const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  {
    ignores: ['dist/**'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^@bhope/bible-data$'] }] },
  },
]);
