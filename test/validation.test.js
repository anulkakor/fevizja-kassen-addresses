import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { validateRecord, CATEGORIES, mailingAllowed, sourceIsFresh, withMailingPolicy, FeVizjaUpdateCoordinator, listAll, authorized, resetCatalogCache } from '../src/index.js';
const today = () => new Date().toISOString().slice(0,10);
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
const valid = { insurerId: 'dak-gesundheit', documentGenerationNotice: { showBeforeGeneration: true, severity: 'info', code: 'test', message: 'Test notice', officialUrl: 'https://example.org/contact', categoryInstructions: {} }, categories: Object.fromEntries(CATEGORIES.map(category => [category, { status: 'verified', address: 'Postfach 1, 20000 Hamburg', sourceUrl: 'https://example.org/contact', checkedAt: today(), sourceVerifiedAt: today(), checkedAtMeaning: 'source_verified', usableForMailing: true }])) };
function makeEnv(seed = {}) {
  const store = new Map(Object.entries(seed)); const history = new Map();
  const kv = (map) => ({
    async get(key, type) { if (Array.isArray(key)) return new Map(key.map(k => [k, map.has(k) ? JSON.parse(map.get(k)) : null])); const v=map.get(key); return v == null ? null : (type==='json' ? JSON.parse(v) : v); },
    async put(key,value) { map.set(key,String(value)); },
    async list({prefix='',limit=1000}={}) { const keys=[...map.keys()].filter(k=>k.startsWith(prefix)).slice(0,limit).map(name=>({name})); return {keys,list_complete:true}; }
  });
  const ADDRESS_KV=kv(store), ADDRESS_HISTORY_KV=kv(history);
  const stateStore=new Map(); let queue=Promise.resolve();
  const alarmState={scheduled:null,deleted:0}; const state={ storage:{ async get(k){return stateStore.get(k)}, async put(k,v){if (arguments.length===1 && k && typeof k==='object') for(const [key,value] of Object.entries(k)) stateStore.set(key,value); else stateStore.set(k,v)}, async delete(k){stateStore.delete(k)}, async setAlarm(when){alarmState.scheduled=when}, async deleteAlarm(){alarmState.scheduled=null;alarmState.deleted++}, async list({prefix='',limit=1000}={}){return new Map([...stateStore.entries()].filter(([k])=>k.startsWith(prefix)).slice(0,limit))} }, blockConcurrencyWhile(fn){ const run=queue.then(fn,fn); queue=run.then(()=>{},()=>{}); return run; } };
  const coordinator=new FeVizjaUpdateCoordinator(state,{ADDRESS_KV,ADDRESS_HISTORY_KV});
  return { ADDRESS_KV, ADDRESS_HISTORY_KV, ADDRESS_ADMIN_TOKEN:'secret', ADMIN_RATE_LIMITER:{async limit(){return {success:true}}}, UPDATE_COORDINATOR:{idFromName(){return 'global'},get(){return {fetch:(url,init)=>coordinator.fetch(new Request(url,init))}}}, KASSEN_API:{ async fetch(){ return new Response(JSON.stringify({kassen:[{id:'dak-gesundheit',name:'DAK-Gesundheit'}]}),{status:200}); } }, __store:store, __history:history, __state:stateStore, __alarmState:alarmState, __coordinator:coordinator };
}
test('accepts complete record with known catalog id', () => assert.deepEqual(validateRecord(valid, new Set(['dak-gesundheit'])), []));
test('rejects insurer id absent from Worker 1 catalog', () => assert.ok(validateRecord(valid, new Set()).includes('insurerId_not_in_worker1_catalog')));
test('requires all five categories', () => { const x=structuredClone(valid); delete x.categories.pflegekasse; assert.ok(validateRecord(x,new Set(['dak-gesundheit'])).includes('category_missing:pflegekasse')); });
test('rejects invalid and future checkedAt dates', () => { const x=structuredClone(valid); x.categories.general.checkedAt='2026-02-31'; assert.ok(validateRecord(x,new Set(['dak-gesundheit'])).includes('checkedAt_invalid_or_future:general')); });
test('rejects homepage as evidence for a mailing address', () => { const x=structuredClone(valid); x.categories.general.sourceUrl='https://example.org/'; assert.ok(validateRecord(x,new Set(['dak-gesundheit'])).includes('homepage_not_evidence:general')); });
test('validation ignores client-supplied usableForMailing because Worker recalculates it', () => { const x=structuredClone(valid); x.categories.general.usableForMailing=false; assert.deepEqual(validateRecord(x,new Set(['dak-gesundheit'])), []); });
test('PUT persists documentGenerationNotice and resolve returns it', async () => {
  const env=makeEnv(); const body=structuredClone(valid);
  const req=new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(body)});
  const put=await worker.fetch(req,env); assert.equal(put.status,200); const stored=JSON.parse(env.__store.get('address:v1:dak-gesundheit')); assert.deepEqual(stored.documentGenerationNotice,body.documentGenerationNotice);
  const res=await worker.fetch(new Request('https://worker.test/api/resolve?insurerId=dak-gesundheit&purpose=general'),env); const data=await res.json(); assert.equal(data.documentGenerationNotice.message,'Test notice'); assert.equal(data.usableForMailing,true); assert.equal(data.addressDisplayMode,'confirmed_address'); assert.equal(data.officialUrl,null);
});
test('resolve returns 404 for missing category, matching category route', async()=>{
  const env=makeEnv({'address:v1:dak-gesundheit':JSON.stringify({insurerId:'dak-gesundheit',insurerName:'DAK',categories:{},documentGenerationNotice:null})});
  const res=await worker.fetch(new Request('https://worker.test/api/resolve?insurerId=dak-gesundheit&purpose=general'),env); assert.equal(res.status,404);
});
test('malformed percent encoding returns clean JSON 400', async()=>{
  const env=makeEnv(); const res=await worker.fetch(new Request('https://worker.test/api/addresses/%E0%A4%A'),env); assert.equal(res.status,400); assert.equal((await res.json()).success,false);
});
test('history uses independent snapshot keys and preserves concurrent writes', async()=>{
  const env=makeEnv(); const body=structuredClone(valid); const make=()=>worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(body)}),env);
  const responses=await Promise.all([make(),make()]); assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]); assert.equal(env.__history.size,1);
});
test('rejects oversized request bodies', async()=>{
  const env=makeEnv(); const body=' '.repeat(256*1024+1); const res=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body}),env); assert.equal(res.status,413);
});

