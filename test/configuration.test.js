import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('CI Wrangler config masks all real KV IDs and retains the production API domain', () => {
  const result = spawnSync(process.execPath, ['scripts/prepare-wrangler-ci.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /masked 6 KV namespace IDs/);

  const source = fs.readFileSync(path.join(root, 'wrangler.toml'), 'utf8');
  const ci = fs.readFileSync(path.join(root, 'wrangler.ci.toml'), 'utf8');
  const realIds = [...source.matchAll(/^\s*id\s*=\s*"([a-f0-9]{32})"\s*$/gim)].map(match => match[1]);
  const ciIds = [...ci.matchAll(/^\s*id\s*=\s*"([a-f0-9]{32})"\s*$/gim)].map(match => match[1]);
  assert.equal(realIds.length, 6);
  assert.equal(ciIds.length, 6);
  assert.equal(new Set(ciIds).size, 6);
  for (const id of realIds) assert.equal(ci.includes(id), false, `CI config leaked real KV ID ${id}`);
  assert.match(ci, /pattern = "api\.fevizja\.com"/);
  assert.match(ci, /custom_domain = true/);
  assert.match(ci, /FRONTEND_ORIGINS = "https:\/\/app\.fevizja\.com"/);
  assert.match(ci, /LOCAL_DEV_ALLOW_MISSING_IP = "false"/);
});
