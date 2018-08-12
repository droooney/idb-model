import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const dist = 'dist/compiled';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const removeImports = (code: string): string => {
  return code.replace(/import .* from .*(?:\r\n|\r|\n)/g, '');
};

const removeExports = (code: string): string => {
  return code.replace(/export /g, '');
};

(async () => {
  const [
    types,
    promisifyRequest,
    Database,
    Model
  ] = await Promise.all([
    readFile(path.join(process.cwd(), dist, 'types.d.ts'), 'utf8'),
    readFile(path.join(process.cwd(), dist, 'utils', 'promisifyRequest.d.ts'), 'utf8'),
    readFile(path.join(process.cwd(), dist, 'Database.d.ts'), 'utf8'),
    readFile(path.join(process.cwd(), dist, 'Model.d.ts'), 'utf8')
  ]);

  await writeFile(path.join(process.cwd(), 'index.d.ts'), [
    removeExports(types),
    removeImports(promisifyRequest),
    removeImports(Database),
    removeImports(Model)
  ].join('\n'), 'utf8');
})().catch((err) => {
  console.log(err);

  process.exit(1);
});
