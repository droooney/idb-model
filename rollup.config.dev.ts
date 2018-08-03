import { RollupWatchOptions, Plugin } from 'rollup';
import ts from 'rollup-plugin-typescript2';

const config: RollupWatchOptions = {
  input: 'entry.ts',
  output: {
    file: 'bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    ts() as Plugin
  ],
  watch: {
    include: ['src/**/*.ts', 'entry.ts']
  }
};

export default config;
