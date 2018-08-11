declare module 'rollup-plugin-node-globals' {
  import { Plugin } from 'rollup';

  interface Options {
    include?: string | string[];
    exclude?: string | string[];
  }

  function globals(options?: Options): Plugin;

  export = globals;
}
