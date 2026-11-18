#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const valueArg = (name) => rawArgs.find((x) => x.startsWith(`${name}=`))?.slice(name.length + 1) || null;
const targetEnv = valueArg("--env");
if (!targetEnv || !["staging", "production"].includes(targetEnv)) {
  throw new Error("Explicit target required: --env=staging or --env=production");
}
const dryRun = args.has("--dry-run");
const onlyNew = args.has("--only-new");
const updateExisting = args.has("--update-existing");
if (onlyNew && updateExisting) throw new Error("--only-new and --update-existing cannot be used together");
const limitArg = valueArg("--limit");
const limit = limitArg ? Number(limitArg) : Infinity;
if (!(limit > 0)) throw new Error("--limit must be a positive number");
if (targetEnv === "production" && !dryRun && !args.has("--confirm-production")) {
  throw new Error("Production import requires --confirm-production");
}

const stagingPath = path.join(root, "data", "research-staging.json");
const staging = JSON.parse(await fs.readFile(stagingPath, "utf8"));
if (!Array.isArray(staging.records)) throw new Error("research-staging.json has no records array");
const records = staging.records.slice(0, limit);
const baseUrl = (process.env.FEVIZJA_ADDRESSES_API_URL || "").replace(/\/$/, "");
const token = process.env.ADDRESS_ADMIN_TOKEN || "";

function normalizeBase(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Allowed API URLs must be HTTPS URLs without credentials, query, or fragment");
  }
  return url.toString().replace(/\/$/, "");
}
function allowedUrlsFor(env) {
  const key = env === "staging" ? "FEVIZJA_STAGING_ALLOWED_URLS" : "FEVIZJA_PRODUCTION_ALLOWED_URLS";
  return String(process.env[key] || "").split(";").map((x) => x.trim()).filter(Boolean).map(normalizeBase);
}
if (!dryRun) {
  if (!baseUrl || !token) throw new Error("Set FEVIZJA_ADDRESSES_API_URL and ADDRESS_ADMIN_TOKEN for a real import");
  const normalizedTarget = normalizeBase(baseUrl);
  const allowed = allowedUrlsFor(targetEnv);
  if (!allowed.length) throw new Error(`Configure ${targetEnv === "staging" ? "FEVIZJA_STAGING_ALLOWED_URLS" : "FEVIZJA_PRODUCTION_ALLOWED_URLS"} with exact allowed HTTPS API URLs`);
  if (!allowed.includes(normalizedTarget)) throw new Error(`Target URL is not in the explicit ${targetEnv} allowlist`);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).filter((key) => key !== "usableForMailing").sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function businessPayload(source) {
  return stable({
    insurerId: source.insurerId,
    insurerName: source.insurerName,
    categories: source.categories,
    documentGenerationNotice: source.documentGenerationNotice,
  });
}
function sameBusinessData(existing, incoming) {
  if (!existing) return false;
  return JSON.stringify(businessPayload(existing)) === JSON.stringify(businessPayload(incoming));
}

// Cloudflare's configured limit is 30 requests/minute per IP. Stay below it.
let lastAdminRequestAt = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function adminFetch(url, options) {
  const minimumGapMs = 2100;
  const waitMs = Math.max(0, minimumGapMs - (Date.now() - lastAdminRequestAt));
  if (waitMs) await sleep(waitMs);
  let response = await fetch(url, options);
  lastAdminRequestAt = Date.now();
  if (response.status === 429) {
    await sleep(65000);
    response = await fetch(url, options);
    lastAdminRequestAt = Date.now();
  }
  return response;
}

let inserted = 0;
let updated = 0;
let unchanged = 0;
let skippedOnlyNew = 0;
let conflictsToReview = 0;
let pendingProjection = 0;
for (const [index, source] of records.entries()) {
  if (!source?.insurerId || !source?.categories || !source?.documentGenerationNotice) {
    throw new Error(`Invalid staging record at index ${index}`);
  }
  const payload = businessPayload(source);
  if (dryRun) {
    process.stdout.write(`${index + 1}/${records.length} ${payload.insurerId} READY\n`);
    continue;
  }

  const headers = { authorization: `Bearer ${token}`, accept: "application/json" };
  const encodedId = encodeURIComponent(payload.insurerId);
  const current = await adminFetch(`${baseUrl}/api/admin/addresses/${encodedId}`, { headers });
  let expectedVersion = "0";
  let existing = null;
  if (current.ok) {
    const etag = current.headers.get("etag");
    if (!etag) throw new Error(`Missing canonical admin ETag for existing ${payload.insurerId}`);
    expectedVersion = etag.replace(/^W\//, "").replace(/^"|"$/g, "");
    const data = await current.json();
    existing = data.record;
    if (sameBusinessData(existing, payload)) {
      unchanged++;
      process.stdout.write(`${index + 1}/${records.length} ${payload.insurerId} SKIP_IDENTICAL\n`);
      continue;
    }
    if (onlyNew) {
      skippedOnlyNew++;
      process.stdout.write(`${index + 1}/${records.length} ${payload.insurerId} SKIP_EXISTS (--only-new)\n`);
      continue;
    }
    if (!updateExisting) {
      conflictsToReview++;
      process.stderr.write(`${index + 1}/${records.length} ${payload.insurerId} SKIP_DIFFERS: preserved existing/admin-edited record; manual review required before --update-existing\n`);
      continue;
    }
  } else if (current.status !== 404) {
    throw new Error(`Admin GET failed for ${payload.insurerId}: HTTP ${current.status} ${await current.text()}`);
  }

  const response = await adminFetch(`${baseUrl}/api/admin/addresses/${encodedId}`, {
    method: "PUT",
    headers: { ...headers, "content-type": "application/json", "if-match": expectedVersion },
    body: JSON.stringify(payload),
  });
  const bodyText = await response.text();
  if (!response.ok) throw new Error(`Import failed for ${payload.insurerId}: HTTP ${response.status} ${bodyText}`);
  const result = bodyText ? JSON.parse(bodyText) : {};
  if (response.status === 202 || result.projectionStatus === "pending") {
    pendingProjection++;
    process.stderr.write(`WARNING ${payload.insurerId}: DO committed, KV projection is PENDING; verify /api/health and projection repair before relying on public GET\n`);
  }
  if (existing) updated++; else inserted++;
  process.stdout.write(`${index + 1}/${records.length} ${payload.insurerId} ${existing ? "UPDATED" : "INSERTED"} HTTP ${response.status}\n`);
}

if (dryRun) {
  process.stdout.write(`DRY RUN (${targetEnv}): ${records.length} records inspected; no network requests or writes performed.\n`);
} else {
  process.stdout.write(`Import (${targetEnv}) finished: inserted=${inserted}, updated=${updated}, identical=${unchanged}, skippedOnlyNew=${skippedOnlyNew}, conflictsToReview=${conflictsToReview}, pendingProjection=${pendingProjection}.\n`);
  // Exit status is a bitmask so simultaneous conditions are never hidden:
  // 2 = KV projection pending, 4 = existing-record conflicts need review.
  let exitStatus = 0;
  if (pendingProjection) {
    process.stderr.write(`PROJECTION_PENDING: ${pendingProjection} records were committed to Durable Object but their KV projection is pending.\n`);
    exitStatus |= 2;
  }
  if (conflictsToReview) {
    process.stderr.write(`IMPORT_REVIEW_REQUIRED: ${conflictsToReview} existing records differ from staging and were preserved. Review them individually; no automatic overwrite was performed.\n`);
    exitStatus |= 4;
  }
  if (exitStatus) process.exitCode = exitStatus;
}
