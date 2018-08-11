/* eslint-disable spaced-comment */
///<reference path="./src/typings/karma.d.ts" />
/* eslint-enable spaced-comment */

import { Config } from 'karma';
import rollupConfig from './rollup.config.test';

export default (config: Config) => {
  config.set({
    preprocessors: {
      'test/**/*.ts': [
        'rollup'
      ]
    },
    reporters: [
      'progress',
      'coverage-istanbul'
    ],
    plugins: [
      // 'karma-ie-launcher',
      // 'karma-firefox-launcher',
      // 'karma-opera-launcher',
      // 'karma-safari-launcher',
      'karma-chrome-launcher',
      'karma-rollup-preprocessor',
      'karma-coverage-istanbul-reporter',
      'karma-mocha'
    ],
    frameworks: [
      'mocha'
    ],
    browsers: [
      // 'Safari',
      // 'IE',
      // 'Firefox',
      // 'Opera',
      'Chrome'
    ],
    files: [
      'test/index.ts'
    ],
    mime: {
      'text/javascript': ['ts']
    },

    concurrency: 1,
    rollupPreprocessor: rollupConfig,
    coverageIstanbulReporter: {
      reports: ['html', 'lcov'],
      thresholds: {
        global: {
          statements: 100,
          lines: 100,
          branches: 100,
          functions: 100
        },
        each: {
          statements: 100,
          lines: 100,
          branches: 100,
          functions: 100
        }
      }
    }
  });
};
