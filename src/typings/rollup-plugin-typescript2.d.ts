declare module 'rollup-plugin-typescript2' {
  import { Plugin } from 'rollup';

  interface Options {
    include?: string | string[];
    exclude?: string | string[];
    clean?: boolean;
    tsconfigOverride?: any;
  }

  function typescript(options?: Options): Plugin;

  export = typescript;
}