test('history reads legacy v1 snapshots while new writes use separate v2 keys', async()=>{
  const env=makeEnv(); env.__history.set('history:v1:dak-gesundheit',JSON.stringify([{savedAt:'2026-11-16T00:00:00.000Z',current:{version:1}}]));
  const res=await worker.fetch(new Request('https://worker.test/api/history/dak-gesundheit',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret'}}),env); const data=await res.json(); assert.equal(res.status,200); assert.equal(data.history.length,1); assert.equal(data.history[0].current.version,1);
});

test('KV failures are converted to clean JSON 500 responses', async()=>{
  const env=makeEnv(); env.ADDRESS_KV.get=async()=>{throw new Error('simulated KV failure')};
  const res=await worker.fetch(new Request('https://worker.test/api/addresses/dak-gesundheit'),env); const data=await res.json(); assert.equal(res.status,500); assert.equal(data.code,'INTERNAL_ERROR'); assert.equal(data.success,false);
});
test('admin audit reads each stored record once through a bulk read', async()=>{
  const env=makeEnv({'address:v1:dak-gesundheit':JSON.stringify({...valid,updatedAt:'2026-11-17T00:00:00.000Z'})}); let bulkCalls=0; const original=env.ADDRESS_KV.get; env.ADDRESS_KV.get=async(key,type)=>{if(Array.isArray(key))bulkCalls++; return original(key,type)};
  const res=await worker.fetch(new Request('https://worker.test/api/admin/audit',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret'}}),env); const data=await res.json(); assert.equal(res.status,200); assert.equal(data.storedRecordCount,1); assert.equal(bulkCalls,1);
});


test('mailing is blocked for official_general even with a fresh source date', () => {
  const item = structuredClone(valid.categories.general); item.status = 'official_general';
  assert.equal(mailingAllowed(item), false);
});
test('mailing is blocked when source verification date is missing or older than 180 days', () => {
  const item = structuredClone(valid.categories.general);
  delete item.sourceVerifiedAt;
  assert.equal(mailingAllowed(item), false);
  item.sourceVerifiedAt = daysAgo(181);
  assert.equal(mailingAllowed(item), false);
  item.sourceVerifiedAt = today();
  assert.equal(mailingAllowed(item), true);
});
test('mailing is blocked for future source verification dates', () => {
  const item = structuredClone(valid.categories.general);
  item.sourceVerifiedAt = '2099-01-01';
  assert.equal(mailingAllowed(item), false);
});
test('PUT ignores client usableForMailing and recalculates it', async () => {
  const env = makeEnv(); const body = structuredClone(valid);
  body.categories.general.usableForMailing = false;
  const res = await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit', {
    method:'PUT', headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'}, body:JSON.stringify(body)
  }), env);
  assert.equal(res.status,200);
  const stored = JSON.parse(env.__store.get('address:v1:dak-gesundheit'));
  assert.equal(stored.categories.general.usableForMailing,undefined);
});
test('history endpoint requires admin token', async () => {
  const env=makeEnv();
  const res=await worker.fetch(new Request('https://worker.test/api/history/dak-gesundheit',{headers:{'cf-connecting-ip':'127.0.0.1'}}),env);
  assert.equal(res.status,401);
});
test('Worker 1 outage is returned as 503 with diagnostic details for PUT and audit', async () => {
  resetCatalogCache(); const env=makeEnv(); env.KASSEN_API.fetch=async()=>new Response('down',{status:502});
  const put=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(valid)}),env);
  assert.equal(put.status,503); assert.equal((await put.json()).code,'WORKER1_CATALOG_UNAVAILABLE');
  const audit=await worker.fetch(new Request('https://worker.test/api/admin/audit',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret'}}),env);
  assert.equal(audit.status,503); assert.equal((await audit.json()).code,'WORKER1_CATALOG_UNAVAILABLE');
});
test('500 responses retain CORS headers', async () => {
  const env=makeEnv(); env.FRONTEND_ORIGINS='https://app.fevizja.com';
  env.ADDRESS_KV.get=async()=>{throw new Error('KV failure')};
  const res=await worker.fetch(new Request('https://worker.test/api/addresses/dak-gesundheit',{headers:{origin:'https://app.fevizja.com'}}),env);
  assert.equal(res.status,500); assert.equal(res.headers.get('access-control-allow-origin'),'https://app.fevizja.com');
  assert.equal((await res.json()).code,'INTERNAL_ERROR');
});
test('public list skips no records and reports missing categories as integrityErrors', async () => {
  const env=makeEnv({'address:v1:dak-gesundheit':JSON.stringify({insurerId:'dak-gesundheit',categories:{}})});
  const res=await worker.fetch(new Request('https://worker.test/api/addresses'),env); const data=await res.json();
  assert.equal(res.status,200); assert.equal(data.count,1); assert.equal(data.records[0].integrityErrors.length,5); assert.deepEqual(data.records[0].categories,{});
});
test('Durable Object remains canonical when KV projection fails and returns 202', async () => {
  const env=makeEnv(); env.ADDRESS_KV.put=async()=>{throw new Error('KV projection failed')};
  const res=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(valid)}),env);
  const data=await res.json(); assert.equal(res.status,202); assert.equal(data.projectionStatus,'pending');
  assert.ok(env.__state.has('state:dak-gesundheit')); assert.equal(env.__store.has('address:v1:dak-gesundheit'),false);
  const snap=JSON.parse([...env.__history.values()][0]); assert.equal(snap.status,'committed');
});

