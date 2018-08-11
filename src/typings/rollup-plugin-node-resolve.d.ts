declare module 'rollup-plugin-node-resolve' {
  import { Plugin } from 'rollup';

  interface Options {
    include?: string | string[];
    exclude?: string | string[];
    extensions?: string[];
  }

  function npm(options?: Options): Plugin;

  export = npm;
}
