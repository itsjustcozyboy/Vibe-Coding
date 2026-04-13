const js = require('@eslint/js');
const globals = require('globals');
const pluginN = require('eslint-plugin-n');
const pluginSecurity = require('eslint-plugin-security');
const pluginImport = require('eslint-plugin-import');
const pluginPromise = require('eslint-plugin-promise');
const configPrettier = require('eslint-config-prettier');

module.exports = [
  // ── 전역 무시 파일 ──────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
    ],
  },

  // ── 기본 ESLint 권장 규칙 (js/recommended) ─────────────────────
  js.configs.recommended,

  // ── Node.js 플러그인 (eslint-plugin-n) ─────────────────────────
  pluginN.configs['flat/recommended-script'],

  // ── 보안 플러그인 (eslint-plugin-security) ──────────────────────
  pluginSecurity.configs.recommended,

  // ── Promise 플러그인 ────────────────────────────────────────────
  pluginPromise.configs['flat/recommended'],

  // ── Prettier 충돌 규칙 비활성화 ─────────────────────────────────
  configPrettier,

  // ── 메인 규칙 블록 (간략화) ───────────────────────────────────
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],

    plugins: {
      n: pluginN,
      security: pluginSecurity,
      import: pluginImport,
      promise: pluginPromise,
    },

    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },

    rules: {
      // keep a small, stable subset of rules so linting runs reliably
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-await-in-loop': 'error',
      'no-duplicate-imports': 'error',
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'spaced-comment': ['error', 'always', { markers: ['/'] }],

      // selected plugin-backed rules
      'n/no-deprecated-api': 'error',
      'security/detect-object-injection': 'error',
    },
  },

  // ── 테스트 파일 전용 완화 규칙 ─────────────────────────────────
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    rules: {
      'no-shadow': 'off',
      'no-unused-expressions': 'off',
      'n/no-process-exit': 'off',
      'promise/catch-or-return': 'off',
      'promise/always-return': 'off',
      'security/detect-object-injection': 'off',
    },
  },

  // ── CommonJS 파일 (require 허용) ───────────────────────────────
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      'prefer-const': 'off',
      'n/no-process-exit': 'off',
    },
  },
];
