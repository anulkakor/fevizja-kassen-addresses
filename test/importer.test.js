import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { createServer } from 'node:https';
import { readFileSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'import-staging.mjs');
const run = (args, env = {}) => spawnSync(process.execPath, [script, ...args], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, FEVIZJA_ADDRESSES_API_URL: '', ADDRESS_ADMIN_TOKEN: '', ...env },
});
function runAsync(args, env = {}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd:root,env:{...process.env,FEVIZJA_ADDRESSES_API_URL:'',ADDRESS_ADMIN_TOKEN:'',...env}});
    let stdout='',stderr=''; child.stdout.setEncoding('utf8').on('data',x=>stdout+=x); child.stderr.setEncoding('utf8').on('data',x=>stderr+=x);
    child.on('error',reject); child.on('close',status=>resolve({status,stdout,stderr}));
  });
}

test('import requires an explicit environment, including dry-run', () => {
  const result = run(['--dry-run']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Explicit target required/);
});

test('staging dry-run validates all records without network access', () => {
  const result = run(['--env=staging', '--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /DRY RUN \(staging\): 92 records inspected/);
});

test('production write requires an explicit confirmation before network access', () => {
  const result = run(['--env=production'], { FEVIZJA_ADDRESSES_API_URL: 'https://api.example.test', ADDRESS_ADMIN_TOKEN: 'dummy' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires --confirm-production/);
});

test('non-dry-run import requires a per-environment exact URL allowlist', () => {
  const result = run(['--env=staging'], { FEVIZJA_ADDRESSES_API_URL: 'https://api.example.test', ADDRESS_ADMIN_TOKEN: 'dummy' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FEVIZJA_STAGING_ALLOWED_URLS/);
});


async function withMockAdmin(handler, runArgs) {
  const server=createServer({key:readFileSync(path.join(root,'test/fixtures/test-key.pem')),cert:readFileSync(path.join(root,'test/fixtures/test-cert.pem'))},handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address(); const base=`https://127.0.0.1:${port}`;
  try { return await runAsync(runArgs, {
    FEVIZJA_ADDRESSES_API_URL:base, ADDRESS_ADMIN_TOKEN:'test-token',
    FEVIZJA_STAGING_ALLOWED_URLS:base, NODE_TLS_REJECT_UNAUTHORIZED:'0',
  }); } finally { await new Promise(resolve=>server.close(resolve)); }
}

test('different existing record is reported as conflict with non-zero exit code', async()=>{
  const staging=JSON.parse(fs.readFileSync(path.join(root,'data','research-staging.json'),'utf8'));
  const first=staging.records[0];
  const result=await withMockAdmin((req,res)=>{
    res.setHeader('content-type','application/json');
    if(req.method==='GET'){res.setHeader('etag','"17"');res.end(JSON.stringify({record:{...first,insurerName:'Admin edited name'}}));return;}
    res.statusCode=500;res.end('unexpected PUT');
  }, ['--env=staging','--limit=1']);
  assert.equal(result.status,4, result.stderr + result.stdout);
  assert.match(result.stderr,/SKIP_DIFFERS/);
  assert.match(result.stderr,/IMPORT_REVIEW_REQUIRED/);
  assert.match(result.stdout,/conflictsToReview=1/);
});

test('--only-new skips existing records separately without conflict exit code', async()=>{
  const staging=JSON.parse(fs.readFileSync(path.join(root,'data','research-staging.json'),'utf8'));
  const first=staging.records[0];
  const result=await withMockAdmin((req,res)=>{
    res.setHeader('content-type','application/json');
    if(req.method==='GET'){res.setHeader('etag','"17"');res.end(JSON.stringify({record:{...first,insurerName:'Admin edited name'}}));return;}
    res.statusCode=500;res.end('unexpected PUT');
  }, ['--env=staging','--limit=1','--only-new']);
  assert.equal(result.status,0, result.stderr + result.stdout);
  assert.match(result.stdout,/skippedOnlyNew=1/);
  assert.match(result.stdout,/conflictsToReview=0/);
});


test('default Wrangler target is explicitly development, never production', () => {
  const config=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
  assert.match(config,/^name = "fevizja-kassen-addresses-dev"/m);
  assert.match(config,/^\[env\.production\][\s\S]*?^name = "fevizja-kassen-addresses"/m);
  assert.match(config,/^LOCAL_DEV_ALLOW_MISSING_IP = "true"/m);
  assert.match(config,/^DEPLOY_ENV = "production"/m);
});

test('import exit code preserves both pending projection and conflict conditions', async()=>{
  const staging=JSON.parse(fs.readFileSync(path.join(root,'data','research-staging.json'),'utf8'));
  const first=staging.records[0];
  let gets=0;
  const result=await withMockAdmin((req,res)=>{
    res.setHeader('content-type','application/json');
    if(req.method==='GET'){
      gets++;
      if(gets===1){res.setHeader('etag','"17"');res.end(JSON.stringify({record:{...first,insurerName:'Admin edited name'}}));return;}
      res.statusCode=404;res.end(JSON.stringify({error:'not found'}));return;
    }
    res.statusCode=202;res.end(JSON.stringify({projectionStatus:'pending'}));
  }, ['--env=staging','--limit=2']);
  assert.equal(result.status,6, result.stderr + result.stdout);
  assert.match(result.stderr,/PROJECTION_PENDING/);
  assert.match(result.stderr,/IMPORT_REVIEW_REQUIRED/);
  assert.match(result.stdout,/conflictsToReview=1/);
  assert.match(result.stdout,/pendingProjection=1/);
});
