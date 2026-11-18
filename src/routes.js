import {
  CATEGORIES,
  RECORD_PREFIX,
  MAX_HISTORY_ITEMS,
  MAX_BODY_BYTES,
} from "./constants.js";
import { json, clean } from "./utils.js";
import {
  withMailingPolicy,
  publicRecord,
  getIntegrityErrors,
  sourceIsFresh,
  noticeForCategory,
} from "./policy.js";
import { validateRecord } from "./validation.js";
import { authorized, rateLimit } from "./auth.js";
import {
  loadCatalog,
  bulkGetJson,
  listAll,
  historyPrefixFor,
  purgeAddressCache,
  resetCatalogCache,
} from "./storage.js";
import { FeVizjaUpdateCoordinator } from "./coordinator.js";

function cors(request, env) {
  const origin = request.headers.get("origin");
  const vary = "Origin, Access-Control-Request-Headers";
  if (!origin) return { vary };

  const allowed = String(env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowed.includes(origin)) return null;

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, PUT, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, If-Match",
    vary,
  };
}

async function readJsonLimited(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) {
    return { error: "Request body too large", status: 413 };
  }

  const reader = request.body?.getReader();
  if (!reader) return { error: "Request body is empty", status: 400 };

  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { error: "Request body too large", status: 413 };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: "Invalid JSON", status: 400 };
  }
}

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function parseIfMatch(value) {
  if (!value) return null;
  const raw = value.trim().replace(/^W\//, "").replace(/^"|"$/g, "");
  return raw || null;
}

function coordinatorStub(env) {
  const id = env.UPDATE_COORDINATOR.idFromName("global-address-writes");
  return env.UPDATE_COORDINATOR.get(id);
}

async function handleAdminRead(idValue, env, headers) {
  const id = decodeSegment(idValue);
  if (!id) {
    return json(
      { success: false, error: "Malformed URL-encoded insurerId" },
      400,
      headers,
    );
  }
  if (!env.UPDATE_COORDINATOR) {
    return json(
      {
        success: false,
        error: "Update coordinator is not configured",
        code: "UPDATE_COORDINATOR_NOT_CONFIGURED",
      },
      503,
      headers,
    );
  }

  const result = await coordinatorStub(env).fetch(
    "https://coordinator.internal/read",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "read", insurerId: id }),
    },
  );

  const responseHeaders = {
    ...headers,
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  const etag = result.headers.get("etag");
  if (etag) responseHeaders.etag = etag;

  return new Response(await result.text(), {
    status: result.status,
    headers: responseHeaders,
  });
}

async function handleAudit(env, headers) {
  let catalog;
  try {
    catalog = await loadCatalog(env);
  } catch (error) {
    return json(
      {
        success: false,
        error: "Worker 1 catalog unavailable",
        code: "WORKER1_CATALOG_UNAVAILABLE",
        details: clean(error?.message),
      },
      503,
      headers,
    );
  }

  const listed = await listAll(env.ADDRESS_KV, RECORD_PREFIX);
  const values = await bulkGetJson(
    env.ADDRESS_KV,
    listed.map((key) => key.name),
  );
  const stored = new Map();
  const incompleteRecords = [];
  const staleSources = [];
  const invalidSources = [];
  const undatedSources = [];
  const duplicateStoredIds = [];
  const seen = new Set();

  for (const key of listed) {
    const record = values.get(key.name);
    if (!record) continue;

    if (record.insurerId) {
      if (seen.has(record.insurerId)) duplicateStoredIds.push(record.insurerId);
      seen.add(record.insurerId);
      stored.set(record.insurerId, record);
    }

    const errors = validateRecord(record, new Set(catalog.keys()));
    if (errors.length) {
      incompleteRecords.push({
        insurerId: record.insurerId || null,
        errors,
        integrityErrors: getIntegrityErrors(record),
      });
    }

    for (const category of CATEGORIES) {
      const item = record.categories?.[category];
      if (!item?.sourceUrl) continue;

      try {
        const source = new URL(item.sourceUrl);
        if (source.protocol !== "https:") throw new Error("https_required");
      } catch {
        invalidSources.push({
          insurerId: record.insurerId,
          category,
          sourceUrl: item.sourceUrl,
        });
      }

      if (!item.sourceVerifiedAt) {
        undatedSources.push({
          insurerId: record.insurerId,
          category,
          checkedAt: item.checkedAt || null,
          reason: "checkedAt_is_record_processing_date_not_source_verification_date",
        });
      } else if (!sourceIsFresh(item)) {
        staleSources.push({
          insurerId: record.insurerId,
          category,
          sourceVerifiedAt: item.sourceVerifiedAt,
        });
      }
    }
  }

  const missingIds = [...catalog.keys()].filter((id) => !stored.has(id));
  const unknownIds = [...stored.keys()].filter((id) => !catalog.has(id));

  return json(
    {
      success: true,
      auditedAt: new Date().toISOString(),
      catalogCount: catalog.size,
      storedRecordCount: stored.size,
      summary: {
        missing: missingIds.length,
        unknown: unknownIds.length,
        incomplete: incompleteRecords.length,
        staleSources: staleSources.length,
        undatedSources: undatedSources.length,
        invalidSources: invalidSources.length,
        duplicateStoredIds: duplicateStoredIds.length,
      },
      missingIds,
      unknownIds,
      incompleteRecords,
      staleSources,
      undatedSources,
      invalidSources,
      duplicateStoredIds,
    },
    200,
    headers,
  );
}

