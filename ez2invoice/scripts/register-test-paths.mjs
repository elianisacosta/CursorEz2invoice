import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));

register(
  'data:text/javascript,' +
    encodeURIComponent(`
import { pathToFileURL } from 'node:url';
import { resolve as pathResolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const srcRoot = ${JSON.stringify(srcRoot)};

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const abs = pathResolve(srcRoot, specifier.slice(2) + '.ts');
    if (existsSync(abs)) {
      return nextResolve(pathToFileURL(abs).href);
    }
  }
  if (specifier.startsWith('.') && !/\\.(ts|js|json|node|mjs|cjs)$/.test(specifier)) {
    const parentPath = fileURLToPath(context.parentURL);
    const abs = pathResolve(dirname(parentPath), specifier + '.ts');
    if (existsSync(abs)) {
      return nextResolve(pathToFileURL(abs).href);
    }
  }
  return nextResolve(specifier);
}
`),
  import.meta.url
);
