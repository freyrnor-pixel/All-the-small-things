/**
 * jest.config.js — unit-test harness for the pure/shared logic layer.
 *
 * Uses the `jest-expo` preset so Expo/React-Native native modules are mocked and
 * the `@/` path alias resolves the same way it does in the app (mirrors the
 * `paths` entry in tsconfig.json). Tests live in `**\/__tests__/**` or `*.test.ts`.
 *
 * Scope: characterization + unit tests for pure logic (date math, weekday/time
 * helpers, receipt parsing, task ranking, the data-access readers). UI components
 * and native-backed stores are intentionally out of scope here.
 */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
};
