import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  "transform": {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.tsx?$": "ts-jest"
  },
};
export default config;
