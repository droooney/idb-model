declare module 'rollup-plugin-babel' {
  import { Plugin } from 'rollup';
  import { TransformOptions } from 'babel-core';

  interface Options extends TransformOptions {
    include?: string | string[];
    exclude?: string | string[];
    runtimeHelpers?: boolean;
  }

  function babel(options?: Options): Plugin;

  export = babel;
}
