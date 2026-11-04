// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // The separately deployed backend has its own dependencies and Node tests.
    ignores: ['dist/*', 'backend-reading-update/**'],
  },
]);
