import globals from 'globals';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  {
    files: ['src/**/*.{js,cjs,mjs}'],
    ignores: ['node_modules', 'dist', 'docs', 'coverage'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'double'],
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      'no-console': 'off',
      'max-len': ['warn', { code: 100 }],
      indent: ['error', 2],
      'comma-dangle': ['error', 'only-multiline'],
    },
  },
  prettier,
]);
