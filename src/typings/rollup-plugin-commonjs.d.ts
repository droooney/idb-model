declare module 'rollup-plugin-commonjs' {
  import { Plugin } from 'rollup';

  interface Options {
    include?: string | string[];
    exclude?: string | string[];
    ignoreGlobal?: boolean;
    extensions?: string[];
  }

  function builtins(options?: Options): Plugin;

  export = builtins;
}