test('history snapshot is marked committed after successful current record write', async () => {
  const env=makeEnv();
  const res=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(valid)}),env);
  assert.equal(res.status,200); const snap=JSON.parse([...env.__history.values()][0]); assert.equal(snap.status,'committed'); assert.ok(snap.committedAt);
});

test('180-day freshness boundary is inclusive by calendar date', () => {
  const now = Date.UTC(2026, 10, 17, 20, 0, 0);
  const item = { sourceVerifiedAt: '2026-05-21' };
  assert.equal(sourceIsFresh(item, now), true);
  item.sourceVerifiedAt = '2026-05-20';
  assert.equal(sourceIsFresh(item, now), false);
});

test('date validation tolerates one UTC calendar day ahead', () => {
  const x=structuredClone(valid); const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
  x.categories.general.sourceVerifiedAt=tomorrow; x.categories.general.checkedAt=tomorrow;
  assert.deepEqual(validateRecord(x,new Set(['dak-gesundheit'])),[]);
});

test('full-record endpoint returns partial record and integrityErrors instead of 500', async () => {
  const env=makeEnv({'address:v1:dak-gesundheit':JSON.stringify({insurerId:'dak-gesundheit',insurerName:'DAK',categories:{general:valid.categories.general}})});
  const res=await worker.fetch(new Request('https://worker.test/api/addresses/dak-gesundheit'),env); const data=await res.json();
  assert.equal(res.status,200); assert.equal(data.record.integrityErrors.length,4); assert.deepEqual(Object.keys(data.record.categories),['general']);
});

