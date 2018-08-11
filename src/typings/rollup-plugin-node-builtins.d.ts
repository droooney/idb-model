declare module 'rollup-plugin-node-builtins' {
  import { Plugin } from 'rollup';

  interface Options {
    include?: string | string[];
    exclude?: string | string[];
  }

  function builtins(options?: Options): Plugin;

  export = builtins;
}