async function handlePut(request, path, env, headers) {
  const contentType = request.headers.get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return json(
      { success: false, error: "Content-Type must be application/json" },
      415,
      headers,
    );
  }

  const expectedVersion = parseIfMatch(request.headers.get("if-match"));
  if (expectedVersion === null) {
    return json(
      {
        success: false,
        error: "If-Match is required; use 0 for a new record",
        code: "PRECONDITION_REQUIRED",
      },
      428,
      headers,
    );
  }
  if (!env.UPDATE_COORDINATOR) {
    return json(
      {
        success: false,
        error: "Update coordinator is not configured",
        code: "UPDATE_COORDINATOR_NOT_CONFIGURED",
      },
      503,
      headers,
    );
  }

  const parsed = await readJsonLimited(request);
  if (parsed.error) return json({ success: false, error: parsed.error }, parsed.status, headers);

  let catalog;
  try {
    catalog = await loadCatalog(env);
  } catch (error) {
    return json(
      {
        success: false,
        error: "Worker 1 catalog unavailable",
        code: "WORKER1_CATALOG_UNAVAILABLE",
        details: clean(error?.message),
      },
      503,
      headers,
    );
  }

  const urlId = decodeSegment(path.slice("/api/admin/addresses/".length));
  if (!urlId) {
    return json(
      { success: false, error: "Malformed URL-encoded insurerId" },
      400,
      headers,
    );
  }
  if (parsed.body?.insurerId !== urlId) {
    return json(
      { success: false, error: "URL insurerId must match body insurerId" },
      400,
      headers,
    );
  }

  const errors = validateRecord(parsed.body, new Set(catalog.keys()));
  if (errors.length) {
    return json(
      { success: false, error: "Validation failed", validationErrors: errors },
      422,
      headers,
    );
  }

  const insurer = catalog.get(parsed.body.insurerId);
  const categories = Object.fromEntries(
    CATEGORIES.map((category) => {
      const { usableForMailing, ...item } = parsed.body.categories[category];
      return [category, item];
    }),
  );
  const record = {
    schemaVersion: 3,
    insurerId: parsed.body.insurerId,
    insurerName: insurer.name,
    categories,
    documentGenerationNotice: parsed.body.documentGenerationNotice,
    updatedAt: new Date().toISOString(),
    updatedBy: clean(env.ADDRESS_ADMIN_ID) || "admin-token",
  };

  const result = await coordinatorStub(env).fetch(
    "https://coordinator.internal/write",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "write",
        insurerId: parsed.body.insurerId,
        expectedVersion,
        record,
      }),
    },
  );

  if (result.status === 409) {
    const conflictHeaders = {
      ...headers,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    };
    const etag = result.headers.get("etag");
    if (etag) conflictHeaders.etag = etag;
    return new Response(await result.text(), {
      status: 409,
      headers: conflictHeaders,
    });
  }
  if (!result.ok) {
    return json(
      {
        success: false,
        error: "Coordinated write failed",
        code: "COORDINATED_WRITE_FAILED",
      },
      502,
      headers,
    );
  }

  const resultData = await result.json();
  const cachePurge = await purgeAddressCache(request, parsed.body.insurerId);
  const responseHeaders = { ...headers };
  const etag = result.headers.get("etag");
  if (etag) responseHeaders.etag = etag;

  return json({ ...resultData, cachePurge }, result.status, responseHeaders);
}

