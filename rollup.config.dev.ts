/* eslint-disable spaced-comment */
///<reference path="./src/typings/rollup-plugin-typescript2.d.ts" />
/* eslint-enable spaced-comment */

import { RollupWatchOptions } from 'rollup';
import ts = require('rollup-plugin-typescript2');

const config: RollupWatchOptions = {
  input: 'entry.ts',
  output: {
    file: 'bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    ts({
      clean: true,
      tsconfigOverride: {
        compilerOptions: {
          module: 'esnext'
        }
      }
    })
  ],
  watch: {
    include: ['src/**/*.ts', 'entry.ts']
  }
};

module.exports = config;
