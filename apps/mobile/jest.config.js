/** @type {import('jest').Config} */
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  globals: { ...(expoPreset.globals ?? {}), __DEV__: true },
  setupFilesAfterEnv: [
    ...(expoPreset.setupFilesAfterEnv ?? []),
    '@testing-library/jest-native/extend-expect',
  ],
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/$1',
    '^@growlog/web-lib/(.*)$': '<rootDir>/../../lib/$1',
  },
  transform: {
    ...expoPreset.transform,
    'node_modules/@react-native/jest-preset/jest/setup\\.js$': [
      'babel-jest',
      { presets: ['babel-preset-expo'] },
    ],
  },
};