async function handleAddressesList(env, headers) {
  const listed = await listAll(env.ADDRESS_KV, RECORD_PREFIX);
  const values = await bulkGetJson(
    env.ADDRESS_KV,
    listed.map((key) => key.name),
  );
  const records = [...values.values()].filter(Boolean).map(publicRecord);
  const integrityErrorCount = records.reduce(
    (count, record) => count + record.integrityErrors.length,
    0,
  );

  return json(
    { success: true, count: records.length, integrityErrorCount, records },
    200,
    headers,
  );
}

async function handleHistory(idValue, env, headers) {
  const id = decodeSegment(idValue);
  if (!id) {
    return json(
      { success: false, error: "Malformed URL-encoded insurerId" },
      400,
      headers,
    );
  }

  const keys = await listAll(env.ADDRESS_HISTORY_KV, historyPrefixFor(id));
  const values = await bulkGetJson(
    env.ADDRESS_HISTORY_KV,
    keys.map((key) => key.name),
  );
  const legacy = await env.ADDRESS_HISTORY_KV.get(`history:v1:${id}`, "json");
  const history = [
    ...(Array.isArray(legacy) ? legacy : []),
    ...values.values(),
  ]
    .filter(Boolean)
    .sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)))
    .slice(-MAX_HISTORY_ITEMS);

  return json({ success: true, insurerId: id, history }, 200, headers);
}

async function handleAddressRead(idValue, category, env, headers) {
  const id = decodeSegment(idValue);
  if (!id) {
    return json(
      { success: false, error: "Malformed URL-encoded insurerId" },
      400,
      headers,
    );
  }
  if (category && !CATEGORIES.includes(category)) {
    return json(
      { success: false, error: "Unknown category", allowed: CATEGORIES },
      400,
      headers,
    );
  }

  const record = await env.ADDRESS_KV.get(RECORD_PREFIX + id, "json");
  if (!record) {
    return json(
      { success: false, error: "Address record not found", insurerId: id },
      404,
      headers,
    );
  }
  if (category && !record.categories?.[category]) {
    return json(
      {
        success: false,
        error: "Category missing in stored record",
        insurerId: id,
        category,
      },
      404,
      headers,
    );
  }

  const responseRecord = category
    ? {
        insurerId: id,
        insurerName: record.insurerName,
        category,
        ...withMailingPolicy(
          record.categories[category],
          record.documentGenerationNotice?.officialUrl,
        ),
        notice: noticeForCategory(category),
        documentGenerationNotice: record.documentGenerationNotice || null,
      }
    : publicRecord(record);

  return json({ success: true, record: responseRecord }, 200, headers);
}

async function handleResolve(url, env, headers) {
  const id = clean(url.searchParams.get("insurerId"));
  const purpose = clean(url.searchParams.get("purpose"));
  if (!id) return json({ success: false, error: "insurerId is required" }, 400, headers);
  if (!CATEGORIES.includes(purpose)) {
    return json(
      { success: false, error: "Valid purpose is required", allowed: CATEGORIES },
      400,
      headers,
    );
  }

  const record = await env.ADDRESS_KV.get(RECORD_PREFIX + id, "json");
  if (!record) {
    return json(
      { success: false, error: "Address record not found", insurerId: id },
      404,
      headers,
    );
  }
  const item = record.categories?.[purpose];
  if (!item) {
    return json(
      {
        success: false,
        error: "Category missing in stored record",
        insurerId: id,
        category: purpose,
      },
      404,
      headers,
    );
  }

  return json(
    {
      success: true,
      insurerId: id,
      insurerName: record.insurerName,
      purpose,
      ...withMailingPolicy(item, record.documentGenerationNotice?.officialUrl),
      notice: noticeForCategory(purpose),
      documentGenerationNotice: record.documentGenerationNotice || null,
    },
    200,
    headers,
  );
}

