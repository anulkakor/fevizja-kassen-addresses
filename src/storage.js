import { CATEGORIES, MAX_RECORDS, RECORD_PREFIX, HISTORY_PREFIX } from "./constants.js";
let catalogCache = { expiresAt: 0, value: null };
function resetCatalogCache() { catalogCache = { expiresAt: 0, value: null }; }
async function loadCatalog(env) {
  if (catalogCache.value && catalogCache.expiresAt > Date.now()) return catalogCache.value;
  if (!env.KASSEN_API) throw new Error("KASSEN_API service binding is missing");
  const res = await env.KASSEN_API.fetch(new Request("https://fevizja-kassen-api.internal/api/kassen", { headers: { accept: "application/json" } }));
  if (!res.ok) throw new Error(`Worker 1 returned HTTP ${res.status}`);
  const data = await res.json(); const list = Array.isArray(data.kassen) ? data.kassen : Array.isArray(data.insurers) ? data.insurers : [];
  if (!list.length) throw new Error("Worker 1 returned no insurer catalog");
  const value = new Map(list.filter(x => x?.id).map(x => [x.id, x])); catalogCache = { value, expiresAt: Date.now() + 60000 }; return value;
}
async function bulkGetJson(namespace, keys) {
  const result = new Map();
  for (let i = 0; i < keys.length; i += 100) { const values = await namespace.get(keys.slice(i, i + 100), "json"); for (const [key, value] of values) result.set(key, value); }
  return result;
}
async function listAll(namespace, prefix, limit = 1000) {
  const all = []; let cursor;
  do {
    const page = await namespace.list({ prefix, limit: Math.min(limit, 1000), ...(cursor ? { cursor } : {}) });
    all.push(...page.keys); if (all.length > MAX_RECORDS) throw new Error("KV listing exceeds safety limit");
    if (page.list_complete) break;
    if (!page.cursor || page.cursor === cursor) throw new Error("KV pagination returned an invalid cursor");
    cursor = page.cursor;
  } while (true);
  return all;
}
function historyPrefixFor(id) { return `${HISTORY_PREFIX}${id}:`; }
async function purgeAddressCache(request, insurerId) {
  // Public address responses are no-store; cache purge is retained for legacy cached variants.
  const cache = globalThis.caches?.default; if (!cache?.delete) return { supported: false, deleted: 0 };
  const origin = request.headers.get("origin"); const paths = ["/api/addresses", `/api/addresses/${encodeURIComponent(insurerId)}`];
  for (const category of CATEGORIES) {
    const encodedId = encodeURIComponent(insurerId);
    paths.push(`/api/addresses/${encodedId}/${category}`);
    paths.push(`/api/resolve?insurerId=${encodedId}&purpose=${category}`);
  }
  let deleted = 0;
  for (const path of paths) for (const query of ["", "?v=1"]) {
    try { const headers = origin ? { origin } : {}; if (await cache.delete(new Request(new URL(path + query, request.url).toString(), { headers }))) deleted++; } catch { /* cache unavailable */ }
  }
  return { supported: true, deleted };
}
function currentVersion(record) { return record?.version ? String(record.version) : record?.updatedAt || "0"; }

export { loadCatalog, resetCatalogCache, bulkGetJson, listAll, historyPrefixFor, purgeAddressCache, currentVersion };