test('source freshness accepts one UTC day of local-date skew', () => {
  const now = Date.UTC(2026, 10, 17, 23, 30, 0);
  assert.equal(sourceIsFresh({ sourceVerifiedAt: '2026-11-18' }, now), true);
});

test('history remains attempted when the commit marker write fails after record save', async () => {
  const env=makeEnv(); let historyWrites=0; const originalPut=env.ADDRESS_HISTORY_KV.put;
  env.ADDRESS_HISTORY_KV.put=async(...args)=>{ historyWrites++; if(historyWrites===2) throw new Error('history commit marker failed'); return originalPut(...args); };
  const res=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(valid)}),env);
  const data=await res.json(); assert.equal(res.status,200); assert.equal(data.historyStatus,'attempted');
  assert.ok(env.__store.has('address:v1:dak-gesundheit'));
  const snap=JSON.parse([...env.__history.values()][0]); assert.equal(snap.status,'attempted');
});

test('unconfirmed address is hidden and API provides official link fallback', async () => {
  const item = { ...structuredClone(valid.categories.general), status: 'official_general' };
  const env = makeEnv({'address:v1:dak-gesundheit':JSON.stringify({insurerId:'dak-gesundheit',insurerName:'DAK',categories:{general:item},documentGenerationNotice:{officialUrl:'https://example.org/official-contact'}})});
  const res = await worker.fetch(new Request('https://worker.test/api/resolve?insurerId=dak-gesundheit&purpose=general'), env);
  const data = await res.json();
  assert.equal(data.usableForMailing, false); assert.equal(data.address, null);
  assert.equal(data.addressDisplayMode, 'official_link'); assert.equal(data.officialUrl, 'https://example.org/contact');
});

test('user-facing officialUrl takes precedence over audit sourceUrl', () => {
  const item = { ...structuredClone(valid.categories.general), status: 'official_general', officialUrl: 'https://example.org/how-to-contact' };
  const result = withMailingPolicy(item, 'https://example.org/fallback');
  assert.equal(result.officialUrl, 'https://example.org/how-to-contact');
  assert.equal(result.addressDisplayMode, 'official_link');
});

test('resolve exposes category officialUrl for an unconfirmed address', async () => {
  const item = { ...structuredClone(valid.categories.general), status: 'official_general', officialUrl: 'https://example.org/user-help' };
  const env = makeEnv({'address:v1:dak-gesundheit': JSON.stringify({ insurerId: 'dak-gesundheit', insurerName: 'DAK', categories: { general: item }, documentGenerationNotice: { officialUrl: 'https://example.org/generic-contact' } })});
  const res = await worker.fetch(new Request('https://worker.test/api/resolve?insurerId=dak-gesundheit&purpose=general'), env);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.address, null);
  assert.equal(data.addressDisplayMode, 'official_link');
  assert.equal(data.officialUrl, 'https://example.org/user-help');
});

