import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await fs.readFile(path.join(root, 'wrangler.toml'), 'utf8');
const replacements = [
  '11111111111111111111111111111111',
  '22222222222222222222222222222222',
  '33333333333333333333333333333333',
  '44444444444444444444444444444444',
  '55555555555555555555555555555555',
  '66666666666666666666666666666666',
];
let index = 0;
const config = source.replace(/^(\s*id\s*=\s*)"(?:REPLACE_WITH_[A-Z0-9_]+|[a-f0-9]{32})"(\s*)$/gim, (_match, prefix, suffix) => {
  if (index >= replacements.length) {
    throw new Error('Unexpected extra KV namespace ID; refusing to generate CI config.');
  }
  return `${prefix}"${replacements[index++]}"${suffix}`;
});
if (index !== replacements.length) {
  throw new Error(`Expected exactly ${replacements.length} KV namespace IDs, found ${index}. CI config was not written.`);
}
const output = path.join(root, 'wrangler.ci.toml');
await fs.writeFile(output, config);
process.stdout.write(`Generated isolated CI Wrangler config; masked ${index} KV namespace IDs. No real KV IDs copied.\n`);
