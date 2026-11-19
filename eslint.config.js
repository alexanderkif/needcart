const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'supabase/functions/**'],
  },
  expoConfig,
  {
    rules: {
      // Standard React Native patterns: Animated values kept in refs, and
      // controlled forms that reset when a sheet becomes visible.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },
]);