test('rejects homepage as a user-facing officialUrl', () => {
  const x = structuredClone(valid); x.categories.general.officialUrl = 'https://example.org/';
  assert.ok(validateRecord(x, new Set(['dak-gesundheit'])).includes('official_url_must_be_specific_page:general'));
});

test('verified category without sourceVerifiedAt is rejected on PUT validation', () => {
  const x=structuredClone(valid); delete x.categories.general.sourceVerifiedAt;
  assert.ok(validateRecord(x,new Set(['dak-gesundheit'])).includes('sourceVerifiedAt_required_for_verified:general'));
});
test('unknown category fields and category keys are rejected', () => {
  const x=structuredClone(valid); x.categories.general.injected='unexpected'; x.categories.injected={status:'verified'};
  const errors=validateRecord(x,new Set(['dak-gesundheit']));
  assert.ok(errors.includes('unknown_category_field:general:injected'));
  assert.ok(errors.includes('unknown_category:injected'));
});
test('sourceVerifiedAt later than checkedAt is rejected', () => {
  const x=structuredClone(valid); x.categories.general.checkedAt='2026-11-16'; x.categories.general.sourceVerifiedAt='2026-11-17';
  assert.ok(validateRecord(x,new Set(['dak-gesundheit'])).includes('sourceVerifiedAt_after_checkedAt:general'));
});
test('If-Match is mandatory for admin PUT', async()=>{
  const env=makeEnv(); const res=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json'},body:JSON.stringify(valid)}),env);
  assert.equal(res.status,428);
});
test('admin and history routes fail closed without rate limiter', async()=>{
  const env=makeEnv(); delete env.ADMIN_RATE_LIMITER;
  const res=await worker.fetch(new Request('https://worker.test/api/history/dak-gesundheit',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret'}}),env);
  assert.equal(res.status,503); assert.equal((await res.json()).code,'RATE_LIMITER_NOT_CONFIGURED');
});
test('rate limiter rejects excessive admin requests before token verification', async()=>{
  const env=makeEnv(); env.ADMIN_RATE_LIMITER.limit=async()=>({success:false});
  const res=await worker.fetch(new Request('https://worker.test/api/admin/audit',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer wrong'}}),env);
  assert.equal(res.status,429);
});
test('PUT rejects non-JSON content type', async()=>{
  const env=makeEnv(); const res=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'text/plain','if-match':'0'},body:JSON.stringify(valid)}),env);
  assert.equal(res.status,415);
});
test('listAll follows pagination beyond 1000 KV keys', async()=>{
  const namespace={async list({cursor}) { const offset=Number(cursor||0); const keys=Array.from({length:Math.min(1000,1205-offset)},(_,i)=>({name:`k${offset+i}`})); const next=offset+keys.length; return {keys,list_complete:next>=1205,cursor:String(next)}; }};
  const result=await listAll(namespace,'k'); assert.equal(result.length,1205);
});
test('authorization compares fixed-size SHA-256 digests and rejects wrong-length token', async()=>{
  const env={ADDRESS_ADMIN_TOKEN:'secret'};
  assert.equal(await authorized(new Request('https://worker.test/',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret'}}),env),true);
  assert.equal(await authorized(new Request('https://worker.test/',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer s'}}),env),false);
});
test('coordinator rejects stale concurrent version with 409', async()=>{
  const env=makeEnv(); const body=structuredClone(valid);
  const make=()=>worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(body)}),env);
  const rs=await Promise.all([make(),make()]); assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);
});


test('public GET does not expose ETag for optimistic concurrency', async()=>{
  const env=makeEnv({'address:v1:dak-gesundheit':JSON.stringify({...valid,version:7})});
  const res=await worker.fetch(new Request('https://worker.test/api/addresses/dak-gesundheit'),env);
  assert.equal(res.headers.get('etag'),null);
});
test('second PUT with stale If-Match receives 409 and current version', async()=>{
  const env=makeEnv(); const body=structuredClone(valid);
  const make=(version)=>worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':version},body:JSON.stringify(body)}),env);
  assert.equal((await make('0')).status,200); const conflict=await make('0'); assert.equal(conflict.status,409); assert.equal((await conflict.json()).currentVersion,'1');
});

test('coordinator increments version from its serialized durable state', async()=>{
  const env=makeEnv(); const body=structuredClone(valid);
  const put=(version)=>worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':version},body:JSON.stringify(body)}),env);
  const first=await put('0'); assert.equal(first.status,200); assert.equal((await first.json()).record.version,1);
  const second=await put('1'); assert.equal(second.status,200); assert.equal((await second.json()).record.version,2);
});


test('admin raw GET returns unmasked candidate address and canonical Durable Object ETag', async()=>{
  const env=makeEnv();
  const body=structuredClone(valid); body.categories.general.address='Postfach 77';
  const put=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(body)}),env);
  assert.equal(put.status,200);
  const raw=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret'}}),env);
  const data=await raw.json(); assert.equal(raw.status,200); assert.equal(raw.headers.get('etag'),'\"1\"');
  assert.equal(data.record.categories.general.address,'Postfach 77'); assert.equal(data.record.categories.general.usableForMailing,undefined);
});

