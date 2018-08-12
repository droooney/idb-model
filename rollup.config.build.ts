/* eslint-disable spaced-comment */
///<reference path="./src/typings/rollup-plugin-babel.d.ts" />
///<reference path="./src/typings/rollup-plugin-node-resolve.d.ts" />
/* eslint-enable spaced-comment */

import { RollupWatchOptions } from 'rollup';
import npm = require('rollup-plugin-node-resolve');
import babel = require('rollup-plugin-babel');

const config: RollupWatchOptions = {
  input: 'src/index.ts',
  output: [{
    file: 'dist/idb-model.cjs.js',
    format: 'cjs',
    sourcemap: true
  }, {
    file: 'dist/idb-model.es.js',
    format: 'es',
    sourcemap: true
  }, {
    file: 'dist/idb-model.umd.min.js',
    format: 'umd',
    name: 'IDBModel',
    sourcemap: true
  }],
  plugins: [
    npm({
      extensions: ['.ts', '.js']
    }),
    babel({
      include: './**/*.ts',
      exclude: 'node_modules/**',
      presets: [
        ['@babel/env', { modules: false }],
        '@babel/typescript'
      ],
      plugins: [
        ['@babel/proposal-class-properties', { loose: false }]
      ]
    })
  ]
};

module.exports = config;
