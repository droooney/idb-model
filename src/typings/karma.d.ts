import { RollupWatchOptions } from 'rollup';

interface Thresholds {
  statements: number;
  lines: number;
  branches: number;
  functions: number;
}

declare module 'karma' {
  interface ConfigOptions {
    rollupPreprocessor?: RollupWatchOptions;
    coverageIstanbulReporter?: {
      reports?: string[];
      thresholds?: {
        global?: Thresholds;
        each?: Thresholds;
      };
    };
  }
}
