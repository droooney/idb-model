/* eslint-disable spaced-comment */
///<reference path="./src/typings/rollup-plugin-babel.d.ts" />
///<reference path="./src/typings/rollup-plugin-node-builtins.d.ts" />
///<reference path="./src/typings/rollup-plugin-node-globals.d.ts" />
///<reference path="./src/typings/rollup-plugin-node-resolve.d.ts" />
///<reference path="./src/typings/rollup-plugin-commonjs.d.ts" />
/* eslint-enable spaced-comment */

import { RollupWatchOptions } from 'rollup';
import babel = require('rollup-plugin-babel');
import builtins = require('rollup-plugin-node-builtins');
import globals = require('rollup-plugin-node-globals');
import cjs = require('rollup-plugin-commonjs');
import npm = require('rollup-plugin-node-resolve');

const config: RollupWatchOptions = {
  input: 'test/index.ts',
  output: {
    format: 'iife',
    sourcemap: 'inline'
  },
  plugins: [
    builtins(),
    npm({
      extensions: ['.ts', '.js']
    }),
    cjs({
      include: 'node_modules/**',
      exclude: [
        'node_modules/rollup-plugin-node-builtins/**',
        'node_modules/buffer-es6/**',
        'node_modules/process-es6/**'
      ],
      ignoreGlobal: true
    }),
    babel({
      include: './**/*.ts',
      exclude: 'node_modules/**',
      // runtimeHelpers: true,
      presets: [
        ['@babel/env', { modules: false }],
        '@babel/typescript'
      ],
      plugins: [
        ['@babel/proposal-class-properties', { loose: false }],
        ['istanbul', {
          exclude: [
            'test/**',

            'src/utils/getProto.ts'
          ]
        }]
      ]
    }),
    globals()
  ]
};

export default config;
