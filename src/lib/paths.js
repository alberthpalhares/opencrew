// Resolve locations relative to the installed package.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)); // src/lib
export const packageRoot = path.resolve(here, '..', '..');
export const templatesDir = path.join(packageRoot, 'templates');
export const packageJsonPath = path.join(packageRoot, 'package.json');