export default {
  async fetch(request, env) {
    let responseCors = {};
    try {
      const headers = cors(request, env);
      responseCors = headers || {};
      if (request.headers.has("origin") && headers === null) {
        return json({ success: false, error: "Origin not allowed" }, 403);
      }
      if (request.method === "OPTIONS") {
        if (!headers) {
          return json(
            { success: false, error: "Preflight origin required and allowed" },
            403,
          );
        }
        return new Response(null, {
          status: 204,
          headers: { ...headers, "access-control-max-age": "600" },
        });
      }
      if (!env.ADDRESS_KV || !env.ADDRESS_HISTORY_KV) {
        return json(
          { success: false, error: "KV bindings are not configured" },
          503,
          headers || {},
        );
      }

      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const protectedRoute =
        path.startsWith("/api/admin/") || path.startsWith("/api/history/");

      if (protectedRoute) {
        let limitResult;
        try {
          limitResult = await rateLimit(request, env);
        } catch {
          return json(
            {
              success: false,
              error: "Rate limiter unavailable",
              code: "RATE_LIMITER_UNAVAILABLE",
            },
            503,
            headers || {},
          );
        }
        if (!limitResult.allowed) {
          const missingIp = limitResult.reason === "CLIENT_IP_MISSING";
          const notConfigured = limitResult.reason === "RATE_LIMITER_NOT_CONFIGURED";
          const error = missingIp
            ? "Cloudflare client IP header is missing; check local Wrangler request headers"
            : notConfigured
              ? "Rate limiter is not configured"
              : "Too many requests";
          const status = missingIp ? 400 : notConfigured ? 503 : 429;
          return json(
            { success: false, error, code: limitResult.reason },
            status,
            headers || {},
          );
        }
        if (!(await authorized(request, env))) {
          return json({ success: false, error: "Unauthorized" }, 401, headers || {});
        }
      }

      if (path === "/api/health" && request.method === "GET") {
        return json(
          {
            success: true,
            worker: "fevizja-kassen-addresses",
            schemaVersion: 3,
            serviceBindingConfigured: Boolean(env.KASSEN_API),
            rateLimiterConfigured: Boolean(env.ADMIN_RATE_LIMITER),
            updateCoordinatorConfigured: Boolean(env.UPDATE_COORDINATOR),
            timestamp: new Date().toISOString(),
          },
          200,
          headers || {},
        );
      }

      if (request.method === "GET" && path === "/api/addresses") {
        return await handleAddressesList(env, headers || {});
      }

      const historyMatch = path.match(/^\/api\/history\/([^/]+)$/);
      if (request.method === "GET" && historyMatch) {
        return await handleHistory(historyMatch[1], env, headers || {});
      }

      const adminAddressMatch = path.match(/^\/api\/admin\/addresses\/([^/]+)$/);
      if (request.method === "GET" && adminAddressMatch) {
        return await handleAdminRead(adminAddressMatch[1], env, headers || {});
      }

      const categoryMatch = path.match(/^\/api\/addresses\/([^/]+)(?:\/([^/]+))?$/);
      if (request.method === "GET" && categoryMatch) {
        return await handleAddressRead(
          categoryMatch[1],
          categoryMatch[2],
          env,
          headers || {},
        );
      }

      if (request.method === "GET" && path === "/api/resolve") {
        return await handleResolve(url, env, headers || {});
      }

      if (request.method === "GET" && path === "/api/admin/audit") {
        return await handleAudit(env, headers || {});
      }

      if (request.method === "PUT" && path.startsWith("/api/admin/addresses/")) {
        return await handlePut(request, path, env, headers || {});
      }

      return json(
        {
          success: false,
          error: "Not found",
          endpoints: [
            "GET /api/health",
            "GET /api/addresses",
            "GET /api/addresses/:insurerId",
            "GET /api/addresses/:insurerId/:category",
            "GET /api/resolve?insurerId=&purpose=",
            "GET /api/history/:insurerId (admin)",
            "GET /api/admin/audit (admin)",
            "GET /api/admin/addresses/:insurerId (raw record, admin)",
            "PUT /api/admin/addresses/:insurerId (admin)",
          ],
        },
        404,
        headers || {},
      );
    } catch (error) {
      const status = error instanceof URIError ? 400 : 500;
      return json(
        {
          success: false,
          error: status === 400 ? "Malformed URL encoding" : "Internal worker error",
          code: status === 400 ? "MALFORMED_URL" : "INTERNAL_ERROR",
        },
        status,
        responseCors,
      );
    }
  },
};

export { resetCatalogCache, FeVizjaUpdateCoordinator };