test('admin raw GET derives legacy version from updatedAt before first write', async()=>{
  const legacy={...structuredClone(valid),updatedAt:'2026-11-17T10:00:00.000Z'};
  const env=makeEnv({'address:v1:dak-gesundheit':JSON.stringify(legacy)});
  const res=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret'}}),env);
  assert.equal(res.status,200); assert.equal(res.headers.get('etag'),'\"2026-11-17T10:00:00.000Z\"');
});


test('admin and history requests without Cloudflare client IP fail closed without a shared unknown bucket', async()=>{
  const env=makeEnv(); let calls=0; env.ADMIN_RATE_LIMITER.limit=async()=>{calls++; return {success:true};};
  const res=await worker.fetch(new Request('https://worker.test/api/admin/audit',{headers:{authorization:'Bearer secret'}}),env);
  assert.equal(res.status,400); assert.equal((await res.json()).code,'CLIENT_IP_MISSING'); assert.equal(calls,0);
});

test('Durable Object alarm retries a failed KV projection', async()=>{
  const env=makeEnv(); let shouldFail=true; const original=env.ADDRESS_KV.put;
  env.ADDRESS_KV.put=async(...args)=>{if(shouldFail) throw new Error('temporary KV outage'); return original(...args);};
  const put=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(valid)}),env);
  assert.equal(put.status,202); shouldFail=false; await env.__coordinator.alarm();
  assert.equal(env.__store.has('address:v1:dak-gesundheit'),true);
});


test('successful KV projection clears the Durable Object alarm and pending marker', async()=>{
  const env=makeEnv();
  const put=await worker.fetch(new Request('https://worker.test/api/admin/addresses/dak-gesundheit',{method:'PUT',headers:{'cf-connecting-ip':'127.0.0.1',authorization:'Bearer secret','content-type':'application/json','if-match':'0'},body:JSON.stringify(valid)}),env);
  assert.equal(put.status,200);
  assert.equal(env.__state.has('pending:dak-gesundheit'),false);
  assert.equal(env.__alarmState.scheduled,null);
});

test('projection alarm repairs only records marked pending', async()=>{
  const env=makeEnv();
  const unrelated={...structuredClone(valid),insurerId:'other'};
  env.__state.set('state:other',{record:unrelated,version:'1'});
  env.__state.set('pending:dak-gesundheit',true);
  env.__state.set('state:dak-gesundheit',{record:structuredClone(valid),version:'1'});
  let writes=[]; const original=env.ADDRESS_KV.put; env.ADDRESS_KV.put=async(key,value)=>{writes.push(key); return original(key,value)};
  await env.__coordinator.alarm();
  assert.deepEqual(writes,['address:v1:dak-gesundheit']);
  assert.equal(env.__state.has('pending:dak-gesundheit'),false);
  assert.equal(env.__alarmState.scheduled,null);
});

