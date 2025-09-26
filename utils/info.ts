import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf-8'));

export { pkg };