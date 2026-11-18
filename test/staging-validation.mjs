import { validateRecord, mailingAllowed, withMailingPolicy } from '../src/index.js';
import fs from 'node:fs';
const staging=JSON.parse(fs.readFileSync(new URL('../data/research-staging.json', import.meta.url),'utf8'));
const register=JSON.parse(fs.readFileSync(new URL('../data/research-register.json', import.meta.url),'utf8'));
const ids=new Set(register.records.map(x=>x.insurerId));
const failures=[];
for (const record of staging.records) { const errors=validateRecord(record,ids); if(errors.length) failures.push({insurerId:record.insurerId,errors}); }
const summary={catalog:ids.size,staging:staging.records.length,failures:failures.length,effectiveUsableForMailing:staging.records.reduce((n,r)=>n+Object.values(r.categories).filter(x=>mailingAllowed(x)).length,0),undatedSources:staging.records.reduce((n,r)=>n+Object.values(r.categories).filter(x=>!x.sourceVerifiedAt).length,0),configuredOfficialUrls:staging.records.reduce((n,r)=>n+Object.values(r.categories).filter(x=>typeof x.officialUrl==='string' && x.officialUrl.startsWith('https://')).length,0),effectiveOfficialLinks:staging.records.reduce((n,r)=>n+Object.values(r.categories).filter(x=>{const p=withMailingPolicy(x,r.documentGenerationNotice?.officialUrl);return !p.usableForMailing && Boolean(p.officialUrl)}).length,0),manualCheck:staging.records.reduce((n,r)=>n+Object.values(r.categories).filter(x=>{const p=withMailingPolicy(x,r.documentGenerationNotice?.officialUrl);return !p.usableForMailing && !p.officialUrl}).length,0),details:failures};
console.log(JSON.stringify(summary,null,2)); if(failures.length) process.exit(1);