test('admin route reports missing client IP as CLIENT_IP_MISSING instead of rate limited', async()=>{
  const env=makeEnv(); let calls=0; env.ADMIN_RATE_LIMITER.limit=async()=>{calls++;return {success:true}};
  const res=await worker.fetch(new Request('https://worker.test/api/admin/audit',{headers:{authorization:'Bearer secret'}}),env);
  const data=await res.json(); assert.equal(res.status,400); assert.equal(data.code,'CLIENT_IP_MISSING'); assert.equal(calls,0);
});

test('public address GET does not expose a potentially stale KV ETag', async()=>{
  const env=makeEnv({'address:v1:dak-gesundheit':JSON.stringify({...valid,version:9})});
  const res=await worker.fetch(new Request('https://worker.test/api/addresses/dak-gesundheit'),env);
  assert.equal(res.status,200); assert.equal(res.headers.get('etag'),null);
});


test('missing client IP is bypassed only on loopback development config', async()=>{
  const env=makeEnv(); env.DEPLOY_ENV='development'; env.LOCAL_DEV_ALLOW_MISSING_IP='true';
  const res=await worker.fetch(new Request('http://localhost/api/admin/audit',{headers:{authorization:'Bearer secret'}}),env);
  assert.notEqual(res.status,400); assert.notEqual((await res.json()).code,'CLIENT_IP_MISSING');
});

test('missing client IP bypass is not available in staging or production', async()=>{
  for (const deployEnv of ['staging','production']) {
    const env=makeEnv(); env.DEPLOY_ENV=deployEnv; env.LOCAL_DEV_ALLOW_MISSING_IP='true';
    const res=await worker.fetch(new Request('http://localhost/api/admin/audit',{headers:{authorization:'Bearer secret'}}),env);
    assert.equal(res.status,400); assert.equal((await res.json()).code,'CLIENT_IP_MISSING');
  }
});

test('missing client IP bypass supports bracketed IPv6 loopback hostname', async()=>{
  const env=makeEnv(); env.DEPLOY_ENV='development'; env.LOCAL_DEV_ALLOW_MISSING_IP='true';
  const res=await worker.fetch(new Request('http://[::1]:8787/api/admin/audit',{headers:{authorization:'Bearer secret'}}),env);
  assert.notEqual(res.status,400);
  assert.notEqual((await res.json()).code,'CLIENT_IP_MISSING');
});


test('Widerspruch API responses always include the Bescheid notice', async () => {
  const env = makeEnv();
  const body = structuredClone(valid);
  const put = await worker.fetch(new Request(
    'https://worker.test/api/admin/addresses/dak-gesundheit',
    {
      method: 'PUT',
      headers: {
        'cf-connecting-ip': '127.0.0.1',
        authorization: 'Bearer secret',
        'content-type': 'application/json',
        'if-match': '0',
      },
      body: JSON.stringify(body),
    },
  ), env);
  assert.equal(put.status, 200);

  const resolved = await worker.fetch(new Request(
    'https://worker.test/api/resolve?insurerId=dak-gesundheit&purpose=widerspruch',
  ), env);
  const resolvedData = await resolved.json();
  assert.equal(resolvedData.notice, 'check_bescheid_rechtsbehelfsbelehrung');

  const category = await worker.fetch(new Request(
    'https://worker.test/api/addresses/dak-gesundheit/widerspruch',
  ), env);
  const categoryData = await category.json();
  assert.equal(categoryData.record.notice, 'check_bescheid_rechtsbehelfsbelehrung');

  const full = await worker.fetch(new Request(
    'https://worker.test/api/addresses/dak-gesundheit',
  ), env);
  const fullData = await full.json();
  assert.equal(
    fullData.record.categories.widerspruch.notice,
    'check_bescheid_rechtsbehelfsbelehrung',
  );
  assert.equal(fullData.record.categories.general.notice, null);
});
