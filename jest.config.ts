import type { Config } from '@jest/types';

const SECONDS = 1000;

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  "transform": {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
  },
  "silent": true,
  "testTimeout": 100000,
  "collectCoverage": true,
  "openHandlesTimeout": 5 * SECONDS,
  "forceExit": true,
};
export default config;
